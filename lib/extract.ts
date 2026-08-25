import { z } from "zod";
import { EXTRACT_MODEL, EXTRACT_TIMEOUT_MS, getGemini, withTimeout } from "./gemini";
import { toGeminiSchema } from "./gemini-schema";
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

const SYSTEM_INSTRUCTION = `You extract facts from evidence of a financial fraud in India, so that a bank can place a hold on the receiving account. You are not a chatbot. You do not give advice, comfort, or instructions. You return data.

THE ONE RULE THAT MATTERS

If you cannot read a value with certainty, output exactly "UNREADABLE".

Never guess. Never reconstruct a reference number that "looks about right". Never pad a partial number to the expected length. Never carry a digit over from a different field because it fits.

A missing transaction ID means the bank works with what it has. A wrong transaction ID means the bank freezes the wrong account while the real one empties out. UNREADABLE is the correct, safe, expected answer for anything blurred, cropped, glared, cut off, or ambiguous. It is not a failure. Use it freely.

The same applies to confidence: report what you actually believe. A value you are 40% sure of should say 0.4, not 0.9.

READING THE EVIDENCE

- Amounts: digits only, no symbol, no commas. Take the amount that LEFT the user's account, not a balance and not a fee.
- UTR / UPI reference: usually 12 digits, sometimes a bank-prefixed alphanumeric for NEFT and RTGS. This is the single most useful field. Do not confuse it with an order ID, a ticket number, or a phone number.
- Beneficiary handle: the UPI VPA (name@bank), account number, or phone number the money went TO. If the evidence only shows the sender, mark this UNREADABLE.
- Timestamps: return ISO 8601 with a timezone offset. Assume Asia/Kolkata (+05:30) unless the evidence says otherwise. Relative phrases ("just now", "20 minutes ago", "at 9:14 tonight") should be resolved against the current time given in the user message. If you cannot pin it down, UNREADABLE.
- Fraud category: infer it from what the user describes. Never ask them to classify it.

IS THE ATTACK STILL HAPPENING

Separately, judge whether this person is still inside the scam right now — remote-access app installed, screen being shared, caller still on the line, being asked for another "verification" transfer, told to tell nobody.

For each signal, set present only if you can QUOTE the words that support it. Put that quote in evidence, verbatim. If you are paraphrasing or inferring, the signal is not present.

Set verdict ACTIVE only when the evidence is explicit and present-tense. Set UNCLEAR when it might be happening but you are reading between the lines. Set ENDED when the incident is plainly over. Default to UNCLEAR.

This verdict stops the entire report and puts a warning in front of a frightened person. A warning that fires on every report is a warning nobody reads. Be conservative.

The summary field is one plain sentence of what happened, in the user's own framing. No advice, no reassurance, no exclamation marks.`;

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

/** True when the failure is Gemini rejecting a config key rather than a real fault. */
const isThinkingConfigError = (error: unknown) =>
  /thinking/i.test(error instanceof Error ? error.message : String(error));

async function callGemini(input: ExtractInput, now: Date): Promise<string> {
  const ai = getGemini();
  const parts = buildParts(input, now);

  const config: Record<string, unknown> = {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0,
    responseMimeType: "application/json",
    responseSchema: extractionResponseSchema(),
  };

  const budget = Number(process.env.GEMINI_THINKING_BUDGET ?? 0);
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
