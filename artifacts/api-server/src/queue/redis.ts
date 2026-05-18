import Redis from "ioredis";
import { logger } from "../lib/logger.js";

let shared: Redis | undefined;

export function getRedisUrl(): string | undefined {
  const url = process.env.REDIS_URL?.trim();
  return url || undefined;
}

export function isRedisQueueEnabled(): boolean {
  return !!getRedisUrl();
}

/** Ping Redis — used at startup and /health. */
export async function verifyRedisConnection(): Promise<boolean> {
  try {
    const conn = getRedisConnection();
    const pong = await conn.ping();
    return pong === "PONG";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ evt: "redis.ping_failed", message }, "Redis ping failed");
    return false;
  }
}

/** Shared ioredis connection for BullMQ + job result storage. */
export function getRedisConnection(): Redis {
  const url = getRedisUrl();
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }
  if (!shared) {
    shared = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    shared.on("error", (err) => {
      logger.error({ evt: "redis.error", message: err.message }, "Redis connection error");
    });
  }
  return shared;
}

export async function closeRedisConnection(): Promise<void> {
  if (shared) {
    await shared.quit();
    shared = undefined;
  }
}
