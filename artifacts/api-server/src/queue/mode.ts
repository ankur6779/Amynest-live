import { resolveAmynestEnv } from "../lib/loadEnv.js";
import { getRedisUrl } from "./redis.js";

export type QueueMode = "bullmq" | "memory";

export function isProductionDeployment(): boolean {
  return resolveAmynestEnv() === "production";
}

/** Production API must use BullMQ — never in-memory fallback. */
export function mustUseBullMq(): boolean {
  return isProductionDeployment();
}

export function getQueueMode(): QueueMode {
  const redisUrl = getRedisUrl();
  if (redisUrl) return "bullmq";
  if (mustUseBullMq()) {
    throw new Error(
      "REDIS_URL is required in production. Add a Render Redis instance and set REDIS_URL on the API and Worker services.",
    );
  }
  return "memory";
}

export function assertProductionQueueConfig(): void {
  getQueueMode();
}

export function isBullMqActive(): boolean {
  return getQueueMode() === "bullmq";
}
