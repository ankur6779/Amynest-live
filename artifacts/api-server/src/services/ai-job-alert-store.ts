/**
 * Redis-backed sliding-window AI job failure counter (multi-instance safe).
 */
import { logger } from "../lib/logger.js";
import { emitAdminAlert } from "./admin-alert-system.js";
import { getRedisConnection, isRedisQueueEnabled } from "../queue/redis.js";

const WINDOW_MS = 5 * 60 * 1000;
const ALERT_THRESHOLD = Number(process.env.AI_JOB_FAILURE_ALERT_THRESHOLD ?? "8");
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;

const FAILURES_ZSET = "ai:job:failures";
const LAST_ALERT_KEY = "ai:job:failures:last_alert";

/** In-memory fallback when Redis unavailable (dev only). */
const localFailures: { at: number; type: string; jobId: string }[] = [];
let localLastAlertAt = 0;

async function pruneAndCount(now: number): Promise<number> {
  if (isRedisQueueEnabled()) {
    const redis = getRedisConnection();
    const cutoff = now - WINDOW_MS;
    await redis.zremrangebyscore(FAILURES_ZSET, 0, cutoff);
    return redis.zcard(FAILURES_ZSET);
  }
  while (localFailures.length > 0 && localFailures[0]!.at < now - WINDOW_MS) {
    localFailures.shift();
  }
  return localFailures.length;
}

export function recordAiJobFailure(
  type: string,
  jobId: string,
  message: string,
): void {
  void recordAiJobFailureAsync(type, jobId, message);
}

async function recordAiJobFailureAsync(
  type: string,
  jobId: string,
  message: string,
): Promise<void> {
  const now = Date.now();
  const member = `${now}:${jobId}:${type}`;

  if (isRedisQueueEnabled()) {
    const redis = getRedisConnection();
    await redis.zadd(FAILURES_ZSET, now, member);
    await redis.zremrangebyscore(FAILURES_ZSET, 0, now - WINDOW_MS);
  } else {
    localFailures.push({ at: now, type, jobId });
  }

  const count = await pruneAndCount(now);
  if (count < ALERT_THRESHOLD) return;

  let lastAlertAt = 0;
  if (isRedisQueueEnabled()) {
    const raw = await getRedisConnection().get(LAST_ALERT_KEY);
    lastAlertAt = raw ? Number(raw) : 0;
  } else {
    lastAlertAt = localLastAlertAt;
  }

  if (now - lastAlertAt < ALERT_COOLDOWN_MS) return;

  if (isRedisQueueEnabled()) {
    await getRedisConnection().set(LAST_ALERT_KEY, String(now), "PX", ALERT_COOLDOWN_MS);
  } else {
    localLastAlertAt = now;
  }

  void emitAdminAlert({
    severity: "warning",
    module: "api",
    issue: "AI job failure spike",
    metric: "aiJobFailures",
    value: count,
    actionTaken: "Inspect DLQ at GET /api/admin/dlq and worker logs",
  }).catch((err) => {
    logger.warn(
      { evt: "ai_job.alert_emit_failed", message: err instanceof Error ? err.message : String(err) },
      "failed to emit AI job failure alert",
    );
  });

  logger.error(
    {
      evt: "ai_job.failure_spike",
      count,
      windowMs: WINDOW_MS,
      latestType: type,
      latestJobId: jobId,
      message: message.slice(0, 200),
    },
    "AI job failure spike detected",
  );
}

/** Test-only reset. */
export async function resetAiJobAlertStoreForTests(): Promise<void> {
  localFailures.length = 0;
  localLastAlertAt = 0;
  if (isRedisQueueEnabled()) {
    const redis = getRedisConnection();
    await redis.del(FAILURES_ZSET, LAST_ALERT_KEY);
  }
}
