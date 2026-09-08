import { describe, expect, it } from "vitest";
import { getTimingEntries, getTimings, parseTimingEntry, recordTiming } from "./store";
import { ENOUGH_RUNS, describeSample, isSmallSample, sampleSize, splitSample } from "./timings";

/**
 * The five real runs on the live deployment on 8 September, which are what
 * caused this rule to exist. Kept as the literal figures rather than a
 * generated fixture: if the rule ever stops firing on the sample that motivated
 * it, that is the regression worth catching.
 */
const PRODUCTION_RUNS = [7662, 9390, 12412, 49451, 64489];

describe("sampleSize — what the count alone permits", () => {
  it("says nothing is measured at zero", () => {
    expect(sampleSize(0)).toBe("none");
    expect(sampleSize(null)).toBe("none");
    expect(sampleSize(undefined)).toBe("none");
  });

  it("refuses to call one run a median", () => {
    expect(sampleSize(1)).toBe("single");
  });

  it("caveats everything below the threshold", () => {
    for (let count = 2; count < ENOUGH_RUNS; count += 1) {
      expect(sampleSize(count)).toBe("small");
      expect(isSmallSample(count)).toBe(true);
    }
  });

  it("allows the word at the threshold and above", () => {
    expect(sampleSize(ENOUGH_RUNS)).toBe("enough");
    expect(sampleSize(ENOUGH_RUNS + 40)).toBe("enough");
    expect(isSmallSample(ENOUGH_RUNS)).toBe(false);
  });

  it("cannot reach split, because a count cannot answer that", () => {
    for (const count of [0, 1, 3, 5, 20]) {
      expect(sampleSize(count)).not.toBe("split");
    }
  });
});

describe("splitSample — whether the runs are one population", () => {
  it("splits the production sample that motivated the rule", () => {
    const split = splitSample(PRODUCTION_RUNS);
    expect(split).not.toBeNull();
    expect(split?.faster).toEqual([7662, 9390, 12412]);
    expect(split?.slower).toEqual([49451, 64489]);
    expect(split?.gapMs).toBe(49451 - 12412);
  });

  it("does not depend on the runs arriving sorted", () => {
    const shuffled = [64489, 7662, 49451, 12412, 9390];
    expect(splitSample(shuffled)).toEqual(splitSample(PRODUCTION_RUNS));
  });

  it("leaves an evenly spread sample alone", () => {
    expect(splitSample([10_000, 20_000, 30_000, 40_000, 50_000])).toBeNull();
  });

  it("calls a lone straggler an outlier rather than a group", () => {
    // One slow run among four fast ones. The median still describes the four,
    // and the strip plot already shows the straggler.
    expect(splitSample([9_000, 9_500, 10_000, 10_500, 90_000])).toBeNull();
  });

  it("needs two runs on each side of the gap", () => {
    // Four bunched and one far away, from the other direction.
    expect(splitSample([9_000, 80_000, 82_000, 84_000, 86_000])).toBeNull();
    // Two and three is enough.
    expect(splitSample([9_000, 9_500, 80_000, 82_000, 84_000])).not.toBeNull();
  });

  it("stays quiet below the count threshold, however wide the gap", () => {
    expect(splitSample([1_000, 2_000, 90_000, 91_000])).toBeNull();
    expect(splitSample([])).toBeNull();
    expect(splitSample(null)).toBeNull();
  });

  it("does not split runs that are all identical", () => {
    expect(splitSample([5_000, 5_000, 5_000, 5_000, 5_000])).toBeNull();
  });

  it("requires the gap to beat every other gap put together, not merely be the largest", () => {
    // Widest gap is 12s; the others sum to 24s. Largest, but not dominant.
    expect(splitSample([10_000, 20_000, 32_000, 40_000, 46_000])).toBeNull();
  });
});

