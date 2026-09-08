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
const memoryTimings: Record<RunKind, TimingEntry[]> = { real: [], demo: [] };

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

/**
 * One recorded run.
 *
 * Until 8 September this list held bare integers, and that turned out to be the
 * expensive kind of shortcut. Five real runs arrived in two obvious clusters —
 * three around ten seconds, two around a minute — and the site had recorded
 * nothing that could tell anyone why. It could not say when they happened, or
 * whether the person had corrected a single field before sending. A number with
 * no provenance can be published honestly but it cannot be *explained*, and the
 * explanation is the part a reader actually wants.
 *
 * Every field here is observed server-side from the request that was already
 * arriving. Nothing is inferred, and nothing new is asked of the person filing.
 */
export type TimingEntry = {
  /** First interaction to dispatch. */
  ms: number;
  /** When it was recorded. Null for the entries written before this existed. */
  at: string | null;
  /**
   * How the fields got there: extracted by the model, typed by hand, or served
   * from a fixture. Null for entries that predate this field.
   */
  source: "model" | "manual" | "fixture" | null;
  /** How many fields the person corrected before sending. Null if unrecorded. */
  corrected: number | null;
};

/** What a caller may attach to a run. Absent fields are recorded as unknown, never as zero. */
export type TimingProvenance = {
  source?: TimingEntry["source"];
  corrected?: number | null;
};

/**
 * Parse whatever is on the list, old shape or new.
 *
 * Three things can come back: an integer from before 8 September, the same
 * integer as a string, or a JSON entry. Upstash deserialises JSON for us when
 * it can, so the object arrives either parsed or as text. An entry that cannot
 * be read as any of those is dropped rather than coerced — a run that cannot be
 * read is not a fast run, the same rule `/api/freeze` applies to a lost clock.
 */
export function parseTimingEntry(raw: unknown): TimingEntry | null {
  const bare = (ms: unknown): TimingEntry | null => {
    const value = Number(ms);
    return Number.isFinite(value) && value > 0
      ? { ms: value, at: null, source: null, corrected: null }
      : null;
  };

  if (typeof raw === "number") return bare(raw);

  let value = raw;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("{")) return bare(trimmed);
    try {
      value = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const ms = Number(entry.ms);
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const source = entry.source;
  const corrected = Number(entry.corrected);

  return {
    ms,
    at: typeof entry.at === "string" ? entry.at : null,
    source:
      source === "model" || source === "manual" || source === "fixture" ? source : null,
    corrected: Number.isFinite(corrected) && corrected >= 0 ? corrected : null,
  };
}

/** Record how long one run took from first interaction to dispatch. */
export async function recordTiming(
  elapsedMs: number,
  kind: RunKind,
  provenance: TimingProvenance = {},
): Promise<void> {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;

  const entry: TimingEntry = {
    ms: elapsedMs,
    at: new Date().toISOString(),
    source: provenance.source ?? null,
    corrected:
      typeof provenance.corrected === "number" && provenance.corrected >= 0
        ? provenance.corrected
        : null,
  };

  const key = timingsKey(kind);
  const cap = capFor(kind);
  if (redis) {
    await redis.lpush(key, JSON.stringify(entry));
    await redis.ltrim(key, 0, cap - 1);
    return;
  }
  memoryTimings[kind].unshift(entry);
  memoryTimings[kind].length = Math.min(memoryTimings[kind].length, cap);
}

/**
 * Every recorded run of one kind, newest first, with whatever provenance it
 * carries. The evidence page shows the distribution, not a boast.
 */
export async function getTimingEntries(kind: RunKind): Promise<TimingEntry[]> {
  const cap = capFor(kind);
  if (redis) {
    const raw = await redis.lrange<unknown>(timingsKey(kind), 0, cap - 1);
    return raw
      .map(parseTimingEntry)
      .filter((entry): entry is TimingEntry => entry !== null);
  }
  return [...memoryTimings[kind]];
}

/** The durations alone, for callers that only plot them. */
export async function getTimings(kind: RunKind): Promise<number[]> {
  return (await getTimingEntries(kind)).map((entry) => entry.ms);
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
