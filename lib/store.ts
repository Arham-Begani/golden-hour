import { Redis } from "@upstash/redis";
import type { FreezePacket, Statement } from "./schema";

/**
 * Storage for freeze packets and the statements filed against them.
 *
 * Upstash when configured (HTTP-based, so it survives Vercel's serverless
 * model), an in-memory Map otherwise so local dev needs zero setup. Do not
 * swap this for SQLite: Vercel's filesystem is ephemeral, it would pass
 * locally and fail in the demo.
 *
 * Nothing here ever stores an uploaded image. Screenshots go through the
 * request into the model and are discarded.
 */

/** Packets expire on their own. Stated on the receipt. */
const TTL_SECONDS = 60 * 60 * 24;

/** How many dispatch timings the evidence page reads from. */
const TIMINGS_CAP = 200;

/**
 * Demo replays are capped lower than real runs. They are not evidence, and a
 * few scripted journey loops should not be able to crowd anything out.
 */
const DEMO_CAP = 50;

/**
 * Real human runs and demo replays are counted separately and never mixed.
 *
 * A demo replay serves a cached extraction and starts its clock at the fixture
 * click, so it measures confirm-page review time and nothing else. Averaging
 * those into the sixty-second claim would be the same fabrication that
 * data/portal-benchmark.json refuses for the portal column. The evidence page
 * reports "real" only.
 */
export type RunKind = "real" | "demo";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

export const storeBackend = redis ? "upstash" : "memory";

type Entry = { value: unknown; expiresAt: number };
const memory = new Map<string, Entry>();
const memoryTimings: Record<RunKind, number[]> = { real: [], demo: [] };

function memoryGet<T>(key: string): T | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value as T;
}

async function put(key: string, value: unknown): Promise<void> {
  if (redis) {
    await redis.set(key, JSON.stringify(value), { ex: TTL_SECONDS });
    return;
  }
  memory.set(key, { value, expiresAt: Date.now() + TTL_SECONDS * 1000 });
}

async function get<T>(key: string): Promise<T | null> {
  if (redis) {
    const raw = await redis.get<T | string>(key);
    if (raw == null) return null;
    // Upstash deserialises JSON for us when it can; tolerate both.
    return typeof raw === "string" ? (JSON.parse(raw) as T) : (raw as T);
  }
  return memoryGet<T>(key);
}

/* -------------------------------------------------------------------------- */
/* Acknowledgement numbers                                                    */
/* -------------------------------------------------------------------------- */

/**
 * No 0/O, no 1/I/L. This number gets read aloud down a phone line by someone
 * who has just lost money, so it must survive being said out loud.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function block(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

export function newAck(): string {
  return `GH-${block(4)}-${block(4)}`;
}

/* -------------------------------------------------------------------------- */

const packetKey = (ack: string) => `gh:packet:${ack}`;
const statementKey = (ack: string) => `gh:statement:${ack}`;
const timingsKey = (kind: RunKind) => `gh:timings:${kind}`;
const capFor = (kind: RunKind) => (kind === "real" ? TIMINGS_CAP : DEMO_CAP);

/**
 * The pre-split key. Deliberately never read.
 *
 * Whatever it holds was recorded before real and demo runs were told apart, so
 * its entries cannot be attributed to either. Migrating them into "real" would
 * assert something nobody observed; migrating them into "demo" would assert the
 * opposite. Both are guesses, and this project does not ship guesses. It is at
 * most 200 integers, so it costs nothing to leave alone.
 */
const LEGACY_TIMINGS_KEY = "gh:timings";
void LEGACY_TIMINGS_KEY;

export async function saveFreezePacket(packet: FreezePacket): Promise<void> {
  await put(packetKey(packet.ack), packet);
}

export async function getFreezePacket(ack: string): Promise<FreezePacket | null> {
  return get<FreezePacket>(packetKey(ack));
}

export async function saveStatement(ack: string, statement: Statement): Promise<void> {
  await put(statementKey(ack), statement);
}

export async function getStatement(ack: string): Promise<Statement | null> {
  return get<Statement>(statementKey(ack));
}

/* -------------------------------------------------------------------------- */
/* Dispatch timings — the measured half of the claim                          */
/* -------------------------------------------------------------------------- */

/** Record how long one run took from first interaction to dispatch. */
export async function recordTiming(elapsedMs: number, kind: RunKind): Promise<void> {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
  const key = timingsKey(kind);
  const cap = capFor(kind);
  if (redis) {
    await redis.lpush(key, elapsedMs);
    await redis.ltrim(key, 0, cap - 1);
    return;
  }
  memoryTimings[kind].unshift(elapsedMs);
  memoryTimings[kind].length = Math.min(memoryTimings[kind].length, cap);
}

/** Every recorded run of one kind. The evidence page shows the distribution, not a boast. */
export async function getTimings(kind: RunKind): Promise<number[]> {
  const cap = capFor(kind);
  if (redis) {
    const raw = await redis.lrange<number | string>(timingsKey(kind), 0, cap - 1);
    return raw.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  }
  return [...memoryTimings[kind]];
}

/* -------------------------------------------------------------------------- */
/* Reachability                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Round-trip a throwaway key to prove the store actually works.
 *
 * storeBackend only reports whether the two env vars are PRESENT. A wrong or
 * expired token still reads as "upstash", and then every receipt 404s in
 * production while /api/health insists it is ready. That failure is invisible
 * until someone opens a receipt, which is the worst possible moment to find it.
 *
 * The probe writes with a short TTL, so a crash between set and delete cleans
 * up after itself rather than leaking keys.
 */
export async function probeStore(): Promise<{
  ok: boolean;
  backend: typeof storeBackend;
  error: string | null;
}> {
  if (!redis) return { ok: false, backend: storeBackend, error: null };

  const key = `gh:probe:${Math.random().toString(36).slice(2)}`;
  try {
    await redis.set(key, "1", { ex: 30 });
    const value = await redis.get<string | number>(key);
    await redis.del(key);
    return {
      ok: String(value) === "1",
      backend: storeBackend,
      error: String(value) === "1" ? null : `probe read back ${JSON.stringify(value)}`,
    };
  } catch (error) {
    return {
      ok: false,
      backend: storeBackend,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
