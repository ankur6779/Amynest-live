import { resolveAmynestEnv } from "../lib/loadEnv.js";
import { getRedisUrl } from "./redis.js";

export type QueueMode = "bullmq" | "memory" | "inline" | "off";

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

function inProcessFallback(): QueueMode {
  return isProductionDeployment() ? "inline" : "memory";
}

export function getQueueMode(): QueueMode {
  if (!isWorkerEnabled()) {
    // External BullMQ worker disabled — API still runs OpenAI/ElevenLabs in-process.
    return inProcessFallback();
  }
  if (isRedisMarkedUnstable()) return inProcessFallback();

  const redisUrl = getRedisUrl();
  if (redisUrl) {
    if (redisBootstrapOk === true) return "bullmq";
    // Redis missing, bootstrapping, or ping failed — never leave production dead.
    if (redisBootstrapOk === false) return inProcessFallback();
    return inProcessFallback();
  }

  if (mustUseBullMq()) {
    throw new Error(
      "REDIS_URL is required when WORKER_ENABLED=true in production. Set REDIS_URL on the API and Worker services, or set WORKER_ENABLED=false to disable the queue.",
    );
  }

  return inProcessFallback();
}

export function assertProductionQueueConfig(): void {
  if (!isWorkerEnabled()) return;
  getQueueMode();
}

export function isBullMqActive(): boolean {
  return getQueueMode() === "bullmq";
}

/** Any background AI queue processing (BullMQ, dev memory, or prod inline drain). */
export function isQueueProcessingEnabled(): boolean {
  const mode = getQueueMode();
  return mode === "bullmq" || mode === "memory" || mode === "inline";
}

/** In-process drain on the API host (no Redis). */
export function isInProcessQueueMode(): boolean {
  const mode = getQueueMode();
  return mode === "memory" || mode === "inline";
}
