import { COACH_QUEUE_TIMEOUT_MS } from "@workspace/coach-journey";
import { getRedisConnection, isRedisQueueEnabled } from "../queue/redis.js";
import { getJobForApi, isTerminalStatus } from "../queue/index.js";
import type { AiJobStatus } from "../queue/types.js";
import { logger } from "./logger.js";

/** In-flight coach initial win generation keyed by userId + goalId. */
export type CoachActiveGeneration = {
  userId: string;
  goalId: string;
  jobId: string;
  sessionId: string;
  planCacheKey: string;
  createdAt: number;
};

const TTL_SEC = Number(
  process.env.COACH_ACTIVE_GENERATION_TTL_SEC ??
    String(Math.ceil(COACH_QUEUE_TIMEOUT_MS / 1000) + 120),
);

const memoryActive = new Map<string, CoachActiveGeneration>();

function compositeKey(userId: string, goalId: string): string {
  return `${userId.trim()}:${goalId.trim()}`;
}

function redisKey(userId: string, goalId: string): string {
  return `coach:active_gen:${compositeKey(userId, goalId)}`;
}

async function readStored(userId: string, goalId: string): Promise<CoachActiveGeneration | undefined> {
  const ck = compositeKey(userId, goalId);
  if (isRedisQueueEnabled()) {
    const raw = await getRedisConnection().get(redisKey(userId, goalId));
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as CoachActiveGeneration;
    } catch {
      return undefined;
    }
  }
  return memoryActive.get(ck);
}

async function writeStored(record: CoachActiveGeneration, nx = false): Promise<boolean> {
  const payload = JSON.stringify(record);
  if (isRedisQueueEnabled()) {
    const key = redisKey(record.userId, record.goalId);
    if (nx) {
      const ok = await getRedisConnection().set(key, payload, "EX", TTL_SEC, "NX");
      return ok === "OK";
    }
    await getRedisConnection().set(key, payload, "EX", TTL_SEC);
    return true;
  }
  const ck = compositeKey(record.userId, record.goalId);
  if (nx && memoryActive.has(ck)) return false;
  memoryActive.set(ck, record);
  return true;
}

async function deleteStored(userId: string, goalId: string): Promise<void> {
  if (isRedisQueueEnabled()) {
    await getRedisConnection().del(redisKey(userId, goalId));
    return;
  }
  memoryActive.delete(compositeKey(userId, goalId));
}

const PENDING_ENQUEUE_GRACE_MS = 30_000;

/**
 * Returns active generation when job is still queued/processing.
 * Clears stale entries when the job record is missing or terminal.
 */
export async function findCoachActiveGeneration(
  userId: string,
  goalId: string,
): Promise<{ active: CoachActiveGeneration; jobStatus: AiJobStatus | "unknown" } | null> {
  const stored = await readStored(userId, goalId);
  if (!stored) return null;

  const job = await getJobForApi(stored.jobId);
  if (!job) {
    const ageMs = Date.now() - stored.createdAt;
    if (ageMs < PENDING_ENQUEUE_GRACE_MS) {
      return { active: stored, jobStatus: "unknown" };
    }
    await deleteStored(userId, goalId);
    return null;
  }
  if (isTerminalStatus(job.status)) {
    await deleteStored(userId, goalId);
    return null;
  }

  return { active: stored, jobStatus: job.status };
}

/**
 * Atomically claim userId+goalId for a new generation.
 * Concurrent taps reuse the winner's activeGeneration record.
 */
export async function claimCoachActiveGeneration(
  userId: string,
  goalId: string,
  draft: Pick<CoachActiveGeneration, "jobId" | "sessionId" | "planCacheKey">,
): Promise<{ active: CoachActiveGeneration; reused: boolean }> {
  const existing = await findCoachActiveGeneration(userId, goalId);
  if (existing) {
    return { active: existing.active, reused: true };
  }

  const record: CoachActiveGeneration = {
    userId,
    goalId,
    createdAt: Date.now(),
    ...draft,
  };

  const claimed = await writeStored(record, true);
  if (claimed) {
    return { active: record, reused: false };
  }

  const winner = await findCoachActiveGeneration(userId, goalId);
  if (winner) {
    return { active: winner.active, reused: true };
  }

  // Rare: key existed but job already terminal — overwrite and treat as new claim.
  await writeStored(record, false);
  return { active: record, reused: false };
}

export async function clearCoachActiveGeneration(userId: string, goalId: string): Promise<void> {
  await deleteStored(userId, goalId);
}

/** Called when ai-coach.initial_wins job reaches a terminal state. */
export async function clearCoachActiveGenerationForJob(payload: unknown): Promise<void> {
  try {
    const { unwrapJobPayload } = await import("../queue/ai-job-payload.js");
    const { pollContext } = unwrapJobPayload(payload);
    if (!pollContext || typeof pollContext !== "object") return;
    const ctx = pollContext as { userId?: string; goal?: string };
    if (ctx.userId && ctx.goal) {
      await clearCoachActiveGeneration(ctx.userId, ctx.goal);
    }
  } catch (err) {
    logger.warn(
      { err, evt: "coach_active_generation.clear_failed" },
      "failed to clear coach active generation",
    );
  }
}

export function resetCoachActiveGenerationForTests(): void {
  memoryActive.clear();
}
