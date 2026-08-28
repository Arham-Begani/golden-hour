import { UNREADABLE } from "./schema";

/**
 * Demo-safe cached extractions.
 *
 * Venue wifi dies, free tiers rate-limit, and neither is a reason to lose the
 * pitch. In demo mode these bypass the network — but they are fed through the
 * exact same `validateExtraction` path as a live response, so what a judge
 * sees is the real pipeline with a cached first step, not a mock of it.
 *
 * The four cases are chosen deliberately. Two of them are the product's best
 * arguments: the blurred screenshot proves UNREADABLE is engineered rather
 * than claimed, and the six-day-old fraud proves the meter does not
 * manufacture urgency that isn't there.
 */

const off = { present: false, evidence: "" };

export type Fixture = {
  id: string;
  label: string;
  /** Why this case earns its place in the demo. */
  purpose: string;
  /** Pre-filled into the intake so the demo starts from a real input. */
  input: string;
  /** Set when the case is meant to be run against an uploaded image. */
  expectsImage?: boolean;
  /**
   * Fixtures store an offset, not a timestamp, so the meter is always live.
   * null means the source genuinely contains no readable time.
   */
  occurredMinutesAgo: number | null;
  /** Raw, model-shaped output. Deliberately un-validated. */
  raw: Record<string, unknown>;
};

const field = (value: string, confidence: number) => ({ value, confidence });

export const FIXTURES: Fixture[] = [
  {
    id: "clean-sms",
    label: "Clean bank SMS",
    purpose: "The happy path. Screenshot to dispatchable packet in one step.",
    input:
      "Dear Customer, Rs.12,500.00 debited from A/c XX4471 on 24-08-26 at 21:14:07 to VPA rahulk.9821@okaxis (UPI Ref 523612345678). Not you? Call 18002586161. -HDFC Bank",
    occurredMinutesAgo: 9,
    raw: {
      amount: field("12500.00", 0.98),
      currency: field("INR", 0.99),
      // A real bank SMS carries the UPI ref but no separate transaction ID.
      // Even the clean case ships with a hole, and says so.
      transaction_ref: field(UNREADABLE, 0.2),
      utr_or_upi_ref: field("523612345678", 0.97),
      occurred_at: field("__OCCURRED_AT__", 0.94),
      beneficiary_handle: field("rahulk.9821@okaxis", 0.96),
      beneficiary_name: field(UNREADABLE, 0.1),
      victim_bank: field("HDFC Bank", 0.95),
      source_account_last4: field("4471", 0.93),
      payment_rail: field("UPI", 0.97),
      fraud_category: field("UPI_PAYMENT_FRAUD", 0.82),
      active_scam: {
        remote_access_app: off,
        screen_sharing: off,
        caller_on_line: off,
        verification_transfer_requested: off,
        told_to_tell_nobody: off,
        verdict: "UNCLEAR",
      },
      summary: "Rs 12,500 left the account to a UPI handle the sender does not recognise.",
    },
  },

  {
    id: "blurred",
    label: "Blurred screenshot",
    purpose:
      "The reference number is genuinely illegible. It comes back UNREADABLE and the packet dispatches anyway.",
    input: "",
    expectsImage: true,
    occurredMinutesAgo: 22,
    raw: {
      amount: field("47000.00", 0.71),
      currency: field("INR", 0.9),
      transaction_ref: field(UNREADABLE, 0.12),
      // The whole point of the case. No guess, no reconstruction.
      utr_or_upi_ref: field(UNREADABLE, 0.15),
      occurred_at: field("__OCCURRED_AT__", 0.81),
      beneficiary_handle: field(UNREADABLE, 0.24),
      beneficiary_name: field(UNREADABLE, 0.18),
      victim_bank: field("State Bank of India", 0.69),
      source_account_last4: field(UNREADABLE, 0.3),
      payment_rail: field("UPI", 0.62),
      fraud_category: field("UPI_PAYMENT_FRAUD", 0.6),
      active_scam: {
        remote_access_app: off,
        screen_sharing: off,
        caller_on_line: off,
        verification_transfer_requested: off,
        told_to_tell_nobody: off,
        verdict: "UNCLEAR",
      },
      summary: "A payment of about Rs 47,000 that the sender says they did not authorise.",
    },
  },

  {
    id: "digital-arrest",
    label: "Digital arrest, in progress",
    purpose:
      "The scam is still happening. The report stops and the isolation gets broken first.",
    input:
      "A man called saying he is from CBI and my Aadhaar was used in a money laundering case. He is still on the call right now. He told me not to tell anyone because it is a confidential investigation. He made me install AnyDesk on my phone to verify my account. I have already transferred 2,00,000 and he is asking for one more transfer to clear the rest.",
    // A narrative with no timestamp in it. The confirm step asks for this.
    occurredMinutesAgo: null,
    raw: {
      amount: field("200000.00", 0.86),
      currency: field("INR", 0.92),
      transaction_ref: field(UNREADABLE, 0.05),
      utr_or_upi_ref: field(UNREADABLE, 0.05),
      occurred_at: field(UNREADABLE, 0.2),
      beneficiary_handle: field(UNREADABLE, 0.08),
      beneficiary_name: field(UNREADABLE, 0.06),
      victim_bank: field(UNREADABLE, 0.15),
      source_account_last4: field(UNREADABLE, 0.05),
      payment_rail: field("UNKNOWN", 0.35),
      fraud_category: field("DIGITAL_ARREST_IMPERSONATION", 0.96),
      active_scam: {
        remote_access_app: { present: true, evidence: "He made me install AnyDesk on my phone" },
        screen_sharing: off,
        caller_on_line: { present: true, evidence: "He is still on the call right now" },
        verification_transfer_requested: {
          present: true,
          evidence: "he is asking for one more transfer to clear the rest",
        },
        told_to_tell_nobody: {
          present: true,
          evidence: "He told me not to tell anyone because it is a confidential investigation",
        },
        verdict: "ACTIVE",
      },
      summary:
        "Caller claiming to be from the CBI is still on the line and asking for a further transfer.",
    },
  },

  {
    id: "six-days-old",
    label: "Six days old",
    purpose: "The meter reads 6 days and does not pretend otherwise. It never invents urgency.",
    input:
      "I was scammed on a fake investment app on 18 August. I sent 85,000 to their account. The UTR is 402318765432.",
    occurredMinutesAgo: 60 * 24 * 6,
    raw: {
      amount: field("85000.00", 0.93),
      currency: field("INR", 0.95),
      transaction_ref: field(UNREADABLE, 0.1),
      utr_or_upi_ref: field("402318765432", 0.91),
      occurred_at: field("__OCCURRED_AT__", 0.72),
      beneficiary_handle: field("50100234567890", 0.64),
      beneficiary_name: field(UNREADABLE, 0.2),
      victim_bank: field(UNREADABLE, 0.25),
      source_account_last4: field(UNREADABLE, 0.2),
      payment_rail: field("IMPS", 0.7),
      fraud_category: field("INVESTMENT_TRADING_SCAM", 0.94),
      active_scam: {
        remote_access_app: off,
        screen_sharing: off,
        caller_on_line: off,
        verification_transfer_requested: off,
        told_to_tell_nobody: off,
        verdict: "ENDED",
      },
      summary: "Rs 85,000 sent to a fake investment platform six days ago.",
    },
  },
];

