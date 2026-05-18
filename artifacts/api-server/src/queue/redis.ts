import Redis from "ioredis";
import { logger } from "../lib/logger.js";

const REDIS_CONNECT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? "5000");
const REDIS_COMMAND_MS = Number(process.env.REDIS_COMMAND_TIMEOUT_MS ?? "5000");
const REDIS_MAX_RECONNECT = Number(process.env.REDIS_MAX_RECONNECT_ATTEMPTS ?? "30");

let shared: Redis | undefined;

function waitForRedisReady(conn: Redis, timeoutMs: number): Promise<void> {
  if (conn.status === "ready") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("redis connect timeout"));
    }, timeoutMs);

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timer);
      conn.removeListener("ready", onReady);
      conn.removeListener("error", onError);
    };

    conn.once("ready", onReady);
    conn.once("error", onError);

    if (conn.status === "wait" || conn.status === "end") {
      void conn.connect().catch(onError);
    }
  });
}

function resetRedisConnection(): void {
  if (!shared) return;
  try {
    shared.disconnect();
  } catch {
    /* ignore */
  }
  shared = undefined;
}

export function getRedisUrl(): string | undefined {
  const url = process.env.REDIS_URL?.trim();
  return url || undefined;
}

export function isRedisQueueEnabled(): boolean {
  return !!getRedisUrl();
}

/** Ping Redis — used at startup and /health. */
export async function verifyRedisConnection(): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const conn = getRedisConnection();
      await waitForRedisReady(conn, REDIS_CONNECT_MS);
      const pong = await Promise.race([
        conn.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("redis ping timeout")), REDIS_COMMAND_MS),
        ),
      ]);
      return pong === "PONG";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === 0) {
        logger.warn({ evt: "redis.ping_retry", message, attempt }, "Redis ping failed — retrying");
        resetRedisConnection();
        continue;
      }
      logger.error({ evt: "redis.ping_failed", message }, "Redis ping failed");
      return false;
    }
  }
  return false;
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
      retryStrategy: (times) =>
        times > REDIS_MAX_RECONNECT ? null : Math.min(times * 250, 5000),
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
