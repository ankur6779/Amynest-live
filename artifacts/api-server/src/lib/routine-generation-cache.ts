import { createHash } from "node:crypto";
import { GenerateRoutineResponse } from "@workspace/api-zod";
import type { z } from "zod/v4";

type GenerateRoutineResponseBody = z.infer<typeof GenerateRoutineResponse>;

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;

type CacheEntry = {
  body: GenerateRoutineResponseBody & { success?: boolean; fallback?: boolean };
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export function hashRoutineContextFragment(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 12);
}

export function routineCacheKey(params: {
  userId: string;
  childId: number;
  date: string;
  mood?: string | null;
  hasSchool?: boolean;
  schoolMealMode?: string | null;
  weatherOutdoor?: string | null;
  wakeTime?: string | null;
  sleepTime?: string | null;
  sleepQuality?: string | null;
  aqi?: number | null;
  fridgeItems?: string | null;
  fixedActivities?: unknown;
}): string {
  const raw = [
    params.userId,
    params.childId,
    params.date,
    params.mood ?? "normal",
    params.hasSchool ? "1" : "0",
    params.schoolMealMode ?? "",
    params.weatherOutdoor ?? "",
    params.wakeTime ?? "",
    params.sleepTime ?? "",
    params.sleepQuality ?? "",
    params.aqi != null ? String(Math.round(params.aqi)) : "",
    hashRoutineContextFragment(params.fridgeItems),
    hashRoutineContextFragment(JSON.stringify(params.fixedActivities ?? [])),
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
