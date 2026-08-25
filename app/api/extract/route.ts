import { NextResponse } from "next/server";
import { extract } from "@/lib/extract";
import { getFixture, materialiseFixture } from "@/lib/fixtures";
import { validateExtraction } from "@/lib/validate";
import { decideInterrupt } from "@/lib/interrupt";

/** Base64 image payloads need the Node runtime, not Edge. */
export const runtime = "nodejs";

/**
 * Vercel caps request bodies around 4.5MB. The client downscales before
 * upload, so anything arriving over this is a bug or an attack, not a photo.
 */
const MAX_IMAGE_CHARS = 3_500_000;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

type Body = {
  text?: string;
  image?: { mimeType?: string; data?: string };
  /** Demo mode: replay a cached case instead of calling the model. */
  fixture?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const image =
    body.image?.data && body.image?.mimeType
      ? { mimeType: body.image.mimeType, data: body.image.data }
      : undefined;

  if (image) {
    if (!ALLOWED_MIME.has(image.mimeType)) {
      return NextResponse.json({ ok: false, reason: "unsupported_image_type" }, { status: 415 });
    }
    if (image.data.length > MAX_IMAGE_CHARS) {
      return NextResponse.json({ ok: false, reason: "image_too_large" }, { status: 413 });
    }
  }

  if (!text && !image && !body.fixture) {
    return NextResponse.json({ ok: false, reason: "nothing_to_read" }, { status: 400 });
  }

  // Demo mode. Cached extraction, real validation — the pipeline a judge sees
  // is the production one with its first step replayed.
  if (body.fixture) {
    const fixture = getFixture(body.fixture);
    if (!fixture) {
      return NextResponse.json({ ok: false, reason: "unknown_fixture" }, { status: 404 });
    }

    const { extraction, downgrades } = validateExtraction(materialiseFixture(fixture));
    return NextResponse.json({
      ok: true,
      source: "fixture" as const,
      fixture: fixture.id,
      extraction,
      downgrades,
      interrupt: decideInterrupt(extraction),
      latency_ms: 0,
    });
  }

  try {
    const result = await extract({ text, image });
    return NextResponse.json({
      ok: true,
      source: "model" as const,
      extraction: result.extraction,
      downgrades: result.downgrades,
      interrupt: decideInterrupt(result.extraction),
      model: result.model,
      latency_ms: result.latency_ms,
    });
  } catch (error) {
    // A model failure is a designed-for path, not an exception: the client
    // drops the user into manual entry with the clock still running. Returning
    // 200 with ok:false keeps that path impossible to miss.
    const message = error instanceof Error ? error.message : String(error);
    console.error("[extract] failed:", message);
    return NextResponse.json({
      ok: false,
      reason: /timed out/i.test(message) ? "timeout" : "model_error",
      detail: message,
    });
  }
}