export const getFixture = (id: string): Fixture | undefined =>
  FIXTURES.find((fixture) => fixture.id === id);

/**
 * Resolve a fixture's stored offset into a live timestamp, so a case recorded
 * weeks ago still drives the meter correctly today.
 */
export function materialiseFixture(fixture: Fixture, now: Date = new Date()): Record<string, unknown> {
  const raw = structuredClone(fixture.raw) as Record<string, { value?: string } | unknown>;
  const occurred = raw.occurred_at as { value: string; confidence: number } | undefined;

  if (occurred?.value === "__OCCURRED_AT__") {
    occurred.value =
      fixture.occurredMinutesAgo === null
        ? UNREADABLE
        : new Date(now.getTime() - fixture.occurredMinutesAgo * 60_000).toISOString();
  }

  return raw;
}

/* -------------------------------------------------------------------------- */
/* Telling a demo replay apart from a real run                                */
/* -------------------------------------------------------------------------- */

/**
 * Every fixture's summary line, as it arrives back at the server.
 *
 * `summary` is the one field that makes a usable fingerprint: it is not in the
 * confirm page's EDITABLE list, so the user never touches it, and
 * validateExtraction only trims it. materialiseFixture rewrites occurred_at but
 * leaves summary alone, so what comes back is byte-identical to what is here.
 */
const FIXTURE_SUMMARIES: ReadonlySet<string> = new Set(
  FIXTURES.map((fixture) =>
    String((fixture.raw as { summary?: unknown }).summary ?? "").trim(),
  ).filter(Boolean),
);

/**
 * True if this summary came from a demo fixture rather than a real report.
 *
 * The client also sends its own `source`, but a client flag is only a hint —
 * this is the check that cannot be talked out of. It matters in exactly one
 * direction: a demo replay must never be counted as a real run in the
 * sixty-second claim. The reverse (someone marking a genuine run as demo) costs
 * them their own datapoint and nobody else anything.
 */
export const isFixtureSummary = (summary: string): boolean =>
  summary.trim().length > 0 && FIXTURE_SUMMARIES.has(summary.trim());
