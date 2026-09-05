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
 */
export type SampleSize = "none" | "single" | "small" | "enough";

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
