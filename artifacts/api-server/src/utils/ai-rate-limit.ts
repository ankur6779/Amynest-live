import {
  checkDistributedRateLimit,
  clearDistributedRateLimits,
  type RateLimitOptions,
  type RateLimitResult,
} from "../lib/distributed-rate-limit.js";

export type { RateLimitOptions, RateLimitResult };

const WINDOW_MS = Number(process.env.AI_RATE_LIMIT_WINDOW_MS ?? String(60_000));
const MAX_PER_WINDOW = Number(process.env.AI_RATE_LIMIT_MAX ?? "30");

const buckets = new Map<string, { count: number; resetAt: number }>();

/** In-memory rate limit — used in unit tests and as dev fallback. */
export function checkAiRateLimit(key: string, options?: RateLimitOptions): RateLimitResult {
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const maxPerWindow = options?.maxPerWindow ?? MAX_PER_WINDOW;
  const id = options
    ? `${key.trim() || "anonymous"}|w=${windowMs}|m=${maxPerWindow}`
    : key.trim() || "anonymous";
  const now = Date.now();
  let row = buckets.get(id);
  if (!row || row.resetAt <= now) {
    row = { count: 0, resetAt: now + windowMs };
    buckets.set(id, row);
  }
  if (row.count >= maxPerWindow) {
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
    remaining: maxPerWindow - row.count,
  };
}

/** Production path — Redis-backed, shared across API instances. */
export async function checkAiRateLimitAsync(
  key: string,
  options?: RateLimitOptions,
): Promise<RateLimitResult> {
  return checkDistributedRateLimit(key, options);
}

export function clearAiRateLimits(): void {
  buckets.clear();
  clearDistributedRateLimits();
}
