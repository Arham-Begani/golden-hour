/**
 * The recovery curve.
 *
 * The risk of a decaying counter is that it becomes dark-pattern urgency
 * theatre. The defence is that the number is real, cited, and derived from the
 * user's OWN fraud timestamp rather than from when the page loaded. If they
 * were defrauded six days ago the meter reads 2% and does not pretend
 * otherwise. It never manufactures urgency that isn't there.
 *
 * Honesty note carried into the UI: the three published figures are *bucket*
 * statistics ("reported within 60 minutes → ~50% recovered"), not an
 * instantaneous rate. The meter needs a continuous curve, so this is a
 * log-time interpolation *fitted to* those buckets. Anchors carry `cited` so
 * the meter can draw which points are sourced and which are interpolation.
 *
 * See CITATIONS.md. If a figure cannot be sourced, change the figure — do not
 * ship an uncited decaying counter.
 */

export type Anchor = {
  /** Minutes between the fraud and the report. */
  minutes: number;
  /** Share of funds recovered. */
  probability: number;
  /** True if this point is meant to come from a published figure. */
  cited: boolean;
  /**
   * The verified source URL, or null if nobody has sourced it yet.
   *
   * As of writing, every one of these is null. The figures come from the
   * project brief and a first pass could not verify them — see CITATIONS.md,
   * which also records a published claim that appears to CONTRADICT the 24h
   * anchor. The evidence page renders this state loudly on purpose: an
   * uncited decaying counter is the dark pattern this meter is supposed not
   * to be.
   */
  source: string | null;
  label: string;
};

export const ANCHORS: readonly Anchor[] = [
  {
    minutes: 1,
    probability: 0.58,
    cited: false,
    source: null,
    label: "Interpolated — the published curve does not anchor inside the first hour",
  },
  {
    minutes: 60,
    probability: 0.5,
    cited: true,
    source: null,
    label: "Reported within 1 hour",
  },
  {
    minutes: 60 * 24,
    probability: 0.1,
    cited: true,
    source: null,
    label: "Reported within 24 hours",
  },
  {
    minutes: 60 * 24 * 7,
    probability: 0.02,
    cited: true,
    source: null,
    label: "Reported after 7 days",
  },
] as const;

/** True once every cited anchor has a verified source. Gates the pitch. */
export const anchorsFullySourced = (): boolean =>
  ANCHORS.every((anchor) => !anchor.cited || anchor.source !== null);

const FLOOR = ANCHORS[ANCHORS.length - 1].probability;
const CEILING = ANCHORS[0].probability;

/**
 * Recovery probability at `minutes` after the fraud, interpolated linearly in
 * log10(time) between anchors. Flat outside the anchored range — we do not
 * extrapolate past the evidence in either direction.
 */
export function recoveryProbability(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= ANCHORS[0].minutes) return CEILING;

  const last = ANCHORS[ANCHORS.length - 1];
  if (minutes >= last.minutes) return FLOOR;

  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const a = ANCHORS[i];
    const b = ANCHORS[i + 1];
    if (minutes > b.minutes) continue;

    const span = Math.log10(b.minutes) - Math.log10(a.minutes);
    const position = (Math.log10(minutes) - Math.log10(a.minutes)) / span;
    return a.probability + position * (b.probability - a.probability);
  }

  return FLOOR;
}

/** Minutes elapsed between the fraud and `now`. Negative clocks read as 0. */
export function minutesSince(occurredAt: string | Date, now: Date = new Date()): number {
  const then = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
  if (Number.isNaN(then.getTime())) return Number.NaN;
  return Math.max(0, (now.getTime() - then.getTime()) / 60_000);
}

/**
 * The meter's full state. Returns null probability for an unreadable or
 * unparseable timestamp — an unknown clock must render as "unknown", never as
 * a confident number.
 */
export function meterState(occurredAt: string | null, now: Date = new Date()) {
  if (!occurredAt || occurredAt === "UNREADABLE") {
    return { known: false as const, minutes: null, probability: null };
  }
  const minutes = minutesSince(occurredAt, now);
  if (Number.isNaN(minutes)) {
    return { known: false as const, minutes: null, probability: null };
  }
  return {
    known: true as const,
    minutes,
    probability: recoveryProbability(minutes),
  };
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
