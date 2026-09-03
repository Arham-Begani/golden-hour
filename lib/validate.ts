import {
  CONFIDENCE_FLOOR,
  FRAUD_CATEGORIES,
  PAYMENT_RAILS,
  UNREADABLE,
  type Extraction,
  type ReadField,
} from "./schema";

/**
 * The layer that makes UNREADABLE structural rather than aspirational.
 *
 * Telling a model "say UNREADABLE if you can't read it" is a request, not a
 * guarantee. This enforces it server-side: anything whose *shape* is wrong for
 * the field it claims to be, or that the model itself wasn't confident about,
 * is downgraded — regardless of how plausible it looks.
 *
 * Crucially a downgrade produces UNREADABLE, never "". An empty string
 * silently passes every downstream check; UNREADABLE is loud on purpose.
 */

export type DowngradeReason = "empty" | "low_confidence" | "wrong_shape";

export type Downgrade = {
  field: string;
  /** What the model actually said, kept so the receipt can show its work. */
  original: string;
  confidence: number;
  reason: DowngradeReason;
};

export type ValidationResult = {
  extraction: Extraction;
  downgrades: Downgrade[];
};

/* -------------------------------------------------------------------------- */
/* Shape checks                                                               */
/* -------------------------------------------------------------------------- */

/** UPI and IMPS references are 12 digits. NEFT/RTGS UTRs are bank-prefixed. */
const UTR_NUMERIC = /^\d{12}$/;
const UTR_BANK_PREFIXED = /^[A-Z]{4}[A-Z0-9]{8,18}$/;

const VPA = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,255})@[a-zA-Z][a-zA-Z0-9]{1,63}$/;
const ACCOUNT_NUMBER = /^\d{9,18}$/;
const INDIAN_MOBILE = /^(?:\+?91[-\s]?)?[6-9]\d{9}$/;

/** Reference numbers are long enough that a short token is almost never one. */
const GENERIC_REF = /^[A-Za-z0-9][A-Za-z0-9._/-]{5,39}$/;

const LAST4 = /^\d{4}$/;

/** Two years. Older than this and the timestamp is more likely a misread. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365 * 2;
/** Tolerate a little device clock skew before calling a timestamp impossible. */
const FUTURE_SKEW_MS = 1000 * 60 * 5;

const digitsOnly = (s: string) => s.replace(/[^\d]/g, "");

type Checker = {
  /** Tidy the raw value before checking it. Never invents characters. */
  normalise?: (raw: string) => string;
  /** True if the value is shaped like this kind of field. */
  shape?: (value: string) => boolean;
};

const CHECKERS: Record<string, Checker> = {
  amount: {
    normalise: (raw) => raw.replace(/[₹,\s]/g, "").replace(/^(?:INR|Rs\.?)/i, ""),
    shape: (v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 && n < 1e11;
    },
  },
  currency: {
    normalise: (raw) => raw.trim().toUpperCase(),
    shape: (v) => /^[A-Z]{3}$/.test(v),
  },
  utr_or_upi_ref: {
    normalise: (raw) => raw.replace(/[\s-]/g, "").toUpperCase(),
    shape: (v) => UTR_NUMERIC.test(v) || UTR_BANK_PREFIXED.test(v),
  },
  transaction_ref: {
    normalise: (raw) => raw.replace(/\s/g, "").toUpperCase(),
    shape: (v) => GENERIC_REF.test(v),
  },
  beneficiary_handle: {
    normalise: (raw) => raw.trim().replace(/\s/g, ""),
    shape: (v) =>
      VPA.test(v) || ACCOUNT_NUMBER.test(v) || INDIAN_MOBILE.test(digitsOnly(v) || v),
  },
  source_account_last4: {
    normalise: (raw) => digitsOnly(raw).slice(-4),
    shape: (v) => LAST4.test(v),
  },
  occurred_at: {
    normalise: (raw) => raw.trim(),
    shape: (v) => {
      const t = Date.parse(v);
      if (Number.isNaN(t)) return false;
      const now = Date.now();
      return t <= now + FUTURE_SKEW_MS && t >= now - MAX_AGE_MS;
    },
  },
  beneficiary_name: {
    normalise: (raw) => raw.trim().replace(/\s+/g, " "),
    shape: (v) => v.length >= 2 && v.length <= 120,
  },
  victim_bank: {
    normalise: (raw) => raw.trim().replace(/\s+/g, " "),
    shape: (v) => v.length >= 2 && v.length <= 120,
  },
};

