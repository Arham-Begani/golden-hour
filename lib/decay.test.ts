import { describe, expect, it } from "vitest";
import { ANCHORS, elapsedLabel, meterState, minutesSince, recoveryProbability } from "./decay";

const HOUR = 60;
const DAY = 60 * 24;
const WEEK = DAY * 7;

describe("recoveryProbability", () => {
  it("hits every cited anchor exactly", () => {
    expect(recoveryProbability(HOUR)).toBeCloseTo(0.5, 6);
    expect(recoveryProbability(DAY)).toBeCloseTo(0.1, 6);
    expect(recoveryProbability(WEEK)).toBeCloseTo(0.02, 6);
  });

  it("never increases as time passes", () => {
    let previous = Infinity;
    for (let m = 0; m <= WEEK * 2; m += 7) {
      const p = recoveryProbability(m);
      expect(p).toBeLessThanOrEqual(previous + 1e-12);
      previous = p;
    }
  });

  it("stays flat past seven days rather than extrapolating to zero", () => {
    expect(recoveryProbability(WEEK)).toBeCloseTo(0.02, 6);
    expect(recoveryProbability(WEEK * 4)).toBeCloseTo(0.02, 6);
    expect(recoveryProbability(WEEK * 52)).toBeCloseTo(0.02, 6);
  });

  it("does not extrapolate above the first anchor", () => {
    const ceiling = ANCHORS[0].probability;
    expect(recoveryProbability(0)).toBeCloseTo(ceiling, 6);
    expect(recoveryProbability(-500)).toBeCloseTo(ceiling, 6);
    expect(recoveryProbability(Number.NaN)).toBeCloseTo(ceiling, 6);
    expect(recoveryProbability(0.1)).toBeLessThanOrEqual(1);
  });

  it("interpolates between anchors, not past them", () => {
    // Geometric midpoint of 60min and 24h in log-time.
    const mid = Math.sqrt(HOUR * DAY);
    const p = recoveryProbability(mid);
    expect(p).toBeLessThan(0.5);
    expect(p).toBeGreaterThan(0.1);
    expect(p).toBeCloseTo(0.3, 2);
  });

  it("labels the sub-hour segment as interpolation, not a cited figure", () => {
    expect(ANCHORS[0].cited).toBe(false);
    expect(ANCHORS.filter((a) => a.cited)).toHaveLength(3);
  });
});

describe("meterState", () => {
  const now = new Date("2026-08-24T21:00:00+05:30");

  it("computes from the fraud timestamp, not from page load", () => {
    const fourteenMinutesAgo = new Date(now.getTime() - 14 * 60_000).toISOString();
    const state = meterState(fourteenMinutesAgo, now);

    expect(state.known).toBe(true);
    expect(state.minutes).toBeCloseTo(14, 3);
    // Still inside the first hour, so above the 1-hour anchor.
    expect(state.probability!).toBeGreaterThan(0.5);
  });

  it("reads 2% for a six-day-old fraud and does not pretend otherwise", () => {
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60_000).toISOString();
    const state = meterState(sixDaysAgo, now);

    expect(state.probability!).toBeLessThan(0.03);
  });

  it("returns unknown rather than a confident number for an unreadable clock", () => {
    expect(meterState("UNREADABLE", now)).toMatchObject({ known: false, probability: null });
    expect(meterState(null, now)).toMatchObject({ known: false, probability: null });
    expect(meterState("not a date", now)).toMatchObject({ known: false, probability: null });
  });
});

describe("minutesSince", () => {
  it("clamps a future timestamp to zero instead of going negative", () => {
    const now = new Date("2026-08-24T21:00:00+05:30");
    const future = new Date(now.getTime() + 60 * 60_000).toISOString();
    expect(minutesSince(future, now)).toBe(0);
  });
});

describe("elapsedLabel", () => {
  it("reads plainly at each scale", () => {
    expect(elapsedLabel(0.5)).toBe("just now");
    expect(elapsedLabel(1)).toBe("1 minute ago");
    expect(elapsedLabel(14)).toBe("14 minutes ago");
    expect(elapsedLabel(60)).toBe("1 hour ago");
    expect(elapsedLabel(60 * 30)).toBe("1 day ago");
    expect(elapsedLabel(60 * 24 * 6)).toBe("6 days ago");
  });
});
