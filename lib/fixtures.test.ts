import { describe, expect, it } from "vitest";
import { FIXTURES, isFixtureSummary, materialiseFixture } from "./fixtures";
import { validateExtraction } from "./validate";

/**
 * These guard the one thing standing between a demo replay and the
 * sixty-second claim.
 *
 * A demo run serves a cached extraction and starts its clock at the fixture
 * click, so it measures confirm-page review time and nothing else. If the
 * server ever stops recognising one, it silently starts counting toward a
 * number the run did not earn — the exact fabrication this project refuses
 * elsewhere. Silent is the problem; these tests make it loud.
 */
describe("isFixtureSummary", () => {
  it("recognises every fixture after the full round trip the server sees", () => {
    // Not the raw strings — what actually arrives back at /api/freeze, having
    // been through materialiseFixture and the real validation path.
    for (const fixture of FIXTURES) {
      const { extraction } = validateExtraction(materialiseFixture(fixture));
      expect(
        isFixtureSummary(extraction.summary),
        `fixture "${fixture.id}" is no longer recognised as a demo run`,
      ).toBe(true);
    }
  });

  it("does not match a real report", () => {
    expect(isFixtureSummary("Rs 3,000 went to a UPI ID I do not recognise.")).toBe(false);
  });

  it("does not match an empty or whitespace summary", () => {
    // A real report with no summary must stay real. Matching "" would bucket
    // every summary-less run as demo and quietly empty the distribution.
    expect(isFixtureSummary("")).toBe(false);
    expect(isFixtureSummary("   ")).toBe(false);
  });

  it("ignores surrounding whitespace", () => {
    const { extraction } = validateExtraction(materialiseFixture(FIXTURES[0]));
    expect(isFixtureSummary(`  ${extraction.summary}  `)).toBe(true);
  });
});
