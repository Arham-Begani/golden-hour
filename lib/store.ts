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

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

export const storeBackend = redis ? "upstash" : "memory";

type Entry = { value: unknown; expiresAt: number };
const memory = new Map<string, Entry>();
const memoryTimings: number[] = [];

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
const TIMINGS_KEY = "gh:timings";

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
export async function recordTiming(elapsedMs: number): Promise<void> {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
  if (redis) {
    await redis.lpush(TIMINGS_KEY, elapsedMs);
    await redis.ltrim(TIMINGS_KEY, 0, TIMINGS_CAP - 1);
    return;
  }
  memoryTimings.unshift(elapsedMs);
  memoryTimings.length = Math.min(memoryTimings.length, TIMINGS_CAP);
}

/** Every recorded run. The evidence page shows the distribution, not a boast. */
export async function getTimings(): Promise<number[]> {
  if (redis) {
    const raw = await redis.lrange<number | string>(TIMINGS_KEY, 0, TIMINGS_CAP - 1);
    return raw.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  }
  return [...memoryTimings];
}
