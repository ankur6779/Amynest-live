const WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS ?? String(60_000));
const MAX_PER_WINDOW = Number(process.env.AI_RATE_LIMIT_MAX ?? "30");

const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

export function checkAiRateLimit(key: string): RateLimitResult {
  const id = key.trim() || "anonymous";
  const now = Date.now();
  let row = buckets.get(id);
  if (!row || row.resetAt <= now) {
    row = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(id, row);
  }
  if (row.count >= MAX_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, row.resetAt - now),
      remaining: 0,
    };
  }
  row.count += 1;
  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: MAX_PER_WINDOW - row.count,
  };
}

export function clearAiRateLimits(): void {
  buckets.clear();
}
