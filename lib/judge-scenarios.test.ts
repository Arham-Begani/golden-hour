import { describe, expect, it } from "vitest";
import { FIXTURES } from "./fixtures";
import { JUDGE_SCENARIOS } from "./judge-scenarios";
import { validateExtraction } from "./validate";
import { UNREADABLE } from "./schema";

/**
 * The judge scenarios carry identifier-shaped strings on purpose — a run where
 * `lib/validate.ts` downgraded every field to UNREADABLE would never reach the
 * confirm step, and the timed run would measure the wrong thing.
 *
 * That makes them the riskiest strings in the repository under non-negotiable
 * 8: all demo data synthetic, no real transaction IDs, UPI handles, phone
 * numbers, Aadhaar, PAN or personal data anywhere. These tests hold the line by
 * checking the properties that distinguish a synthetic identifier from a real
 * one, rather than trusting that whoever wrote them was careful.
 */

describe("the judge scenarios", () => {
  it("uses no real-world UPI handle suffix", () => {
    /**
     * The suffixes actually issued by Indian PSPs. A VPA ending in any of these
     * could route to a real person's account, so none may appear even in a
     * string nobody intends to pay.
     */
    const REAL_PSP_SUFFIXES =
      /@(?:ok(?:axis|hdfcbank|icici|sbi|bizaxis)|ybl|ibl|axl|apl|paytm|upi|sbi|hdfcbank|icici|axisbank|kotak|yesbank|barodampay|fbl|idfcbank|jupiteraxis|superyes|abfspay)\b/i;

    for (const scenario of JUDGE_SCENARIOS) {
      expect(
        REAL_PSP_SUFFIXES.test(scenario.text),
        `${scenario.id} contains a real PSP handle suffix`,
      ).toBe(false);
    }
  });

  it("contains nothing shaped like a phone number, Aadhaar or PAN", () => {
    const INDIAN_MOBILE = /(?:^|\D)(?:\+?91[-\s]?)?[6-9]\d{9}(?:\D|$)/;
    const AADHAAR = /(?:^|\D)\d{4}\s\d{4}\s\d{4}(?:\D|$)/;
    const PAN = /(?:^|\W)[A-Z]{5}\d{4}[A-Z](?:\W|$)/;

    for (const scenario of JUDGE_SCENARIOS) {
      for (const [name, pattern] of [
        ["mobile", INDIAN_MOBILE],
        ["aadhaar", AADHAAR],
        ["pan", PAN],
      ] as const) {
        expect(
          pattern.test(scenario.text),
          `${scenario.id} contains something shaped like a ${name}`,
        ).toBe(false);
      }
    }
  });

  /**
   * A UPI reference is 12 digits, and a 12-digit run is therefore the one
   * identifier shape these scenarios are allowed to contain. It must not
   * collide with a reference used anywhere else in the repo, so that no two
   * parts of the project can appear to describe the same transaction.
   */
  it("shares no reference number with the demo fixtures", () => {
    const refs = (s: string) => s.match(/\d{12}/g) ?? [];
    const fixtureRefs = new Set(
      FIXTURES.flatMap((f) => [...refs(f.input), ...refs(JSON.stringify(f.raw))]),
    );

    for (const scenario of JUDGE_SCENARIOS) {
      for (const ref of refs(scenario.text)) {
        expect(fixtureRefs.has(ref), `${scenario.id} reuses fixture reference ${ref}`).toBe(false);
      }
    }
  });

  it("gives every scenario a distinct id and a stated purpose", () => {
    const ids = new Set(JUDGE_SCENARIOS.map((s) => s.id));
    expect(ids.size).toBe(JUDGE_SCENARIOS.length);
    for (const scenario of JUDGE_SCENARIOS) {
      expect(scenario.purpose.length).toBeGreaterThan(20);
      expect(scenario.text.length).toBeGreaterThan(40);
      expect(scenario.label.length).toBeGreaterThan(3);
    }
  });

  /**
   * The point of the "still happening" scenario is that it trips the interrupt.
   * If someone softens its wording, the timed run silently stops demonstrating
   * the feature it exists to demonstrate.
   */
  it("keeps the live-attack scenario explicit enough to be read as live", () => {
    const live = JUDGE_SCENARIOS.find((s) => s.id === "still-happening");
    expect(live).toBeDefined();
    expect(live!.text).toMatch(/on the call with me now|right now|is on the call/i);
    expect(live!.text).toMatch(/screen sharing|remote|anydesk|teamviewer/i);
  });

  /**
   * The straight run has to produce a packet worth confirming. If the bank SMS
   * were written so that validation rejected its reference number, the timed
   * run would measure the manual-entry path instead of the extraction path.
   */
  it("carries a reference number the validator accepts", () => {
    const sms = JUDGE_SCENARIOS.find((s) => s.id === "bank-sms");
    const ref = sms!.text.match(/UPI Ref (\d{12})/)?.[1];
    expect(ref).toBeDefined();

    const { extraction } = validateExtraction({
      utr_or_upi_ref: { value: ref, confidence: 0.95 },
    });
    expect(extraction.utr_or_upi_ref.value).toBe(ref);
    expect(extraction.utr_or_upi_ref.value).not.toBe(UNREADABLE);
  });
});
