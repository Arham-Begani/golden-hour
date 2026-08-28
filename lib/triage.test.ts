import { describe, expect, it } from "vitest";
import { HARD_SIGNALS, SOFT_SIGNALS } from "./interrupt";
import { triageSignals } from "./triage";
import { TRIAGE_INSTRUCTION, EXTRACTION_INSTRUCTION, TRIAGE_ONLY_INSTRUCTION } from "./prompts";
import evalSuite from "../data/triage-eval.json";

/**
 * The eval in `scripts/eval.mjs` measures the model. These tests measure the
 * gate underneath it — the half that is a pure function and therefore the half
 * that can be pinned down offline, with no key and no network.
 *
 * The split matters: if the false-positive rate ever moves, these tests say
 * whether the gate changed or only the model did.
 */

const off = { present: false, evidence: "" };
const on = (evidence: string) => ({ present: true, evidence });

const signals = (over: Record<string, unknown> = {}) => ({
  remote_access_app: off,
  screen_sharing: off,
  caller_on_line: off,
  verification_transfer_requested: off,
  told_to_tell_nobody: off,
  verdict: "UNCLEAR",
  ...over,
});

describe("the triage gate", () => {
  it("fires only on ACTIVE plus a quoted hard signal", () => {
    const { interrupt } = triageSignals(
      signals({ verdict: "ACTIVE", caller_on_line: on("he is still on the phone with me") }),
    );
    expect(interrupt.fires).toBe(true);
    if (!interrupt.fires) return;
    expect(interrupt.primary).toBe("caller_on_line");
    expect(interrupt.evidence).toBe("he is still on the phone with me");
  });

  it("never fires on UNCLEAR, however many hard signals are set", () => {
    const every = Object.fromEntries(HARD_SIGNALS.map((k) => [k, on("quoted")]));
    const { interrupt } = triageSignals(signals({ ...every, verdict: "UNCLEAR" }));
    expect(interrupt.fires).toBe(false);
    if (interrupt.fires) return;
    expect(interrupt.reason).toBe("verdict_not_active");
  });

  it("never fires on ENDED", () => {
    const { interrupt } = triageSignals(
      signals({ verdict: "ENDED", remote_access_app: on("he made me install AnyDesk") }),
    );
    expect(interrupt.fires).toBe(false);
  });

  it("does not fire on ACTIVE alone, with no hard signal", () => {
    const { interrupt } = triageSignals(signals({ verdict: "ACTIVE" }));
    expect(interrupt.fires).toBe(false);
    if (interrupt.fires) return;
    expect(interrupt.reason).toBe("no_hard_signal");
  });

  /**
   * The isolation instruction is the scam's load-bearing structure, but it is
   * past tense — being told to tell nobody last Tuesday does not mean the call
   * is live now. It shapes the pre-written message; it never fires the screen.
   */
  it.each(SOFT_SIGNALS)("does not fire on the soft signal %s alone", (key) => {
    const { interrupt } = triageSignals(signals({ verdict: "ACTIVE", [key]: on("do not tell anyone") }));
    expect(interrupt.fires).toBe(false);
  });

  /**
   * The rule that stops an inference reaching the screen. A model that asserts
   * `present: true` without being able to quote the words is guessing, and a
   * guess does not get to stop someone's report.
   */
  it.each(HARD_SIGNALS)("drops %s when the model claims it without a quote", (key) => {
    const { active_scam, interrupt } = triageSignals(
      signals({ verdict: "ACTIVE", [key]: { present: true, evidence: "" } }),
    );
    expect(active_scam[key].present).toBe(false);
    expect(interrupt.fires).toBe(false);
  });

  it("drops a signal whose quote is only whitespace", () => {
    const { active_scam } = triageSignals(
      signals({ verdict: "ACTIVE", screen_sharing: { present: true, evidence: "   \n  " } }),
    );
    expect(active_scam.screen_sharing.present).toBe(false);
  });

  it("defaults an unknown verdict to UNCLEAR rather than trusting it", () => {
    const { active_scam } = triageSignals(signals({ verdict: "DEFINITELY_ACTIVE" }));
    expect(active_scam.verdict).toBe("UNCLEAR");
  });

  it("survives junk without throwing, and stays quiet", () => {
    for (const junk of [null, undefined, 0, "", [], { verdict: 7 }]) {
      const { interrupt } = triageSignals(junk);
      expect(interrupt.fires).toBe(false);
    }
  });

  /** Most urgent instruction wins. The screen shows exactly one. */
  it("picks remote access over a live call when both are present", () => {
    const { interrupt } = triageSignals(
      signals({
        verdict: "ACTIVE",
        caller_on_line: on("he is on the line"),
        remote_access_app: on("TeamViewer is running"),
      }),
    );
    expect(interrupt.fires).toBe(true);
    if (!interrupt.fires) return;
    expect(interrupt.primary).toBe("remote_access_app");
    expect(interrupt.signals).toContain("caller_on_line");
  });
});

