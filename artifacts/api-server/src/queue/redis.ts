import Redis from "ioredis";
import { logger } from "../lib/logger.js";

const REDIS_CONNECT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? "5000");
const REDIS_COMMAND_MS = Number(process.env.REDIS_COMMAND_TIMEOUT_MS ?? "5000");

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
    const pong = await Promise.race([
      conn.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("redis ping timeout")), REDIS_CONNECT_MS),
      ),
    ]);
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
      // BullMQ workers need null; API uses commandTimeout to avoid hung commands.
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
      connectTimeout: REDIS_CONNECT_MS,
      commandTimeout: REDIS_COMMAND_MS,
      retryStrategy: (times) => (times > 1 ? null : Math.min(times * 200, 800)),
      enableOfflineQueue: false,
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
