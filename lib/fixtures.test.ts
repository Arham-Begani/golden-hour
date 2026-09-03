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

/**
 * The synthetic-data rule, applied to the fixtures.
 *
 * HONESTY.md claims no real UPI handle, phone number or personal identifier
 * appears anywhere in this repository "including in seeds and tests". That was
 * asserted for the eval cases and the judge scenarios and never for the demo
 * fixtures — which is where it was false: the clean-SMS case shipped a
 * `@okaxis` handle (a suffix Axis Bank actually issues, and one this project's
 * own judge-scenario test forbids by name) and a real bank helpline number.
 *
 * The demo cases are the strings most likely to end up in a screenshot, a video
 * frame or a slide, so they are the last place the rule should have gone
 * unchecked.
 */
describe("the demo fixtures carry no real identifiers", () => {
  /** Kept identical to the list in lib/judge-scenarios.test.ts on purpose. */
  const REAL_PSP_SUFFIXES =
    /@(?:ok(?:axis|hdfcbank|icici|sbi|bizaxis)|ybl|ibl|axl|apl|paytm|upi|sbi|hdfcbank|icici|axisbank|kotak|yesbank|barodampay|fbl|idfcbank|jupiteraxis|superyes|abfspay)\b/i;

  /** Everything a fixture puts on screen: its prompt text and every read value. */
  const surfaceOf = (fixture: (typeof FIXTURES)[number]) =>
    [fixture.input, JSON.stringify(fixture.raw)].join(" ");

  it("uses no real-world UPI handle suffix", () => {
    for (const fixture of FIXTURES) {
      expect(
        REAL_PSP_SUFFIXES.test(surfaceOf(fixture)),
        `fixture "${fixture.id}" contains a real PSP handle suffix`,
      ).toBe(false);
    }
  });

  it("contains nothing shaped like a phone number, Aadhaar or PAN", () => {
    const INDIAN_MOBILE = /(?:^|\D)(?:\+?91[-\s]?)?[6-9]\d{9}(?:\D|$)/;
    const AADHAAR = /(?:^|\D)\d{4}\s\d{4}\s\d{4}(?:\D|$)/;
    const PAN = /(?:^|\W)[A-Z]{5}\d{4}[A-Z](?:\W|$)/;

    for (const fixture of FIXTURES) {
      for (const [name, pattern] of [
        ["mobile", INDIAN_MOBILE],
        ["aadhaar", AADHAAR],
        ["pan", PAN],
      ] as const) {
        expect(
          pattern.test(surfaceOf(fixture)),
          `fixture "${fixture.id}" contains something shaped like a ${name}`,
        ).toBe(false);
      }
    }
  });

  it("contains no toll-free helpline number other than 1930", () => {
    // 1930 is the real national helpline and is meant to be reachable. Any
    // other 1800-block number in demo copy is some real institution's line.
    for (const fixture of FIXTURES) {
      expect(
        /\b1800[\s-]?\d{6,7}\b/.test(surfaceOf(fixture)),
        `fixture "${fixture.id}" contains a real toll-free number`,
      ).toBe(false);
    }
  });
});
