import { getRedisConnection, getRedisUrl } from "../queue/redis.js";
import { isProductionDeployment } from "../queue/mode.js";
import { logger } from "./logger.js";

export interface RateLimitOptions {
  windowMs?: number;
  maxPerWindow?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

type MemoryBucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, MemoryBucket>();

function memoryRateLimit(
  key: string,
  windowMs: number,
  maxPerWindow: number,
): RateLimitResult {
  const id = `${key.trim() || "anonymous"}|w=${windowMs}|m=${maxPerWindow}`;
  const now = Date.now();
  let row = memoryBuckets.get(id);
  if (!row || row.resetAt <= now) {
    row = { count: 0, resetAt: now + windowMs };
    memoryBuckets.set(id, row);
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

/**
 * Redis-backed fixed-window rate limit (shared across API instances).
 * Falls back to in-memory when Redis is unavailable (local dev only).
 */
export async function checkDistributedRateLimit(
  key: string,
  options?: RateLimitOptions,
): Promise<RateLimitResult> {
  const windowMs = options?.windowMs ?? Number(process.env.AI_RATE_LIMIT_WINDOW_MS ?? String(60_000));
  const maxPerWindow = options?.maxPerWindow ?? Number(process.env.AI_RATE_LIMIT_MAX ?? "30");
  const redisKey = `rl:${key.trim() || "anonymous"}:w${windowMs}:m${maxPerWindow}`;

  const redisUrl = getRedisUrl();
  if (redisUrl) {
    try {
      const redis = getRedisConnection();
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, windowMs);
      }
      const ttlMs = await redis.pttl(redisKey);
      if (count > maxPerWindow) {
        return {
          allowed: false,
          retryAfterMs: Math.max(0, ttlMs > 0 ? ttlMs : windowMs),
          remaining: 0,
        };
      }
      return {
        allowed: true,
        retryAfterMs: 0,
        remaining: Math.max(0, maxPerWindow - count),
      };
    } catch (err) {
      logger.warn(
        { evt: "rate_limit.redis_fallback", key: redisKey, err },
        "Redis rate limit failed — using in-memory fallback",
      );
      if (isProductionDeployment()) {
        return {
          allowed: false,
          retryAfterMs: windowMs,
          remaining: 0,
        };
      }
    }
  }

  return memoryRateLimit(key, windowMs, maxPerWindow);
}

export function clearDistributedRateLimits(): void {
  memoryBuckets.clear();
}
