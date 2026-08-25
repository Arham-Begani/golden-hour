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
 */
export async function GET() {
  const runs = await getTimings();
  const sorted = [...runs].sort((a, b) => a - b);

  const percentile = (p: number) =>
    sorted.length === 0 ? null : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

  return NextResponse.json({
    ok: true,
    count: sorted.length,
    median_ms: percentile(0.5),
    p90_ms: percentile(0.9),
    fastest_ms: sorted[0] ?? null,
    slowest_ms: sorted[sorted.length - 1] ?? null,
    under_60s: sorted.filter((ms) => ms <= 60_000).length,
    runs: sorted,
  });
}
