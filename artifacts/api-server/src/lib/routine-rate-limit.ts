const WINDOW_MS = 60_000;
const MAX_GENERATIONS_PER_WINDOW = 5;

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export type RoutineRateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number };

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

export function clearRoutineRateLimits(): void {
  buckets.clear();
}
