import { NextResponse } from "next/server";
import { extract, extractionResponseSchema } from "@/lib/extract";
import { EXTRACT_MODEL, hasGeminiKey } from "@/lib/gemini";
import { getFixture } from "@/lib/fixtures";
import { probeStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deployment smoke test.
 *
 * GET /api/health        — config only, no model call, no cost
 * GET /api/health?live=1 — runs a real extraction end to end
 *
 * Phase 0's exit criterion is that ?live=1 returns real model output from the
 * deployed URL. Vision itself is exercised by dropping a screenshot into the
 * app; this proves the model, the schema conversion, and the validation layer
 * are wired up correctly in the deployed environment.
 */
export async function GET(request: Request) {
  const live = new URL(request.url).searchParams.get("live") === "1";

  /**
   * An actual round-trip, not a check that two env vars are non-empty. A wrong
   * or expired Upstash token still looks configured, and the failure only
   * surfaces when a receipt 404s in front of whoever is watching.
   */
  const probe = await probeStore();

  const base = {
    ok: true,
    gemini_key: hasGeminiKey(),
    model: EXTRACT_MODEL,
    store: probe.backend,
    store_reachable: probe.ok,
    schema_fields: Object.keys(
      (extractionResponseSchema() as { properties: Record<string, unknown> }).properties,
    ).length,
    /**
     * The in-memory store is fine locally and BROKEN on Vercel: each
     * serverless invocation gets its own process, so the receipt request
     * usually lands somewhere that has never seen the packet and 404s. Check
     * this on the deployed URL before demoing.
     */
    deploy_ready: hasGeminiKey() && probe.ok,
    warnings: [
      hasGeminiKey() ? null : "GEMINI_API_KEY is not set — live extraction will fail.",
      probe.ok
        ? null
        : probe.backend === "memory"
          ? "Store is in-memory. On serverless this loses packets between requests; set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
          : `Upstash credentials are set but the round-trip failed${probe.error ? `: ${probe.error}` : ""}. Receipts will 404.`,
    ].filter(Boolean),
  };

  if (!live) return NextResponse.json(base);

  if (!hasGeminiKey()) {
    return NextResponse.json({ ...base, ok: false, reason: "no_api_key" }, { status: 503 });
  }

  const sample = getFixture("clean-sms")!;

  try {
    const result = await extract({ text: sample.input });
    return NextResponse.json({
      ...base,
      live: {
        latency_ms: result.latency_ms,
        // The values that matter for a bank hold, straight off the model.
        amount: result.extraction.amount,
        utr_or_upi_ref: result.extraction.utr_or_upi_ref,
        beneficiary_handle: result.extraction.beneficiary_handle,
        occurred_at: result.extraction.occurred_at,
        fraud_category: result.extraction.fraud_category.value,
        verdict: result.extraction.active_scam.verdict,
        downgrades: result.downgrades,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ...base, ok: false, reason: error instanceof Error ? error.message : String(error) },
      { status: 503 },
    );
  }
}
