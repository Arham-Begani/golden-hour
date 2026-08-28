import { describe, expect, it } from "vitest";
import { EVAL_HEADLINE, SECTIONS, INTRO, TITLE } from "./honesty";
import { renderHonestyMarkdown } from "./honesty-doc";
import evalResult from "../data/triage-eval-result.json";

/**
 * The honesty document has one job — being believed — and the fastest way to
 * lose that is for the page and the repo file to say different things. These
 * tests make that impossible to do quietly.
 */

describe("HONESTY.md mirrors the /honesty route", () => {
  /**
   * A file snapshot rather than an assertion, so the failure message is a diff
   * and the fix is `npm run docs:honesty` rather than hand-editing markdown to
   * match TypeScript.
   */
  it("is generated from lib/honesty.ts and committed in sync", async () => {
    await expect(renderHonestyMarkdown()).toMatchFileSnapshot("../HONESTY.md");
  });
});

describe("the honesty content", () => {
  const allText = [
    TITLE,
    ...INTRO,
    ...SECTIONS.flatMap((s) => [s.heading, ...s.body, ...(s.points ?? [])]),
    ...SECTIONS.flatMap((s) => (s.claims ?? []).flatMap((c) => [c.thing, c.detail])),
  ].join("\n");

  /**
   * The one claim that must never go missing. Everything else on the site is
   * downstream of the product not pretending to be a government service.
   */
  it("states plainly that nothing is frozen and nothing is dispatched", () => {
    expect(allText).toMatch(/does not freeze anyone's money/i);
    expect(allText).toMatch(/no bank integration/i);
    expect(allText).toMatch(/nothing submitted here reaches anybody/i);
  });

  it("points at the real routes rather than only disclaiming", () => {
    expect(allText).toMatch(/1930/);
    expect(allText).toMatch(/cybercrime\.gov\.in/);
  });

  /**
   * Non-negotiable 7: every statistic in the UI shows its source inline. The
   * recovery-curve section makes a claim about a parliamentary answer, so it
   * carries the link to that answer.
   */
  it("cites a source next to the recovery-curve claim", () => {
    const section = SECTIONS.find((s) => s.id === "recovery-curve");
    expect(section?.source?.url).toMatch(/^https:\/\/www\.mha\.gov\.in\//);
    expect(section?.source?.label.length).toBeGreaterThan(10);
  });

  /**
   * The measured numbers must come from the eval's own output file, never from
   * a figure someone typed in from memory. If the eval is re-run and the rate
   * moves, the page moves with it.
   */
  it("reads the interrupt numbers from the eval result rather than hardcoding them", () => {
    expect(EVAL_HEADLINE).toContain(`${evalResult.false_positive_rate_pct}% false positives`);
    expect(EVAL_HEADLINE).toContain(`${evalResult.completed_cases} COMPLETED cases`);
    expect(EVAL_HEADLINE).toContain(`${evalResult.median_latency_ms}ms`);
  });

  /**
   * A clean measurement stated without its limits is a worse claim than no
   * measurement. If someone deletes the caveats, this fails.
   */
  it("states the limits of the measured false-positive rate", () => {
    const section = SECTIONS.find((s) => s.id === "eval");
    const points = (section?.points ?? []).join("\n");
    expect(points).toMatch(/not an independent benchmark/i);
    expect(points).toMatch(/small sample/i);
    expect(points).toMatch(/English/);
  });

  /** A constraint quietly abandoned is indistinguishable from one never noticed. */
  it("records the constraints that were deliberately dropped", () => {
    const section = SECTIONS.find((s) => s.id === "design-departures");
    const points = (section?.points ?? []).join("\n");
    expect(points).toMatch(/landing page/i);
    expect(points).toMatch(/Gemini, not OpenAI/i);
  });

  it("lists everything that is mocked, and nothing is left without a verdict", () => {
    const claims = SECTIONS.flatMap((s) => s.claims ?? []);
    expect(claims.length).toBeGreaterThan(8);
    for (const claim of claims) {
      expect(["real", "not-real", "partial"]).toContain(claim.status);
      expect(claim.detail.length).toBeGreaterThan(20);
    }
    // The two that would be most tempting to quietly upgrade.
    const byThing = (needle: string) =>
      claims.find((c) => c.thing.toLowerCase().includes(needle));
    expect(byThing("freeze actually happening")?.status).toBe("not-real");
    expect(byThing("acknowledgement number's authority")?.status).toBe("not-real");
  });

  it("has a unique id per section, so the page can deep-link to any claim", () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
  });
});
