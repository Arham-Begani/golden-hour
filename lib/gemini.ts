import { GoogleGenAI } from "@google/genai";

/**
 * Gemini client. The key lives only in server routes — it is never shipped to
 * the browser.
 *
 * Two tiers, both free-tier eligible and both vision-capable:
 *   gemini-3.5-flash-lite  cheap and fast, the default
 *   gemini-3.7-flash       escalation if OCR on cracked-screen photos struggles
 *
 * Swapping is an env change and a redeploy, never a code change.
 */

export const EXTRACT_MODEL = process.env.GEMINI_MODEL_EXTRACT ?? "gemini-3.5-flash-lite";

/** Past this, we stop waiting and hand the user a manual form. The clock wins. */
export const EXTRACT_TIMEOUT_MS = Number(process.env.EXTRACT_TIMEOUT_MS ?? 12_000);

let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local and to the Vercel project env.",
    );
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Reject after `ms` regardless of what the network is doing. A partial packet
 * sent at 60 seconds beats a complete one sent at fourteen minutes, so a slow
 * model must degrade to manual entry rather than hold the user hostage.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