/* -------------------------------------------------------------------------- */
/* Field validation                                                           */
/* -------------------------------------------------------------------------- */

const unreadable = (confidence: number): ReadField => ({
  value: UNREADABLE,
  confidence,
});

function validateField(
  key: string,
  field: ReadField | undefined,
  downgrades: Downgrade[],
): ReadField {
  const raw = (field?.value ?? "").trim();
  const confidence = typeof field?.confidence === "number" ? field.confidence : 0;

  // The model already told us it couldn't read this. Believe it.
  if (raw === UNREADABLE) return unreadable(confidence);

  if (raw === "") {
    downgrades.push({ field: key, original: raw, confidence, reason: "empty" });
    return unreadable(confidence);
  }

  const checker = CHECKERS[key];
  const value = checker?.normalise ? checker.normalise(raw) : raw;

  // A wrong reference number sends the bank after the wrong account while the
  // real one empties. Shape is checked before confidence for exactly that
  // reason: a confidently-wrong value is the dangerous case.
  if (checker?.shape && !checker.shape(value)) {
    downgrades.push({ field: key, original: raw, confidence, reason: "wrong_shape" });
    return unreadable(confidence);
  }

  if (confidence < CONFIDENCE_FLOOR) {
    downgrades.push({ field: key, original: value, confidence, reason: "low_confidence" });
    return unreadable(confidence);
  }

  return { value, confidence };
}

function validateEnumField(
  key: string,
  field: { value?: string; confidence?: number } | undefined,
  allowed: readonly string[],
  fallback: string,
  downgrades: Downgrade[],
) {
  const raw = (field?.value ?? "").trim().toUpperCase();
  const confidence = typeof field?.confidence === "number" ? field.confidence : 0;

  if (!allowed.includes(raw)) {
    if (raw !== "") {
      downgrades.push({ field: key, original: raw, confidence, reason: "wrong_shape" });
    }
    return { value: fallback, confidence };
  }
  return { value: raw, confidence };
}

/* -------------------------------------------------------------------------- */

const emptySignal = { present: false, evidence: "" };

/**
 * Validate the "is the attack still happening" subtree on its own.
 *
 * Split out of `validateExtraction` so the standalone triage call and the
 * eval in `scripts/eval.mjs` run the identical rule the shipped extraction
 * path runs. The interrupt gate is the one place where a second, subtly
 * different implementation would be worst: it decides whether a frightened
 * person gets a stop screen.
 *
 * The rule that does the work: a signal claimed without a verbatim quote is
 * an inference, and inferences do not get to fire the interrupt. They are
 * dropped here, before `decideInterrupt` ever sees them.
 */
export function validateActiveScam(raw: unknown): Extraction["active_scam"] {
  const activeRaw = (raw ?? {}) as Record<string, unknown>;

  const signal = (key: string) => {
    const s = activeRaw[key] as { present?: unknown; evidence?: unknown } | undefined;
    const present = s?.present === true;
    const evidence = typeof s?.evidence === "string" ? s.evidence.trim() : "";
    if (present && evidence === "") return emptySignal;
    return { present, evidence: present ? evidence : "" };
  };

  const verdictRaw = String((activeRaw as { verdict?: unknown }).verdict ?? "").toUpperCase();
  const verdict =
    verdictRaw === "ACTIVE" || verdictRaw === "ENDED" || verdictRaw === "UNCLEAR"
      ? (verdictRaw as "ACTIVE" | "UNCLEAR" | "ENDED")
      : "UNCLEAR";

  return {
    remote_access_app: signal("remote_access_app"),
    screen_sharing: signal("screen_sharing"),
    caller_on_line: signal("caller_on_line"),
    verification_transfer_requested: signal("verification_transfer_requested"),
    told_to_tell_nobody: signal("told_to_tell_nobody"),
    verdict,
  };
}

