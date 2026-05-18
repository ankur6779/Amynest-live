/**
 * In-process AI queue — used when REDIS_URL is not set (local dev only).
 */
import { logger } from "../lib/logger.js";
import { AI_CHAT_TIMEOUT_MS } from "../services/openai-chat.js";
import {
  createJob,
  getJob,
  listActiveJobsForUser,
  updateJob,
  jobStoreStats,
} from "./ai-job-store.js";
import type { AiJobType, EnqueueResult } from "./types.js";

const MAX_CONCURRENT = Number(process.env.AI_MAX_CONCURRENT_JOBS ?? "3");
const MAX_QUEUED_PER_USER = Number(process.env.AI_MAX_QUEUED_PER_USER ?? "1");
const JOB_TIMEOUT_MS = Number(process.env.AI_JOB_TIMEOUT_MS ?? String(AI_CHAT_TIMEOUT_MS));

const pending: string[] = [];
let activeCount = 0;
let draining = false;
const payloadByJob = new Map<string, unknown>();

export function getMemoryQueueStats() {
  return {
    activeCount,
    pendingCount: pending.length,
    maxConcurrent: MAX_CONCURRENT,
    store: jobStoreStats(),
    mode: "memory" as const,
  };
}

export function enqueueMemoryJob(
  type: AiJobType,
  userId: string,
  payload: unknown,
): EnqueueResult {
  const active = listActiveJobsForUser(userId);
  const queuedForUser = active.filter((j) => j.status === "queued").length;
  const processingForUser = active.filter((j) => j.status === "processing").length;

  if (processingForUser >= 1 && queuedForUser >= MAX_QUEUED_PER_USER) {
    return {
      jobId: "",
      status: "failed",
      deferred: true,
      retryAfterMs: 2_000,
    };
  }

  const job = createJob(type, userId);
  pending.push(job.id);
  payloadByJob.set(job.id, payload);

  logger.info(
    { evt: "ai_job.memory_enqueued", jobId: job.id, type, userId },
    "AI job enqueued (memory)",
  );

  scheduleMemoryDrain();
  return { jobId: job.id, status: "queued", deferred: false };
}

export function scheduleMemoryDrain(): void {
  if (draining) return;
  draining = true;
  setImmediate(() => {
    draining = false;
    void drainMemoryQueue();
  });
}

async function drainMemoryQueue(): Promise<void> {
  while (activeCount < MAX_CONCURRENT && pending.length > 0) {
    const jobId = pending.shift();
    if (!jobId) break;
    const job = getJob(jobId);
    if (!job || job.status !== "queued") continue;

    activeCount += 1;
    updateJob(jobId, { status: "processing" });

    void processMemoryJob(jobId).finally(() => {
      activeCount = Math.max(0, activeCount - 1);
      scheduleMemoryDrain();
    });
  }
}

async function processMemoryJob(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;

  const payload = payloadByJob.get(jobId);
  payloadByJob.delete(jobId);

  const timeoutMs = Number.isFinite(JOB_TIMEOUT_MS) ? JOB_TIMEOUT_MS : 10_000;
  const timeout = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), timeoutMs),
  );

  try {
    const { runAiJobHandler } = await import("../services/ai-job-handlers.js");
    const result = await Promise.race([
      runAiJobHandler(job.type, payload),
      timeout,
    ]);

    if (result === "timeout") {
      updateJob(jobId, {
        status: "timed_out",
        timedOut: true,
        error: "AI job timed out",
      });
      return;
    }

    updateJob(jobId, { status: "completed", result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateJob(jobId, { status: "failed", error: message.slice(0, 500) });
  }
}

export function resetMemoryQueue(): void {
  pending.length = 0;
  activeCount = 0;
  payloadByJob.clear();
}
