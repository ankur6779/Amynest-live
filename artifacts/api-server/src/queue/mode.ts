import { resolveAmynestEnv } from "../lib/loadEnv.js";
import { getRedisUrl } from "./redis.js";

export type QueueMode = "bullmq" | "memory" | "off";

/** Set by queue bootstrap after a Redis ping (when worker + REDIS_URL are configured). */
let redisBootstrapOk: boolean | undefined;

export function isProductionDeployment(): boolean {
  return resolveAmynestEnv() === "production";
}

/**
 * BullMQ / Redis queue + worker processing.
 * Default: off in production, on in development unless explicitly set.
 */
export function isWorkerEnabled(): boolean {
  const raw = process.env["WORKER_ENABLED"]?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "on" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "off" || raw === "no") return false;
  return !isProductionDeployment();
}

/** Ops flag to skip Redis without unsetting REDIS_URL on the host. */
export function isRedisMarkedUnstable(): boolean {
  const raw = process.env["REDIS_UNSTABLE"]?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

export function markRedisBootstrapResult(ok: boolean): void {
  redisBootstrapOk = ok;
}

/** Production API must use BullMQ only when worker + Redis are enabled and healthy. */
export function mustUseBullMq(): boolean {
  return isProductionDeployment() && isWorkerEnabled();
}

export function getQueueMode(): QueueMode {
  if (!isWorkerEnabled()) return "off";
  if (isRedisMarkedUnstable()) return "off";
  if (redisBootstrapOk === false) return "off";

  const redisUrl = getRedisUrl();
  if (redisUrl) {
    if (redisBootstrapOk === true) return "bullmq";
    return "off";
  }

  if (mustUseBullMq()) {
    throw new Error(
      "REDIS_URL is required when WORKER_ENABLED=true in production. Set REDIS_URL on the API and Worker services, or set WORKER_ENABLED=false to disable the queue.",
    );
  }

  return isProductionDeployment() ? "off" : "memory";
}

export function assertProductionQueueConfig(): void {
  if (!isWorkerEnabled()) return;
  getQueueMode();
}

export function isBullMqActive(): boolean {
  return getQueueMode() === "bullmq";
}

/** Any background AI queue processing (BullMQ or dev in-memory drain). */
export function isQueueProcessingEnabled(): boolean {
  const mode = getQueueMode();
  return mode === "bullmq" || mode === "memory";
}