describe("the eval suite", () => {
  const cases = evalSuite.cases;

  it("has enough COMPLETED cases for a false-positive rate to mean anything", () => {
    const completed = cases.filter((c) => c.label === "COMPLETED");
    expect(completed.length).toBeGreaterThanOrEqual(10);
  });

  it("labels every case ACTIVE or COMPLETED, with unique ids and a stated reason", () => {
    const ids = new Set<string>();
    for (const c of cases) {
      expect(["ACTIVE", "COMPLETED"]).toContain(c.label);
      expect(c.why.length).toBeGreaterThan(10);
      expect(c.text.length).toBeGreaterThan(20);
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
    }
  });

  /**
   * Non-negotiable: all demo data synthetic. A real UPI handle or phone number
   * in a fixture is a live person's identifier committed to a public repo.
   */
  it("contains no identifier-shaped strings", () => {
    const INDIAN_MOBILE = /(?:^|\D)(?:\+?91[-\s]?)?[6-9]\d{9}(?:\D|$)/;
    const VPA = /[a-z0-9._-]+@(?:ok\w+|paytm|ybl|upi|axl|apl|ibl|sbi|hdfcbank|icici)/i;
    const AADHAAR = /(?:^|\D)\d{4}\s?\d{4}\s?\d{4}(?:\D|$)/;
    const PAN = /(?:^|\W)[A-Z]{5}\d{4}[A-Z](?:\W|$)/;
    const LONG_DIGITS = /\d{9,}/;

    for (const c of cases) {
      for (const [name, pattern] of [
        ["mobile", INDIAN_MOBILE],
        ["vpa", VPA],
        ["aadhaar", AADHAAR],
        ["pan", PAN],
        ["long digit run", LONG_DIGITS],
      ] as const) {
        expect(pattern.test(c.text), `${c.id} contains something shaped like a ${name}`).toBe(false);
      }
    }
  });
});

describe("the prompts", () => {
  /**
   * The eval scores `TRIAGE_INSTRUCTION`. That number only describes the
   * shipped product while the extraction call embeds the same text verbatim —
   * so this asserts the composition rather than trusting it.
   */
  it("embeds the identical triage wording in both calls", () => {
    expect(EXTRACTION_INSTRUCTION).toContain(TRIAGE_INSTRUCTION);
    expect(TRIAGE_ONLY_INSTRUCTION).toContain(TRIAGE_INSTRUCTION);
  });

  it("tells the model a signal needs a verbatim quote", () => {
    expect(TRIAGE_INSTRUCTION).toMatch(/QUOTE/);
    expect(TRIAGE_INSTRUCTION).toMatch(/verbatim/i);
  });

  it("tells the model to default to UNCLEAR", () => {
    expect(TRIAGE_INSTRUCTION).toMatch(/Default to UNCLEAR/i);
  });

  /** The triage-only call must not drag the nine freeze fields along with it. */
  it("keeps the field-reading rules out of the triage-only call", () => {
    expect(TRIAGE_ONLY_INSTRUCTION).not.toMatch(/READING THE EVIDENCE/);
    expect(EXTRACTION_INSTRUCTION).toMatch(/READING THE EVIDENCE/);
  });
});
