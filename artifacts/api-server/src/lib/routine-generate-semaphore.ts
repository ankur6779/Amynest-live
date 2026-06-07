import { getRedisConnection, getRedisUrl } from "../queue/redis.js";
import { isProductionDeployment } from "../queue/mode.js";
import { logger } from "./logger.js";

const DEFAULT_MAX_INFLIGHT = 40;
const DEFAULT_RETRY_AFTER_SEC = 30;
const DEFAULT_TTL_SEC = 120;

function maxInflight(): number {
  const n = Number(process.env.ROUTINE_GEN_MAX_INFLIGHT ?? String(DEFAULT_MAX_INFLIGHT));
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_INFLIGHT;
}

function retryAfterSec(): number {
  const n = Number(process.env.ROUTINE_GEN_BUSY_RETRY_SEC ?? String(DEFAULT_RETRY_AFTER_SEC));
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RETRY_AFTER_SEC;
}

function ttlSec(): number {
  const n = Number(process.env.ROUTINE_GEN_INFLIGHT_TTL_SEC ?? String(DEFAULT_TTL_SEC));
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_SEC;
}

function instanceKey(): string {
  return (
    process.env.RENDER_INSTANCE_ID?.trim() ||
    process.env.HOSTNAME?.trim() ||
    `local-${process.pid}`
  );
}

function redisKey(): string {
  return `routine-gen:inflight:${instanceKey()}`;
}

let memoryInflight = 0;

export type RoutineGenerateSlotResult =
  | { acquired: true }
  | { acquired: false; retryAfterSeconds: number };

export async function acquireRoutineGenerateSlot(): Promise<RoutineGenerateSlotResult> {
  const max = maxInflight();
  const retryAfterSeconds = retryAfterSec();

  const redisUrl = getRedisUrl();
  if (redisUrl) {
    try {
      const redis = getRedisConnection();
      const key = redisKey();
      const n = await redis.incr(key);
      if (n === 1) {
        await redis.expire(key, ttlSec());
      }
      if (n > max) {
        await redis.decr(key);
        return { acquired: false, retryAfterSeconds };
      }
      return { acquired: true };
    } catch (err) {
      logger.warn({ evt: "routine_gen.semaphore_redis_fail", err }, "Redis in-flight semaphore failed");
      if (isProductionDeployment()) {
        return { acquired: false, retryAfterSeconds };
      }
    }
  }

  if (memoryInflight >= max) {
    return { acquired: false, retryAfterSeconds };
  }
  memoryInflight += 1;
  return { acquired: true };
}

export async function releaseRoutineGenerateSlot(): Promise<void> {
  const redisUrl = getRedisUrl();
  if (redisUrl) {
    try {
      const redis = getRedisConnection();
      const key = redisKey();
      const n = await redis.decr(key);
      if (n <= 0) {
        await redis.del(key);
      }
      return;
    } catch (err) {
      logger.warn({ evt: "routine_gen.semaphore_release_fail", err }, "Redis in-flight release failed");
      if (isProductionDeployment()) {
        return;
      }
    }
  }

  memoryInflight = Math.max(0, memoryInflight - 1);
}

/** Test helper */
export function resetRoutineGenerateSemaphoreForTests(): void {
  memoryInflight = 0;
}
