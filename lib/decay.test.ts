import { describe, expect, it } from "vitest";
import {
  BANDS,
  MAX_MINUTES,
  SOURCES,
  bandFor,
  claimsFullySourced,
  elapsedLabel,
  elapsedParts,
  meterState,
  minutesSince,
  timelinePosition,
} from "./decay";

describe("bandFor", () => {
  it("puts a fresh fraud inside the first hour", () => {
    expect(bandFor(0).key).toBe("first-hour");
    expect(bandFor(59).key).toBe("first-hour");
  });

  it("moves out of the first hour exactly at sixty minutes", () => {
    // Exclusive upper bound: 60 minutes is no longer "inside the first hour".
    expect(bandFor(60).key).toBe("same-day");
  });

  it("separates the first day from the first week", () => {
    expect(bandFor(60 * 23).key).toBe("same-day");
    expect(bandFor(60 * 24).key).toBe("first-week");
    expect(bandFor(60 * 24 * 6).key).toBe("first-week");
  });

  it("reads anything past a week as older, however far past", () => {
    expect(bandFor(60 * 24 * 7).key).toBe("older");
    expect(bandFor(60 * 24 * 900).key).toBe("older");
  });

  it("never throws on a nonsense clock", () => {
    expect(bandFor(Number.NaN).key).toBe("older");
    expect(bandFor(Number.POSITIVE_INFINITY).key).toBe("older");
  });
});

describe("timelinePosition", () => {
  it("stays inside the track at both ends", () => {
    expect(timelinePosition(0)).toBe(0);
    expect(timelinePosition(MAX_MINUTES)).toBe(1);
    expect(timelinePosition(MAX_MINUTES * 1000)).toBe(1);
  });

  it("never moves backwards as time passes", () => {
    let previous = -1;
    for (let minutes = 0; minutes <= MAX_MINUTES; minutes += 37) {
      const position = timelinePosition(minutes);
      expect(position).toBeGreaterThanOrEqual(previous);
      previous = position;
    }
  });
});

describe("sourcing", () => {
  /**
   * The gate that used to guard a fabricated recovery curve now guards the
   * mechanism claim that replaced it. If a source ever loses its URL, the
   * evidence page must go back to warning.
   */
  it("has a URL for every claim it rests on", () => {
    expect(SOURCES.length).toBeGreaterThan(0);
    for (const source of SOURCES) expect(source.url).toMatch(/^https:\/\//);
    expect(claimsFullySourced()).toBe(true);
  });

  it("claims no recovery percentage anywhere", () => {
    // The whole point of the rewrite. No published figure gives a recovery
    // rate by elapsed time, so nothing in here may imply one.
    for (const band of BANDS) {
      expect(band).not.toHaveProperty("probability");
    }
  });
});

describe("meterState", () => {
  const at = (iso: string) => new Date(iso);

  it("computes from the fraud timestamp, not from page load", () => {
    const state = meterState("2026-08-27T12:00:00.000Z", at("2026-08-27T12:30:00.000Z"));
    expect(state.known).toBe(true);
    expect(state.minutes).toBeCloseTo(30, 5);
    expect(state.band?.key).toBe("first-hour");
  });

  it("reads a six-day-old fraud as six days and does not pretend otherwise", () => {
    const state = meterState("2026-08-21T12:00:00.000Z", at("2026-08-27T12:00:00.000Z"));
    expect(state.known).toBe(true);
    expect(state.band?.key).toBe("first-week");
    expect(elapsedParts(state.minutes!)).toEqual({ value: "6", unit: "days" });
  });

  it("returns unknown rather than a confident value for an unreadable clock", () => {
    for (const value of ["UNREADABLE", null, "not a date"]) {
      const state = meterState(value, at("2026-08-27T12:00:00.000Z"));
      expect(state.known).toBe(false);
      expect(state.minutes).toBeNull();
      expect(state.band).toBeNull();
    }
  });
});

describe("minutesSince", () => {
  it("clamps a future timestamp to zero instead of going negative", () => {
    const minutes = minutesSince(
      "2026-08-27T13:00:00.000Z",
      new Date("2026-08-27T12:00:00.000Z"),
    );
    expect(minutes).toBe(0);
  });
});

describe("elapsedLabel", () => {
  it("reads plainly at each scale", () => {
    expect(elapsedLabel(0.4)).toBe("just now");
    expect(elapsedLabel(1)).toBe("1 minute ago");
    expect(elapsedLabel(14)).toBe("14 minutes ago");
    expect(elapsedLabel(60)).toBe("1 hour ago");
    expect(elapsedLabel(60 * 26)).toBe("1 day ago");
    expect(elapsedLabel(60 * 24 * 6)).toBe("6 days ago");
  });
});

describe("elapsedParts", () => {
  it("gives a compact figure and a matching unit", () => {
    expect(elapsedParts(0.2)).toEqual({ value: "<1", unit: "min" });
    expect(elapsedParts(14)).toEqual({ value: "14", unit: "min" });
    expect(elapsedParts(60)).toEqual({ value: "1", unit: "hour" });
    expect(elapsedParts(60 * 5)).toEqual({ value: "5", unit: "hours" });
    expect(elapsedParts(60 * 24)).toEqual({ value: "1", unit: "day" });
  });
});
