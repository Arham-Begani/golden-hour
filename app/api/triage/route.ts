import { NextResponse } from "next/server";
import { triage, triageSignals } from "@/lib/triage";

export const runtime = "nodejs";

/**
 * Is this person still inside the scam right now?
 *
 * The intake does not call this. `/api/extract` returns the freeze fields and
 * the interrupt decision in one round trip, because a second model call in the
 * hot path costs seconds the user does not have.
 *
 * Two callers:
 *
 * - The client, when a description arrives *after* extraction. A screenshot of
 *   a debit SMS carries no evidence about whether the caller is still on the
 *   line; that signal only ever lives in the sentence the user types, and they
 *   often type it second.
 * - `scripts/eval.mjs`, which scores the false-positive rate on labelled cases.
 *
 * Pass `signals` to run the gate with no model call at all — useful for
 * re-deciding after the user edits, and for testing the gate offline.
 */

type Body = {
  text?: string;
  /** A raw, un-validated active_scam object. Skips the model entirely. */
  signals?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  // Gate-only. No network, no key needed.
  if (body.signals !== undefined) {
    const { active_scam, interrupt } = triageSignals(body.signals);
    return NextResponse.json({
      ok: true,
      source: "signals" as const,
      active_scam,
      interrupt,
      latency_ms: 0,
    });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ ok: false, reason: "nothing_to_read" }, { status: 400 });
  }

  try {
    const result = await triage(text);
    return NextResponse.json({
      ok: true,
      source: "model" as const,
      active_scam: result.active_scam,
      summary: result.summary,
      interrupt: result.interrupt,
      model: result.model,
      latency_ms: result.latency_ms,
    });
  } catch (error) {
    /**
     * A triage failure must never block the report.
     *
     * The interrupt is an extra nudge on top of a flow that works without it.
     * Returning 200 with `ok:false` and an explicit non-firing decision means
     * a caller that forgets to check `ok` still gets the safe answer rather
     * than a thrown exception in the middle of someone's sixty seconds.
     */
    const message = error instanceof Error ? error.message : String(error);
    console.error("[triage] failed:", message);
    return NextResponse.json({
      ok: false,
      reason: /timed out/i.test(message) ? "timeout" : "model_error",
      detail: message,
      interrupt: { fires: false, reason: "verdict_not_active" as const },
    });
  }
}