/**
 * Run the model's raw extraction through every shape and confidence check.
 * Returns the cleaned extraction plus a record of everything that was thrown
 * away and why — the receipt shows this, because a packet with stated holes is
 * more trustworthy than one that quietly filled them in.
 */
export function validateExtraction(raw: unknown): ValidationResult {
  const input = (raw ?? {}) as Record<string, ReadField | undefined>;
  const downgrades: Downgrade[] = [];

  const field = (key: string) => validateField(key, input[key], downgrades);

  const summaryRaw = (raw as { summary?: unknown })?.summary;

  const extraction: Extraction = {
    amount: field("amount"),
    currency: field("currency"),
    transaction_ref: field("transaction_ref"),
    utr_or_upi_ref: field("utr_or_upi_ref"),
    occurred_at: field("occurred_at"),
    beneficiary_handle: field("beneficiary_handle"),
    beneficiary_name: field("beneficiary_name"),
    victim_bank: field("victim_bank"),
    source_account_last4: field("source_account_last4"),
    payment_rail: validateEnumField(
      "payment_rail",
      input.payment_rail,
      PAYMENT_RAILS,
      "UNKNOWN",
      downgrades,
    ),
    fraud_category: validateEnumField(
      "fraud_category",
      input.fraud_category,
      FRAUD_CATEGORIES,
      "OTHER",
      downgrades,
    ),
    active_scam: validateActiveScam(
      (raw as { active_scam?: unknown })?.active_scam,
    ),
    summary: typeof summaryRaw === "string" ? summaryRaw.trim() : "",
  };

  return { extraction, downgrades };
}

/**
 * A blank extraction, every field UNREADABLE and nothing reported as dropped.
 *
 * Used when the model failed or the user chose to type everything themselves.
 * Distinct from `validateExtraction({})`, which would mark every field as a
 * downgrade — nothing was dropped here, there was simply never anything read.
 */
export function emptyExtraction(): Extraction {
  const blank = (): ReadField => ({ value: UNREADABLE, confidence: 0 });
  const noSignal = { present: false, evidence: "" };

  return {
    amount: blank(),
    currency: { value: "INR", confidence: 1 },
    transaction_ref: blank(),
    utr_or_upi_ref: blank(),
    occurred_at: blank(),
    beneficiary_handle: blank(),
    beneficiary_name: blank(),
    victim_bank: blank(),
    source_account_last4: blank(),
    payment_rail: { value: "UNKNOWN", confidence: 0 },
    fraud_category: { value: "OTHER", confidence: 0 },
    active_scam: {
      remote_access_app: noSignal,
      screen_sharing: noSignal,
      caller_on_line: noSignal,
      verification_transfer_requested: noSignal,
      told_to_tell_nobody: noSignal,
      verdict: "UNCLEAR",
    },
    summary: "",
  };
}

/** True when a field holds no usable value. Drives the "hole" state in the UI. */
export function isMissing(field: ReadField | undefined): boolean {
  return !field || field.value === UNREADABLE || field.value.trim() === "";
}

/**
 * The enum fields cannot hold UNREADABLE, so they carry a fallback instead.
 *
 * `validateEnumField` turns an unreadable payment rail into "UNKNOWN" and an
 * unreadable category into "OTHER", because those are the only values the
 * schema's enum permits. Both mean exactly what UNREADABLE means everywhere
 * else — nothing was read — but `isMissing` sees a non-empty string and says
 * the field is present.
 */
const ENUM_FALLBACK: Record<string, string> = {
  payment_rail: "UNKNOWN",
  fraud_category: "OTHER",
};

/**
 * True when a freeze field holds nothing a bank could act on.
 *
 * Use this rather than `isMissing` anywhere a count is shown to the user. The
 * receipt says "sent with N of 9 fields", and counting "UNKNOWN" as a sent
 * payment rail made a completely empty packet report 1 of 9. On a screen whose
 * whole argument is that it counts its holes honestly, that is the last number
 * that should be generous.
 */
export function isMissingFreezeField(key: string, field: ReadField | undefined): boolean {
  if (isMissing(field)) return true;
  return ENUM_FALLBACK[key] === field!.value;
}
