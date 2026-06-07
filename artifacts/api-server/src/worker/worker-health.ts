import {
  isBullMqActive,
  isRedisMarkedUnstable,
  isWorkerEnabled,
} from "../queue/mode.js";
import { isRedisQueueEnabled, verifyRedisConnection } from "../queue/redis.js";
import { isBullMqWorkerRegistered } from "./bullmq-worker.js";

export type WorkerHealthSnapshot = {
  ok: boolean;
  workerEnabled: boolean;
  redisConfigured: boolean;
  redisPingOk: boolean;
  bullMqActive: boolean;
  consumerRegistered: boolean;
  memoryDrainActive: boolean;
  idleReason: string | null;
  reasons: string[];
};

let idleReason: string | null = null;
let memoryDrainActive = false;

/** Called when worker intentionally idles (no BullMQ consumer). */
export function markWorkerIdle(reason: string): void {
  idleReason = reason;
  memoryDrainActive = false;
}

/** Dev-only in-process memory queue drain. */
export function markMemoryDrainActive(active: boolean): void {
  memoryDrainActive = active;
  if (active) idleReason = null;
}

export function clearWorkerIdleReason(): void {
  idleReason = null;
}

/**
 * Worker /health must fail when the process cannot consume queued jobs.
 * Proves Redis reachability and an active consumer (BullMQ or dev memory drain).
 */
export async function getWorkerHealthSnapshot(): Promise<WorkerHealthSnapshot> {
  const reasons: string[] = [];

  if (!isWorkerEnabled()) {
    reasons.push("WORKER_ENABLED=false");
  }
  if (isRedisMarkedUnstable()) {
    reasons.push("REDIS_UNSTABLE=true");
  }

  const redisConfigured = isRedisQueueEnabled();
  let redisPingOk = false;
  if (redisConfigured) {
    try {
      redisPingOk = await verifyRedisConnection();
    } catch {
      redisPingOk = false;
    }
    if (!redisPingOk) {
      reasons.push("redis_ping_failed");
    }
  } else if (isWorkerEnabled() && !memoryDrainActive) {
    reasons.push("REDIS_URL_not_configured");
  }

  const bullMqActive = isBullMqActive();
  const consumerRegistered = isBullMqWorkerRegistered();
  const canConsume =
    (bullMqActive && consumerRegistered) || (!bullMqActive && memoryDrainActive);

  if (isWorkerEnabled() && !idleReason && !canConsume) {
    reasons.push("no_active_consumer");
  }
  if (idleReason) {
    reasons.push(idleReason);
  }

  const ok =
    isWorkerEnabled() &&
    !isRedisMarkedUnstable() &&
    !idleReason &&
    canConsume &&
    (redisConfigured ? redisPingOk : memoryDrainActive);

  return {
    ok,
    workerEnabled: isWorkerEnabled(),
    redisConfigured,
    redisPingOk,
    bullMqActive,
    consumerRegistered,
    memoryDrainActive,
    idleReason,
    reasons,
  };
}