describe("describeSample — the one answer both pages ask for", () => {
  it("reports the split rather than the count when the runs are two groups", () => {
    expect(describeSample(PRODUCTION_RUNS)).toBe("split");
  });

  it("still says enough when the runs are one population", () => {
    expect(describeSample([10_000, 20_000, 30_000, 40_000, 50_000])).toBe("enough");
  });

  it("defers to the count below the threshold", () => {
    expect(describeSample([])).toBe("none");
    expect(describeSample([49_451])).toBe("single");
    expect(describeSample([49_451, 64_489])).toBe("small");
  });

  it("never disagrees with sampleSize about anything but the split", () => {
    // The landing tile and /evidence both call this. A disagreement here is
    // the exact defect lib/timings.ts exists to make impossible.
    for (const runs of [[], [1_000], [1_000, 2_000], PRODUCTION_RUNS]) {
      const described = describeSample(runs);
      if (described !== "split") expect(described).toBe(sampleSize(runs.length));
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Provenance, and the entries recorded before there was any                  */
/* -------------------------------------------------------------------------- */

describe("recordTiming — provenance on the runs it stores", () => {
  // The memory backend is per-module and these append to it, so each assertion
  // is against what it just wrote — `lpush` semantics mean newest is first.
  it("stores what a run can later be explained by", async () => {
    await recordTiming(41_000, "real", { source: "model", corrected: 2 });
    const [newest] = await getTimingEntries("real");

    expect(newest.ms).toBe(41_000);
    expect(newest.source).toBe("model");
    expect(newest.corrected).toBe(2);
    expect(newest.at).not.toBeNull();
  });

  it("records an uncorrected run as zero corrections, not as unknown", async () => {
    await recordTiming(8_000, "real", { source: "model", corrected: 0 });
    const [newest] = await getTimingEntries("real");
    expect(newest.corrected).toBe(0);
  });

  it("records missing provenance as unknown rather than inventing it", async () => {
    await recordTiming(12_000, "demo");
    const [newest] = await getTimingEntries("demo");
    expect(newest.source).toBeNull();
    expect(newest.corrected).toBeNull();
  });

  it("refuses a lost clock, because a lost clock is not a fast run", async () => {
    const before = (await getTimings("demo")).length;
    await recordTiming(0, "demo");
    await recordTiming(-1, "demo");
    await recordTiming(Number.NaN, "demo");
    expect((await getTimings("demo")).length).toBe(before);
  });

  it("keeps getTimings returning bare durations for callers that only plot them", async () => {
    await recordTiming(33_000, "real", { source: "manual" });
    const runs = await getTimings("real");
    expect(runs.every((ms) => typeof ms === "number")).toBe(true);
    expect(runs).toContain(33_000);
  });
});

/**
 * The parser stands between the live Redis list and everything /evidence says.
 *
 * Every run recorded before 8 September is a bare integer on that list, and
 * Upstash hands values back as a number, as a numeric string, as parsed JSON or
 * as JSON text depending on how they went in. Getting this wrong does not throw
 * — it silently empties the distribution the whole page is built on.
 */
describe("parseTimingEntry — the shapes the live list actually holds", () => {
  it("reads a bare integer from before provenance existed", () => {
    expect(parseTimingEntry(49_451)).toEqual({
      ms: 49_451,
      at: null,
      source: null,
      corrected: null,
    });
  });

  it("reads the same integer as a string", () => {
    expect(parseTimingEntry("49451")?.ms).toBe(49_451);
  });

  it("reads an entry Upstash already deserialised", () => {
    const entry = parseTimingEntry({
      ms: 41_000,
      at: "2026-09-08T10:00:00.000Z",
      source: "model",
      corrected: 2,
    });
    expect(entry).toEqual({
      ms: 41_000,
      at: "2026-09-08T10:00:00.000Z",
      source: "model",
      corrected: 2,
    });
  });

  it("reads an entry that came back as JSON text", () => {
    const entry = parseTimingEntry('{"ms":8000,"at":null,"source":"manual","corrected":0}');
    expect(entry?.ms).toBe(8_000);
    expect(entry?.source).toBe("manual");
    expect(entry?.corrected).toBe(0);
  });

  it("drops what it cannot read rather than coercing it to a fast run", () => {
    // Number("") is 0 and Number(null) is 0; a zero-second run would be the
    // best time on the page and would be a parsing artefact.
    for (const junk of ["", "  ", null, undefined, {}, [], "abc", 0, -1, "{oops"]) {
      expect(parseTimingEntry(junk)).toBeNull();
    }
  });

  it("treats an unrecognised source as unknown rather than keeping it", () => {
    expect(parseTimingEntry({ ms: 5_000, source: "sideloaded" })?.source).toBeNull();
  });
});
