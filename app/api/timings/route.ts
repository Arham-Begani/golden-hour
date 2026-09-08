import { NextResponse } from "next/server";
import { getTimingEntries, type TimingEntry } from "@/lib/store";
import { splitSample } from "@/lib/timings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every recorded run, unfiltered.
 *
 * The evidence page shows the whole distribution rather than a best time.
 * Reporting a median across all runs, including the slow ones, is the only
 * version of this number that means anything — and, since 8 September, only
 * when the runs are one population at all. `split` carries that answer so the
 * landing tile and `/evidence` cannot reach different ones.
 *
 * Real runs are reported at the top level and demo replays under `demo`, never
 * merged. A demo replay serves a cached extraction and starts its clock at the
 * fixture click, so it measures review time and nothing else. It is not
 * evidence for the sixty-second claim and is not counted as such.
 */
function summarise(entries: TimingEntry[]) {
  const runs = entries.map((entry) => entry.ms);
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
    /**
     * Two groups rather than one, when the runs say so. Null is the ordinary
     * case and means the median describes them.
     */
    split: splitSample(sorted),
    /**
     * How much of this list can be explained rather than only reported.
     *
     * Entries recorded before 8 September carry no provenance at all, and that
     * shortfall is published rather than smoothed over: it is the reason
     * `/evidence` can show the split and not account for it.
     */
    provenance: {
      recorded: entries.filter((entry) => entry.at !== null).length,
      /** Runs where the person changed at least one field before sending. */
      corrected: entries.filter((entry) => (entry.corrected ?? 0) > 0).length,
      unknown: entries.filter((entry) => entry.at === null).length,
    },
    entries,
  };
}

export async function GET() {
  const [real, demo] = await Promise.all([getTimingEntries("real"), getTimingEntries("demo")]);

  // Real stats stay spread at the top level so existing readers keep working.
  return NextResponse.json({ ok: true, ...summarise(real), demo: summarise(demo) });
}
