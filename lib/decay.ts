/**
 * The clock, and what is actually known about it.
 *
 * This module used to compute a recovery *probability* from a curve fitted to
 * three figures in the project brief: 50% within an hour, 10% within a day, 2%
 * after a week. Those figures could not be traced to any published source.
 *
 * The search is recorded in CITATIONS.md. The short version: the Government of
 * India was asked, in Rajya Sabha Unstarred Question 1349 of 11 February 2026,
 * for "details of total amount recovered vis-à-vis losses incurred, year-wise".
 * The answer does not contain the word "recovered". No time-bucketed recovery
 * curve is published by MHA, I4C, NCRB or RBI, and the percentages that
 * circulate in the press are police statements rather than statistics.
 *
 * So the percentage is gone. A decaying counter whose number nobody can source
 * is urgency theatre — the exact dark pattern this product claims not to be,
 * and the one that would make every other honest thing here look like
 * decoration.
 *
 * What replaces it is what can be stated without inventing anything: the time
 * elapsed since the user's own fraud, and which band that falls in. The
 * direction is real and sourced — CFCFRMS exists to stop funds being siphoned
 * onward, so acting before the money moves is the whole game — and the
 * magnitude is not claimed at all.
 */

export type BandKey = "first-hour" | "same-day" | "first-week" | "older";

export type Band = {
  key: BandKey;
  /** Exclusive upper bound in minutes. Infinity on the last band. */
  untilMinutes: number;
};

/**
 * Time bands, not probabilities.
 *
 * The boundaries are the ones the domain already talks in — the first hour,
 * the first day, the first week. They order the user's situation without
 * attaching a number to it that no one has published.
 */
export const BANDS: readonly Band[] = [
  { key: "first-hour", untilMinutes: 60 },
  { key: "same-day", untilMinutes: 60 * 24 },
  { key: "first-week", untilMinutes: 60 * 24 * 7 },
  { key: "older", untilMinutes: Number.POSITIVE_INFINITY },
] as const;

/** Where the timeline drawing starts and stops. One minute to one week. */
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 60 * 24 * 7;

export type Source = {
  id: string;
  title: string;
  url: string;
  /** What this source does and does not establish. */
  supports: string;
};

/**
 * Everything the meter and the evidence page assert, and where it comes from.
 *
 * Each of these is a primary document. None of them is a recovery curve,
 * because no such curve is published — which is itself one of the findings.
 */
export const SOURCES: readonly Source[] = [
  {
    id: "mha-rs-1349",
    title: "MHA, Rajya Sabha Unstarred Question 1349, 11 February 2026",
    url: "https://www.mha.gov.in/MHA1/Par2017/pdfs/par2026-pdfs/RS11022026/1349.pdf",
    supports:
      "CFCFRMS was launched in 2021 “for immediate reporting of financial frauds and to stop " +
      "siphoning off funds by the fraudsters”. Till 31.12.2025 more than Rs 8,189 crore was saved " +
      "across more than 23.61 lakh complaints. The same answer was asked for amounts recovered " +
      "against losses and does not give them.",
  },
] as const;

/**
 * True once every claim the meter rests on has a source.
 *
 * Kept as a gate — the evidence page still renders a warning if this goes
 * false — but it now guards a mechanism claim rather than a fabricated curve.
 */
export const claimsFullySourced = (): boolean =>
  SOURCES.length > 0 && SOURCES.every((source) => source.url.length > 0);

/** Which band a report falls in. Never throws; anything odd reads as "older". */
export function bandFor(minutes: number): Band {
  if (!Number.isFinite(minutes)) return BANDS[BANDS.length - 1];
  return BANDS.find((band) => minutes < band.untilMinutes) ?? BANDS[BANDS.length - 1];
}

/**
 * Position along the drawn timeline, 0 to 1, log-scaled.
 *
 * This is a *position*, not a probability. It exists so the one moving element
 * on the page has something to move along, and it is derived purely from the
 * clock — there is no claim buried in it.
 */
export function timelinePosition(minutes: number): number {
  if (!Number.isFinite(minutes)) return 1;
  const clamped = Math.min(Math.max(minutes, MIN_MINUTES), MAX_MINUTES);
  const span = Math.log10(MAX_MINUTES) - Math.log10(MIN_MINUTES);
  return (Math.log10(clamped) - Math.log10(MIN_MINUTES)) / span;
}

/** Minutes elapsed between the fraud and `now`. Negative clocks read as 0. */
export function minutesSince(occurredAt: string | Date, now: Date = new Date()): number {
  const then = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
  if (Number.isNaN(then.getTime())) return Number.NaN;
  return Math.max(0, (now.getTime() - then.getTime()) / 60_000);
}

/**
 * The meter's full state.
 *
 * An unreadable or unparseable timestamp returns `known: false` — an unknown
 * clock must render as "unknown", never as a confident value.
 */
export function meterState(occurredAt: string | null, now: Date = new Date()) {
  if (!occurredAt || occurredAt === "UNREADABLE") {
    return { known: false as const, minutes: null, band: null };
  }
  const minutes = minutesSince(occurredAt, now);
  if (Number.isNaN(minutes)) {
    return { known: false as const, minutes: null, band: null };
  }
  return { known: true as const, minutes, band: bandFor(minutes) };
}

/** "14 minutes ago", "3 days ago" — plain, no hedging. */
export function elapsedLabel(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) {
    const m = Math.floor(minutes);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (minutes < 60 * 24) {
    const h = Math.floor(minutes / 60);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(minutes / (60 * 24));
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** The elapsed clock, as a compact figure and unit for the hero readout. */
export function elapsedParts(minutes: number): { value: string; unit: string } {
  if (minutes < 1) return { value: "<1", unit: "min" };
  if (minutes < 60) return { value: String(Math.floor(minutes)), unit: "min" };
  if (minutes < 60 * 24) {
    const h = Math.floor(minutes / 60);
    return { value: String(h), unit: h === 1 ? "hour" : "hours" };
  }
  const d = Math.floor(minutes / (60 * 24));
  return { value: String(d), unit: d === 1 ? "day" : "days" };
}
