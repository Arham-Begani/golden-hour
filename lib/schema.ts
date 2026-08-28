import { z } from "zod";

/**
 * The sentinel that makes the whole product defensible.
 *
 * A hallucinated transaction ID in a freeze request is worse than a missing
 * one: a missing field means the bank works with what it has, a wrong field
 * means the bank chases the wrong account while the real one empties out.
 * So "I could not read this" is a first-class value, never an empty string
 * (which silently passes validation) and never a plausible reconstruction.
 */
export const UNREADABLE = "UNREADABLE";

/** Below this, we do not trust the model's own read of a field. */
export const CONFIDENCE_FLOOR = 0.55;

export const PAYMENT_RAILS = [
  "UPI",
  "IMPS",
  "NEFT",
  "RTGS",
  "CARD",
  "WALLET",
  "NETBANKING",
  "UNKNOWN",
] as const;

/**
 * The user never picks one of these. The model infers it from whatever they
 * gave us. The live portal demands this classification on the first screen,
 * before anything else — this product never asks at all.
 */
export const FRAUD_CATEGORIES = [
  "UPI_PAYMENT_FRAUD",
  "DIGITAL_ARREST_IMPERSONATION",
  "INVESTMENT_TRADING_SCAM",
  "JOB_TASK_SCAM",
  "LOAN_APP_HARASSMENT",
  "OTP_VISHING",
  "ECOMMERCE_DELIVERY_FRAUD",
  "ROMANCE_DATING_SCAM",
  "CARD_NETBANKING_FRAUD",
  "OTHER",
  "UNREADABLE",
] as const;

export const SCAM_VERDICTS = ["ACTIVE", "UNCLEAR", "ENDED"] as const;

/** A value the model read, plus how sure it was that it read it correctly. */
const readField = (description: string) =>
  z.object({
    value: z
      .string()
      .describe(
        `${description} If this cannot be read with certainty, output exactly "UNREADABLE". Never guess and never reconstruct a plausible-looking value.`,
      ),
    confidence: z
      .number()
      .describe(
        "0.0-1.0. How certain you are that `value` is exactly what the source says. Use a low number rather than an UNREADABLE you are unsure about.",
      ),
  });

const enumField = (values: readonly string[], description: string) =>
  z.object({
    value: z.enum(values as [string, ...string[]]).describe(description),
    confidence: z.number().describe("0.0-1.0 confidence in this classification."),
  });

/** One signal that the scam may still be happening right now. */
const signal = (description: string) =>
  z.object({
    present: z.boolean().describe(description),
    evidence: z
      .string()
      .describe(
        'A short direct quote from the source that supports this. Empty string if present is false. Do not paraphrase, do not infer — quote.',
      ),
  });

/**
 * Signals that this is a hostage situation in progress rather than a
 * post-mortem.
 *
 * Exported on its own because the standalone triage call and the eval need
 * exactly this subtree and nothing else — a triage call that also had to fill
 * in nine freeze fields would be measuring something other than triage.
 */
export const ActiveScamSchema = z
  .object({
    remote_access_app: signal(
      "The user mentions installing or being asked to install a screen-sharing or remote-access app (AnyDesk, TeamViewer, QuickSupport, RustDesk, 'support app').",
    ),
    screen_sharing: signal("The user's screen is currently being shared or was shared during the incident."),
    caller_on_line: signal("The user indicates a call is still connected, or that they are being kept on a call."),
    verification_transfer_requested: signal(
      "Someone is asking for a further payment to 'verify', 'unblock', 'release' or 'clear' funds.",
    ),
    told_to_tell_nobody: signal(
      "The user was instructed to keep this secret, not tell family, or told that discussing it is itself an offence.",
    ),
    verdict: z
      .enum(SCAM_VERDICTS)
      .describe(
        'ACTIVE only if the source gives explicit evidence the attack is happening RIGHT NOW. UNCLEAR if it might be but you are inferring. ENDED if the incident is plainly over. Default to UNCLEAR. A false ACTIVE, repeated, trains people to dismiss the real ones.',
      ),
  })
  .describe("Signals that this is a hostage situation in progress rather than a post-mortem.");

