import { z } from "zod";
import { EXTRACT_MODEL, EXTRACT_TIMEOUT_MS, getGemini, withTimeout } from "./gemini";
import { toGeminiSchema } from "./gemini-schema";
import { EXTRACTION_INSTRUCTION } from "./prompts";
import { ExtractionSchema } from "./schema";
import { validateExtraction, type ValidationResult } from "./validate";

/**
 * Lift the freeze-relevant facts off whatever the user could give us fastest:
 * a screenshot of the transaction, a pasted bank SMS, or one dictated
 * sentence.
 *
 * This is the piece that makes sixty seconds possible rather than merely
 * shorter. Without it you have reordered a form; with it a screenshot becomes
 * a structured packet without the user typing a transaction ID they can barely
 * read off a cracked screen at midnight.
 */

export type ExtractInput = {
  /** Base64 image data with its mime type. Never persisted anywhere. */
  image?: { mimeType: string; data: string };
  /** Pasted SMS text, or a sentence the user typed or dictated. */
  text?: string;
};

/** Built once — the JSON Schema walk is pure overhead on every request. */
let cachedResponseSchema: Record<string, unknown> | null = null;

export function extractionResponseSchema(): Record<string, unknown> {
  cachedResponseSchema ??= toGeminiSchema(
    z.toJSONSchema(ExtractionSchema, { io: "output" }),
  );
  return cachedResponseSchema;
}

function buildParts(input: ExtractInput, now: Date) {
  const parts: Array<Record<string, unknown>> = [];

  if (input.image) {
    parts.push({
      inlineData: { mimeType: input.image.mimeType, data: input.image.data },
    });
  }

  const context = [
    `Current time: ${now.toISOString()} (${now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    })} IST). Resolve any relative timestamp against this.`,
  ];

  if (input.text?.trim()) {
    context.push("", "What the person gave us:", input.text.trim());
  }

  if (input.image && !input.text?.trim()) {
    context.push("", "The attached image is their evidence of the transaction.");
  }

  parts.push({ text: context.join("\n") });
  return parts;
}

/**
 * True when the failure looks like Gemini rejecting the thinking config rather
 * than a real fault.
 *
 * Matching only /thinking/ was not enough. gemini-3.5-flash-lite rejects
 * `thinkingBudget: 0` with the entirely generic "Request contains an invalid
 * argument." and a 400 — the word "thinking" appears nowhere — so the retry
 * below never fired and every live extraction failed. A bare 400 is enough of a
 * signal here: the retry drops one optional config key and calls again, and if
 * the fault was something else the second call fails with the real error.
 */
const isThinkingConfigError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /thinking/i.test(message) || /INVALID_ARGUMENT|\b400\b/.test(message);
};

async function callGemini(input: ExtractInput, now: Date): Promise<string> {
  const ai = getGemini();
  const parts = buildParts(input, now);

  const config: Record<string, unknown> = {
    systemInstruction: EXTRACTION_INSTRUCTION,
    temperature: 0,
    responseMimeType: "application/json",
    responseSchema: extractionResponseSchema(),
  };

  // Opt-in, not opt-out. Not every model tier accepts a thinking budget, and
  // sending one it rejects costs a wasted round trip on a clock that matters.
  const raw = process.env.GEMINI_THINKING_BUDGET?.trim();
  const budget = raw ? Number(raw) : Number.NaN;
  const withThinking = Number.isFinite(budget)
    ? { ...config, thinkingConfig: { thinkingBudget: budget } }
    : config;

  const run = (cfg: Record<string, unknown>) =>
    ai.models
      .generateContent({
        model: EXTRACT_MODEL,
        contents: [{ role: "user", parts }],
        config: cfg,
      })
      .then((response) => response.text ?? "");

  try {
    return await run(withThinking);
  } catch (error) {
    // Not every model tier accepts a thinking budget. Losing the latency win
    // is fine; losing the extraction is not.
    if (withThinking !== config && isThinkingConfigError(error)) {
      return run(config);
    }
    throw error;
  }
}

export type ExtractResult = ValidationResult & {
  model: string;
  latency_ms: number;
};

/**
 * One model call returns both halves — the freeze fields and the interrupt
 * signals. A second round trip would cost seconds the user does not have.
 *
 * Throws on timeout or model failure. Callers degrade to manual entry rather
 * than blocking; the clock does not stop for our infrastructure.
 */
export async function extract(input: ExtractInput, now: Date = new Date()): Promise<ExtractResult> {
  if (!input.image && !input.text?.trim()) {
    throw new Error("extract: needs an image or some text");
  }

  const startedAt = Date.now();
  const raw = await withTimeout(callGemini(input, now), EXTRACT_TIMEOUT_MS, "extraction");
  const latency_ms = Date.now() - startedAt;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`extract: model did not return JSON (${raw.slice(0, 200)})`);
  }

  return { ...validateExtraction(parsed), model: EXTRACT_MODEL, latency_ms };
}
