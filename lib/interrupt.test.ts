import { describe, expect, it } from "vitest";
import { decideInterrupt } from "./interrupt";
import type { Extraction } from "./schema";

const off = { present: false, evidence: "" };
const on = (evidence: string) => ({ present: true, evidence });

const extraction = (
  scam: Partial<Extraction["active_scam"]> & { verdict: Extraction["active_scam"]["verdict"] },
): Extraction =>
  ({
    active_scam: {
      remote_access_app: off,
      screen_sharing: off,
      caller_on_line: off,
      verification_transfer_requested: off,
      told_to_tell_nobody: off,
      ...scam,
    },
  }) as Extraction;

describe("decideInterrupt — when it must stay quiet", () => {
  it("does not fire on an ordinary post-mortem UPI fraud report", () => {
    const decision = decideInterrupt(extraction({ verdict: "ENDED" }));
    expect(decision.fires).toBe(false);
  });

  it("never fires on UNCLEAR, even with every hard signal set", () => {
    const decision = decideInterrupt(
      extraction({
        verdict: "UNCLEAR",
        remote_access_app: on("I installed AnyDesk"),
        screen_sharing: on("screen was shared"),
        caller_on_line: on("still on the call"),
        verification_transfer_requested: on("asked for another transfer"),
      }),
    );

    expect(decision.fires).toBe(false);
    expect(decision).toMatchObject({ reason: "verdict_not_active" });
  });

  it("does not fire on ACTIVE with no hard signal", () => {
    const decision = decideInterrupt(extraction({ verdict: "ACTIVE" }));
    expect(decision).toMatchObject({ fires: false, reason: "no_hard_signal" });
  });

  it("does not fire on isolation alone — 'tell nobody' is past tense", () => {
    const decision = decideInterrupt(
      extraction({
        verdict: "ACTIVE",
        told_to_tell_nobody: on("he said not to tell my family"),
      }),
    );

    expect(decision).toMatchObject({ fires: false, reason: "no_hard_signal" });
  });
});

describe("decideInterrupt — when it must fire", () => {
  it("fires on an explicit remote-access install", () => {
    const decision = decideInterrupt(
      extraction({ verdict: "ACTIVE", remote_access_app: on("they made me install AnyDesk") }),
    );

    expect(decision).toMatchObject({
      fires: true,
      primary: "remote_access_app",
      evidence: "they made me install AnyDesk",
    });
  });

  it("fires on a live call", () => {
    const decision = decideInterrupt(
      extraction({ verdict: "ACTIVE", caller_on_line: on("he is still on the line") }),
    );
    expect(decision).toMatchObject({ fires: true, primary: "caller_on_line" });
  });

  it("shows the most urgent instruction when several signals trip", () => {
    const decision = decideInterrupt(
      extraction({
        verdict: "ACTIVE",
        caller_on_line: on("still on the call"),
        screen_sharing: on("sharing my screen"),
        remote_access_app: on("installed QuickSupport"),
      }),
    );

    // Powering the device off outranks hanging up, which outranks the rest.
    expect(decision).toMatchObject({ fires: true, primary: "remote_access_app" });
    if (decision.fires) {
      expect(decision.signals).toEqual(["remote_access_app", "screen_sharing", "caller_on_line"]);
    }
  });

  it("reports isolation so the message can be pre-written for it", () => {
    const decision = decideInterrupt(
      extraction({
        verdict: "ACTIVE",
        caller_on_line: on("still on the call"),
        told_to_tell_nobody: on("told me not to tell anyone"),
      }),
    );

    expect(decision).toMatchObject({ fires: true, isolated: true });
  });
});