/** One plain sentence of what happened. Both the extraction and triage calls return it. */
const summaryField = z
  .string()
  .describe("One plain sentence describing what happened, in the user's own framing. No advice, no reassurance.");

/**
 * The five-or-so facts a beneficiary bank needs to place a hold, plus the
 * signals that decide whether we interrupt the report entirely.
 *
 * Both halves come back in ONE model call. A second round trip costs seconds
 * the user does not have.
 */
export const ExtractionSchema = z.object({
  amount: readField("The amount of money lost, digits only, no currency symbol or commas. e.g. 12500.00"),
  currency: readField('ISO currency code. Almost always "INR".'),
  transaction_ref: readField("The transaction ID / reference number shown by the app or bank."),
  utr_or_upi_ref: readField("The UTR (12 digits) or UPI reference number (12 digits). This is the single most useful field for a bank hold."),
  occurred_at: readField("When the transaction happened, as an ISO 8601 timestamp with timezone offset, assuming Asia/Kolkata (+05:30) unless stated otherwise."),
  beneficiary_handle: readField("Where the money went: a UPI VPA (name@bank), an account number, or a phone number."),
  beneficiary_name: readField("The name shown for the recipient, if any."),
  victim_bank: readField("The bank or app the money left from."),
  source_account_last4: readField("Last 4 digits of the account or card the money left from."),
  payment_rail: enumField(PAYMENT_RAILS, "Which payment rail moved the money."),
  fraud_category: enumField(FRAUD_CATEGORIES, "The kind of fraud this appears to be, inferred from what the user described."),

  active_scam: ActiveScamSchema,

  summary: summaryField,
});

/**
 * Just the triage half.
 *
 * The shipped hot path never uses this — extraction returns both halves in one
 * round trip, because a second call costs seconds the user does not have. This
 * is for triaging a description that arrives *after* the freeze fields are
 * already read, and for the eval, which needs to score the triage rule without
 * nine irrelevant fields in the way.
 */
export const TriageSchema = z.object({
  active_scam: ActiveScamSchema,
  summary: summaryField,
});

export type Triage = z.infer<typeof TriageSchema>;
export type ActiveScam = z.infer<typeof ActiveScamSchema>;

export type Extraction = z.infer<typeof ExtractionSchema>;
export type ReadField = z.infer<ReturnType<typeof readField>>;

/** The freeze-relevant fields, in the order a bank would want to read them. */
export const FREEZE_FIELDS = [
  "amount",
  "utr_or_upi_ref",
  "transaction_ref",
  "occurred_at",
  "beneficiary_handle",
  "beneficiary_name",
  "payment_rail",
  "victim_bank",
  "source_account_last4",
] as const;

export type FreezeFieldKey = (typeof FREEZE_FIELDS)[number];

/** What actually gets dispatched and stored against an acknowledgement number. */
export const FreezePacketSchema = z.object({
  ack: z.string(),
  created_at: z.string(),
  occurred_at: z.string(),
  extraction: ExtractionSchema,
  /** Which fields the user edited by hand after seeing the model's read. */
  corrected: z.array(z.string()).default([]),
  /** Milliseconds from first interaction to dispatch. The claim, measured. */
  elapsed_ms: z.number().nullable().default(null),
  /**
   * Whether this was a real report or a demo replay. Only "real" runs count
   * toward the sixty-second claim. Defaults so packets stored before the split
   * still parse — they are not read back into the distribution either way.
   */
  run_kind: z.enum(["real", "demo"]).default("real"),
  lang: z.enum(["en", "hi"]).default("en"),
  interrupt_shown: z.boolean().default(false),
});

export type FreezePacket = z.infer<typeof FreezePacketSchema>;

/** The unhurried half. Collected after the acknowledgement number exists. */
export const StatementSchema = z.object({
  statement: z.string().default(""),
  reporter_name: z.string().default(""),
  reporter_phone: z.string().default(""),
  reporter_email: z.string().default(""),
  reporter_address: z.string().default(""),
  relationship_to_victim: z.string().default(""),
  suspect_details: z.string().default(""),
  reported_elsewhere: z.string().default(""),
  delay_reason: z.string().default(""),
  updated_at: z.string().optional(),
});

export type Statement = z.infer<typeof StatementSchema>;
