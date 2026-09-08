/**
 * How many recorded runs there are, and therefore what the site is allowed to
 * call them.
 *
 * This exists because the answer was being decided twice. `/evidence` grew a
 * small-sample caveat below five runs and a "The one run" label at one, while
 * the landing tile only ever special-cased one — so at two runs the front page
 * read "Median time to dispatch" while the evidence page, one click away, said
 * two runs "is not yet a distribution". The same figure described two ways on
 * the same site, and the more confident description on the page a reviewer
 * reaches first.
 *
 * That is the exact defect the "about fifty facts" finding was: the front door
 * asserting what the evidence page refuses. Both pages now ask this module and
 * cannot drift again.
 *
 * Deliberately not in `lib/store.ts`, which owns the other timing constants
 * (`TIMINGS_CAP`, `DEMO_CAP`) but imports the Redis client — importing it into
 * a client component would pull the store into the browser bundle. And
 * deliberately not in `lib/decay.ts`, whose clock is the victim's, not ours.
 */

/**
 * Below this many runs, the figures are shown with a caveat and the word
 * "median" is not used for them.
 *
 * Five is not a statistical threshold and does not pretend to be one. It is
 * the point below which a median is obviously closer to a single observation
 * than to a distribution, chosen so the site stops overstating early rather
 * than at the moment it becomes defensible.
 */
export const ENOUGH_RUNS = 5;

/**
 * `none` — nothing recorded; the claim is unproven and says so.
 * `single` — one run, which is an observation and not a median.
 * `small` — enough to show, not enough to describe as a distribution.
 * `enough` — "median" is an honest word for it.
 * `split` — enough runs, but not one population. See `splitSample`.
 */
export type SampleSize = "none" | "single" | "small" | "enough" | "split";

/**
 * What the count alone permits. `split` is not reachable from here, because
 * whether a sample is one population is a question about the values and not
 * about how many of them there are — use `describeSample` for the full answer.
 */
export function sampleSize(count: number | null | undefined): SampleSize {
  if (!count || count <= 0) return "none";
  if (count === 1) return "single";
  if (count < ENOUGH_RUNS) return "small";
  return "enough";
}

/** True while the figures need a caveat: recorded, but not yet a distribution. */
export const isSmallSample = (count: number | null | undefined): boolean => {
  const size = sampleSize(count);
  return size === "single" || size === "small";
};

/* -------------------------------------------------------------------------- */
/* Whether the runs are one population at all                                 */
/* -------------------------------------------------------------------------- */

/**
 * Two groups of runs, told apart because no single number describes both.
 */
export type SplitSample = {
  /** The runs below the gap, ascending. */
  faster: number[];
  /** The runs above it, ascending. */
  slower: number[];
  /** The gap between the two groups, in milliseconds. */
  gapMs: number;
};

/**
 * The smallest a group can be before a gap counts as a split rather than an
 * outlier.
 *
 * One slow run among four fast ones is a slow run: the median still describes
 * the other four, and the strip plot already shows the straggler. Two against
 * two is a different claim — two clusters, with nothing in between and no
 * honest single number to put there.
 */
const GROUP_MINIMUM = 2;

/**
 * Whether these runs are two groups rather than one, and where the seam is.
 *
 * **The rule, in one sentence:** if the widest gap between neighbouring runs is
 * wider than every other gap put together, and there are at least two runs on
 * each side of it, this is not one distribution and the middle value describes
 * neither half of it.
 *
 * Like `ENOUGH_RUNS` this is a stated heuristic and not a statistical test, and
 * it is written to be checkable by hand from the numbers `/evidence` already
 * prints. The alternative — a real mixture model over five points — would be a
 * more sophisticated way of saying something five points cannot support.
 *
 * **Why this exists.** The fifth real run landed and the site crossed
 * `ENOUGH_RUNS`, so both the landing tile and `/evidence` began reporting
 * "Median 12.4s" over runs of 7.7, 9.4, 12.4, 49.5 and 64.5 seconds. Three of
 * those are a person who knew exactly what to type; two are a person working
 * through it. The median sat in the empty space between the groups and
 * described nobody, and it undersold the sixty-second claim by a factor of five
 * while appearing to support it.
 *
 * That is this project's signature defect for the third time — one number
 * standing in for two different things, first as "about fifty facts" that
 * nobody counted, then as a landing tile calling two runs a median. The first
 * two were caught by a reader. This one is caught by the code.
 */
export function splitSample(runs: number[] | null | undefined): SplitSample | null {
  if (!runs || runs.length < ENOUGH_RUNS) return null;

  const sorted = [...runs].sort((a, b) => a - b);
  const range = sorted[sorted.length - 1] - sorted[0];
  if (range <= 0) return null;

  let seam = 0;
  let widest = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > widest) {
      widest = gap;
      seam = i;
    }
  }

  // Wider than everything else put together, which is the same as more than
  // half the total spread. Stated the first way because that is the version a
  // reader can check against the dots without doing arithmetic.
  if (widest * 2 <= range) return null;

  const faster = sorted.slice(0, seam);
  const slower = sorted.slice(seam);
  if (faster.length < GROUP_MINIMUM || slower.length < GROUP_MINIMUM) return null;

  return { faster, slower, gapMs: widest };
}

/**
 * The single question both pages ask, so that neither can answer it alone.
 *
 * Takes the runs rather than the count, because `split` cannot be decided from
 * a count and the landing tile was previously deciding on one.
 */
export function describeSample(runs: number[] | null | undefined): SampleSize {
  const size = sampleSize(runs?.length);
  if (size !== "enough") return size;
  return splitSample(runs) ? "split" : "enough";
}
