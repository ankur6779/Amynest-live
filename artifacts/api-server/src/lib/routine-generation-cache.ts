import { createHash } from "node:crypto";
import type { GenerateRoutineResponse } from "@workspace/api-zod";

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;

type CacheEntry = {
  body: GenerateRoutineResponse & { success?: boolean; fallback?: boolean };
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export function routineCacheKey(params: {
  userId: string;
  childId: number;
  date: string;
  mood?: string | null;
  hasSchool?: boolean;
  schoolMealMode?: string | null;
}): string {
  const raw = [
    params.userId,
    params.childId,
    params.date,
    params.mood ?? "normal",
    params.hasSchool ? "1" : "0",
    params.schoolMealMode ?? "",
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function getCachedRoutine(key: string): CacheEntry["body"] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.body;
}

export function setCachedRoutine(
  key: string,
  body: CacheEntry["body"],
): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { body, expiresAt: Date.now() + TTL_MS });
}

export function clearRoutineGenerationCache(): void {
  cache.clear();
}
