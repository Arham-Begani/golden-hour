import { describe, expect, it } from "vitest";
import { FIXTURES, isFixtureSummary, materialiseFixture } from "./fixtures";
import { validateExtraction } from "./validate";
import { UNREADABLE } from "./schema";

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

/**
 * The demo set has to be able to show the guarantee, not just describe it.
 *
 * `lib/validate.ts` is the load-bearing claim: the model can be confidently
 * wrong and the server still refuses the value. For a long time no demo path
 * exercised it — every fixture's holes came from the model saying UNREADABLE,
 * which shows the prompt behaving rather than the validator working, and the
 * "Dropped" chip on the confirm screen was unreachable in every demo.
 *
 * So one fixture is required to trip it. If someone "fixes" that eleven-digit
 * reference into a valid twelve, this fails and says why.
 */
describe("the demo set exercises the validator", () => {
  it("has a fixture whose confident value is refused on shape", () => {
    const withDowngrade = FIXTURES.map((fixture) => ({
      fixture,
      ...validateExtraction(materialiseFixture(fixture)),
    })).filter((entry) => entry.downgrades.some((d) => d.reason === "wrong_shape"));

    expect(
      withDowngrade.length,
      "no demo case makes lib/validate.ts reject a value, so no demo can show it working",
    ).toBeGreaterThan(0);
  });

  it("refuses the misread reference and keeps the model's value for the receipt", () => {
    const fixture = FIXTURES.find((f) => f.id === "misread-reference")!;
    const { extraction, downgrades } = validateExtraction(materialiseFixture(fixture));

    const dropped = downgrades.find((d) => d.field === "utr_or_upi_ref");
    expect(dropped?.reason).toBe("wrong_shape");
    // Confidently wrong is the dangerous case, and the point of the fixture.
    expect(dropped!.confidence).toBeGreaterThan(0.85);
    // Shown back on the confirm screen, so the refusal can be seen rather than trusted.
    expect(dropped!.original).toBe("52361234567");
    // The packet carries a stated hole, never a plausible guess.
    expect(extraction.utr_or_upi_ref.value).toBe(UNREADABLE);
  });
});
