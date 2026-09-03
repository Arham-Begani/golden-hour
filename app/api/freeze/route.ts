import { NextResponse } from "next/server";
import { isFixtureSummary } from "@/lib/fixtures";
import { decideInterrupt } from "@/lib/interrupt";
import { ExtractionSchema, type FreezePacket } from "@/lib/schema";
import { newAck, recordTiming, saveFreezePacket } from "@/lib/store";
import { validateExtraction } from "@/lib/validate";

export const runtime = "nodejs";

/**
 * Dispatch the freeze packet.
 *
 * The one thing this route must never do is refuse a packet for being
 * incomplete. Half the fields, on time, is the correct answer — a partial
 * packet at 60 seconds beats a complete one at fourteen minutes. Missing
 * fields are recorded as holes and sent as holes.
 */
export async function POST(request: Request) {
  let body: {
    extraction?: unknown;
    corrected?: unknown;
    elapsed_ms?: unknown;
    lang?: unknown;
    interrupt_shown?: unknown;
    description?: unknown;
    source?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  // Re-validate server-side. The client can edit any field, so the shape
  // checks that protect a bank from a wrong account number run again here.
  const { extraction, downgrades } = validateExtraction(body.extraction);

  const parsed = ExtractionSchema.safeParse(extraction);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_extraction", detail: parsed.error.issues },
      { status: 400 },
    );
  }

  const occurred = parsed.data.occurred_at.value;
  const elapsed = typeof body.elapsed_ms === "number" ? body.elapsed_ms : null;

  /**
   * Real run or demo replay.
   *
   * The client's own `source` is a hint; the summary fingerprint is the part
   * that holds. A demo replay serves a cached extraction and starts its clock
   * at the fixture click, so counting one toward the sixty-second claim would
   * inflate the number with a run that never did the work.
   */
  const kind = body.source === "fixture" || isFixtureSummary(parsed.data.summary) ? "demo" : "real";

  /** A lost clock is not a fast run. Record nothing, and say nothing was recorded. */
  const timingRecorded = elapsed !== null && elapsed > 0;

  const packet: FreezePacket = {
    ack: newAck(),
    created_at: new Date().toISOString(),
    occurred_at: occurred,
    extraction: parsed.data,
    corrected: Array.isArray(body.corrected) ? body.corrected.filter((c) => typeof c === "string") : [],
    elapsed_ms: elapsed,
    run_kind: kind,
    lang: body.lang === "hi" ? "hi" : "en",
    interrupt_shown: body.interrupt_shown === true,
    description: typeof body.description === "string" ? body.description.trim() : "",
  };

  await saveFreezePacket(packet);
  if (timingRecorded) await recordTiming(elapsed, kind);

  return NextResponse.json({
    ok: true,
    ack: packet.ack,
    created_at: packet.created_at,
    run_kind: kind,
    /** False when the clock was lost. Better surfaced than silently dropped. */
    timing_recorded: timingRecorded,
    // Sent with holes in it, and says so.
    downgrades,
    interrupt: decideInterrupt(parsed.data),
  });
}
