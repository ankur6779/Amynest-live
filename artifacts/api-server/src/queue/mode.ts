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

/** @internal Test-only reset of Redis bootstrap state between cases. */
export function resetQueueBootstrapStateForTests(): void {
  redisBootstrapOk = undefined;
}

export function markRedisBootstrapResult(ok: boolean): void {
  redisBootstrapOk = ok;
}

/** Production API must use BullMQ only when worker + Redis are enabled and healthy. */
export function mustUseBullMq(): boolean {
  return isProductionDeployment() && isWorkerEnabled();
}

function devInProcessFallback(): QueueMode {
  return "memory";
}

/**
 * Fail fast in production when BullMQ is not correctly configured.
 * Inline AI on web instances is disabled for launch safety.
 */
export function assertProductionQueueConfig(): void {
  if (!isProductionDeployment()) return;

  if (!isWorkerEnabled()) {
    throw new Error(
      "Production requires WORKER_ENABLED=true with REDIS_URL and a dedicated AI worker. Inline AI on API hosts is disabled.",
    );
  }

  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    throw new Error(
      "Production requires REDIS_URL when WORKER_ENABLED=true. Set REDIS_URL on API and worker services.",
    );
  }

  if (redisBootstrapOk === false) {
    throw new Error(
      "Production Redis bootstrap failed — BullMQ is required. Fix REDIS_URL connectivity before serving traffic.",
    );
  }
}

export function getQueueMode(): QueueMode {
  if (!isWorkerEnabled()) {
    if (isProductionDeployment()) {
      throw new Error(
        "Production requires WORKER_ENABLED=true. Inline AI on API hosts is disabled.",
      );
    }
    return devInProcessFallback();
  }

  if (isRedisMarkedUnstable()) {
    if (isProductionDeployment()) {
      throw new Error("REDIS_UNSTABLE cannot be set in production — BullMQ is required.");
    }
    return devInProcessFallback();
  }

  const redisUrl = getRedisUrl();
  if (redisUrl) {
    if (redisBootstrapOk === true) return "bullmq";
    if (redisBootstrapOk === false) {
      if (isProductionDeployment()) {
        throw new Error(
          "Redis ping failed in production — cannot fall back to inline AI processing.",
        );
      }
      return devInProcessFallback();
    }
    return devInProcessFallback();
  }

  if (mustUseBullMq()) {
    throw new Error(
      "REDIS_URL is required when WORKER_ENABLED=true in production. Set REDIS_URL on the API and Worker services.",
    );
  }

  return devInProcessFallback();
}

export function isBullMqActive(): boolean {
  return getQueueMode() === "bullmq";
}

/** Any background AI queue processing (BullMQ, dev memory, or prod inline drain). */
export function isQueueProcessingEnabled(): boolean {
  const mode = getQueueMode();
  return mode === "bullmq" || mode === "memory" || mode === "inline";
}

/** In-process drain on the API host (no Redis). Dev/test only in practice. */
export function isInProcessQueueMode(): boolean {
  const mode = getQueueMode();
  return mode === "memory" || mode === "inline";
}
