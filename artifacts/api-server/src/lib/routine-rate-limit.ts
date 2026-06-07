import {
  checkDistributedRateLimit,
  clearDistributedRateLimits,
  type RateLimitResult,
} from "./distributed-rate-limit.js";

const WINDOW_MS = 60_000;
const MAX_GENERATIONS_PER_WINDOW = 5;

type Bucket = { timestamps: number[] };
const buckets = new Map<string, Bucket>();

/** In-memory — unit tests and dev fallback. */
export function checkRoutineGenerationRateLimit(userId: string): RoutineRateLimitResult {
  const now = Date.now();
  const key = userId.trim() || "anonymous";
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);

  if (bucket.timestamps.length >= MAX_GENERATIONS_PER_WINDOW) {
    const oldest = bucket.timestamps[0] ?? now;
    return { allowed: false, retryAfterMs: Math.max(0, WINDOW_MS - (now - oldest)) };
  }

  bucket.timestamps.push(now);
  return {
    allowed: true,
    remaining: MAX_GENERATIONS_PER_WINDOW - bucket.timestamps.length,
  };
}

export type RoutineRateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number };

/** Production path — Redis-backed routine generation cap. */
export async function checkRoutineGenerationRateLimitAsync(
  userId: string,
): Promise<RoutineRateLimitResult> {
  const result: RateLimitResult = await checkDistributedRateLimit(
    `routine-gen:${userId.trim() || "anonymous"}`,
    { windowMs: WINDOW_MS, maxPerWindow: MAX_GENERATIONS_PER_WINDOW },
  );
  if (!result.allowed) {
    return { allowed: false, retryAfterMs: result.retryAfterMs };
  }
  return { allowed: true, remaining: result.remaining };
}

export function clearRoutineRateLimits(): void {
  buckets.clear();
  clearDistributedRateLimits();
}
