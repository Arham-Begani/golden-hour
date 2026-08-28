import { NextResponse } from "next/server";
import { getTimings } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every recorded run, unfiltered.
 *
 * The evidence page shows the whole distribution rather than a best time.
 * Reporting a median across all runs, including the slow ones, is the only
 * version of this number that means anything.
 *
 * Real runs are reported at the top level and demo replays under `demo`, never
 * merged. A demo replay serves a cached extraction and starts its clock at the
 * fixture click, so it measures review time and nothing else. It is not
 * evidence for the sixty-second claim and is not counted as such.
 */
function summarise(runs: number[]) {
  const sorted = [...runs].sort((a, b) => a - b);

  const percentile = (p: number) =>
    sorted.length === 0 ? null : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

  return {
    count: sorted.length,
    median_ms: percentile(0.5),
    p90_ms: percentile(0.9),
    fastest_ms: sorted[0] ?? null,
    slowest_ms: sorted[sorted.length - 1] ?? null,
    under_60s: sorted.filter((ms) => ms <= 60_000).length,
    runs: sorted,
  };
}

export async function GET() {
  const [real, demo] = await Promise.all([getTimings("real"), getTimings("demo")]);

  // Real stats stay spread at the top level so existing readers keep working.
  return NextResponse.json({ ok: true, ...summarise(real), demo: summarise(demo) });
}
