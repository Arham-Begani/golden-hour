import type { Extraction } from "./schema";

/**
 * The interrupt gate.
 *
 * A meaningful share of people who reach a reporting portal are still inside
 * the scam: the remote-access app is still installed, the screen is still
 * shared, the caller is still on the line. The portal treats every report as a
 * post-mortem. Some of them are hostage situations in progress.
 *
 * The asymmetry that sets the threshold: a missed interrupt costs one user an
 * extra nudge. A false interrupt, repeated, trains everyone to dismiss the
 * real ones. So this is deliberately hard to trip — a pure function with
 * tests, not a judgement call left to the model.
 */

/** Signals that mean the attack is happening *now*. Any one of these can fire. */
export const HARD_SIGNALS = [
  "remote_access_app",
  "screen_sharing",
  "caller_on_line",
  "verification_transfer_requested",
] as const;

/**
 * Isolation is the scam's load-bearing structure, but "I was told to tell
 * nobody" is past tense — on its own it does not mean the call is live. It
 * shapes the message we pre-write; it never fires the interrupt alone.
 */
export const SOFT_SIGNALS = ["told_to_tell_nobody"] as const;

export type HardSignal = (typeof HARD_SIGNALS)[number];

/** Most urgent first. The screen shows exactly one instruction. */
const PRIORITY: readonly HardSignal[] = [
  "remote_access_app",
  "screen_sharing",
  "caller_on_line",
  "verification_transfer_requested",
];

export type InterruptDecision =
  | { fires: false; reason: "verdict_not_active" | "no_hard_signal" }
  | {
      fires: true;
      /** Which instruction to show. Copy lives in i18n, keyed by this. */
      primary: HardSignal;
      /** Every hard signal that tripped, for the "why am I seeing this" line. */
      signals: HardSignal[];
      /** The model's quoted evidence for the primary signal. Never paraphrased. */
      evidence: string;
      isolated: boolean;
    };

/**
 * Decide whether to stop the report.
 *
 * Requires BOTH an explicit ACTIVE verdict and at least one hard signal backed
 * by a quote. UNCLEAR never fires — ambiguous cases get the ordinary flow,
 * because a warning that fires on every report is a warning nobody reads.
 */
export function decideInterrupt(extraction: Extraction): InterruptDecision {
  const scam = extraction.active_scam;

  if (scam.verdict !== "ACTIVE") {
    return { fires: false, reason: "verdict_not_active" };
  }

  const signals = PRIORITY.filter((key) => scam[key]?.present === true);

  if (signals.length === 0) {
    return { fires: false, reason: "no_hard_signal" };
  }

  const primary = signals[0];

  return {
    fires: true,
    primary,
    signals,
    evidence: scam[primary]?.evidence ?? "",
    isolated: scam.told_to_tell_nobody?.present === true,
  };
}
