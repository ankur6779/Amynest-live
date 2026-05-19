import type { SynthesizeMode } from "./elevenLabsService.js";

export interface TtsPendingStream {
  text: string;
  voiceId: string;
  modelId: string;
  mode: SynthesizeMode;
  registeredAt: number;
}

const PENDING_TTL_MS = 120_000;
const pending = new Map<string, TtsPendingStream>();

function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of pending) {
    if (now - entry.registeredAt > PENDING_TTL_MS) pending.delete(key);
  }
}

export function registerTtsPending(cacheKey: string, entry: Omit<TtsPendingStream, "registeredAt">): void {
  pruneExpired();
  pending.set(cacheKey, { ...entry, registeredAt: Date.now() });
}

export function takeTtsPending(cacheKey: string): TtsPendingStream | null {
  pruneExpired();
  const entry = pending.get(cacheKey);
  if (!entry) return null;
  pending.delete(cacheKey);
  return entry;
}
