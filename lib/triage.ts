import { z } from "zod";
import { EXTRACT_MODEL, EXTRACT_TIMEOUT_MS, getGemini, withTimeout } from "./gemini";
import { toGeminiSchema } from "./gemini-schema";
import { decideInterrupt, type InterruptDecision } from "./interrupt";
import { TRIAGE_ONLY_INSTRUCTION } from "./prompts";
import { TriageSchema, type ActiveScam, type Extraction } from "./schema";
import { validateActiveScam } from "./validate";

/**
 * Triage on its own: is this person still inside the scam right now?
 *
 * The shipped intake does not call this. `extract()` returns the freeze fields
 * and the triage signals in one round trip, because a second call in the hot
 * path costs seconds the user does not have.
 *
 * This exists for two narrower jobs:
 *
 * 1. A description that arrives *after* extraction. A screenshot of a debit
 *    SMS carries no evidence of whether the caller is still on the line; the
 *    only place that signal lives is the sentence the user typed, and they
 *    often type it second.
 * 2. The eval. `scripts/eval.mjs` scores the false-positive rate of the
 *    interrupt on labelled cases, and it needs to score the triage rule
 *    without nine irrelevant freeze fields competing for the model's
 *    attention.
 *
 * Both paths run the same `TRIAGE_INSTRUCTION` the extraction call embeds and
 * the same `validateActiveScam` + `decideInterrupt` gate the intake runs, so
 * the measured number describes the shipped behaviour.
 */

let cachedTriageSchema: Record<string, unknown> | null = null;

export function triageResponseSchema(): Record<string, unknown> {
  cachedTriageSchema ??= toGeminiSchema(z.toJSONSchema(TriageSchema, { io: "output" }));
  return cachedTriageSchema;
}

export type TriageResult = {
  active_scam: ActiveScam;
  summary: string;
  interrupt: InterruptDecision;
  model: string;
  latency_ms: number;
};

/**
 * `decideInterrupt` takes a whole `Extraction` but reads only `active_scam`.
 * Rather than widen its signature — and invite a future caller to pass it
 * something half-built — hand it a shape that satisfies the type and is
 * obviously not a real extraction.
 */
const gate = (active: ActiveScam): InterruptDecision =>
  decideInterrupt({ active_scam: active } as Extraction);

/** Run the gate over signals we already have. No model call, no network. */
export function triageExtraction(extraction: Extraction): InterruptDecision {
  return decideInterrupt(extraction);
}

/** Run the gate over a raw, un-validated signal object. */
export function triageSignals(raw: unknown): {
  active_scam: ActiveScam;
  interrupt: InterruptDecision;
} {
  const active_scam = validateActiveScam(raw);
  return { active_scam, interrupt: gate(active_scam) };
}

async function callGemini(text: string, now: Date): Promise<string> {
  const ai = getGemini();

  const config: Record<string, unknown> = {
    systemInstruction: TRIAGE_ONLY_INSTRUCTION,
    temperature: 0,
    responseMimeType: "application/json",
    responseSchema: triageResponseSchema(),
  };

  const parts = [
    {
      text: [
        `Current time: ${now.toISOString()} (${now.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })} IST). Resolve any relative timestamp against this.`,
        "",
        "What the person gave us:",
        text.trim(),
      ].join("\n"),
    },
  ];

  const response = await ai.models.generateContent({
    model: EXTRACT_MODEL,
    contents: [{ role: "user", parts }],
    config,
  });

  return response.text ?? "";
}

/**
 * Triage a description with the model, then run the identical gate the intake
 * runs. Throws on timeout or model failure — callers treat a triage failure as
 * "no interrupt", never as a reason to block the report.
 */
export async function triage(text: string, now: Date = new Date()): Promise<TriageResult> {
  if (!text.trim()) throw new Error("triage: needs some text");

  const startedAt = Date.now();
  const raw = await withTimeout(callGemini(text, now), EXTRACT_TIMEOUT_MS, "triage");
  const latency_ms = Date.now() - startedAt;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`triage: model did not return JSON (${raw.slice(0, 200)})`);
  }

  const active_scam = validateActiveScam(
    (parsed as { active_scam?: unknown })?.active_scam,
  );
  const summaryRaw = (parsed as { summary?: unknown })?.summary;

  return {
    active_scam,
    summary: typeof summaryRaw === "string" ? summaryRaw.trim() : "",
    interrupt: gate(active_scam),
    model: EXTRACT_MODEL,
    latency_ms,
  };
}
