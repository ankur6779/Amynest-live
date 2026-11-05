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

/**
 * Atomic fixed-window incr that also heals keys left without a TTL.
 *
 * The previous INCR-then-PEXPIRE-only-when-count===1 split could leave
 * `rl:*` keys with TTL -1 after a crash/timeout between the two commands.
 * Later INCRs never re-armed expire (count!==1), so the user was stuck at
 * permanent 429 until ops deleted the key.
 */
export const FIXED_WINDOW_INCR_LUA = `
local c = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {c, ttl}
`;

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
      const raw = (await redis.eval(
        FIXED_WINDOW_INCR_LUA,
        1,
        redisKey,
        String(windowMs),
      )) as [number, number] | number[];
      const count = Number(raw[0]);
      const ttlMs = Number(raw[1]);
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
