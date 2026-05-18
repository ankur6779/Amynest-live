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

export function getQueueStats(): {
  activeCount: number;
  pendingCount: number;
  maxConcurrent: number;
  store: ReturnType<typeof jobStoreStats>;
} {
  return {
    activeCount,
    pendingCount: pending.length,
    maxConcurrent: MAX_CONCURRENT,
    store: jobStoreStats(),
  };
}

const payloadByJob = new Map<string, unknown>();

export function enqueueAiJob(
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
    {
      evt: "ai_job.enqueued",
      jobId: job.id,
      type,
      userId,
      queueDepth: pending.length,
    },
    "AI job enqueued",
  );

  scheduleDrain();

  return { jobId: job.id, status: "queued", deferred: false };
}

export function scheduleDrain(): void {
  if (draining) return;
  draining = true;
  setImmediate(() => {
    draining = false;
    void drainQueue();
  });
}

async function drainQueue(): Promise<void> {
  while (activeCount < MAX_CONCURRENT && pending.length > 0) {
    const jobId = pending.shift();
    if (!jobId) break;
    const job = getJob(jobId);
    if (!job || job.status !== "queued") continue;

    activeCount += 1;
    updateJob(jobId, { status: "processing" });

    void processOne(jobId).finally(() => {
      activeCount = Math.max(0, activeCount - 1);
      scheduleDrain();
    });
  }
}

async function processOne(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;

  const payload = payloadByJob.get(jobId);
  payloadByJob.delete(jobId);

  const timeout = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), JOB_TIMEOUT_MS),
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
      logger.warn({ evt: "ai_job.timeout", jobId, type: job.type }, "AI job timed out");
      return;
    }

    updateJob(jobId, { status: "completed", result });
    logger.info({ evt: "ai_job.completed", jobId, type: job.type }, "AI job completed");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateJob(jobId, { status: "failed", error: message.slice(0, 500) });
    logger.error(
      { evt: "ai_job.failed", jobId, type: job.type, message: message.slice(0, 300) },
      "AI job failed",
    );
  }
}

/** Test helper — reset queue state. */
export function resetAiJobQueue(): void {
  pending.length = 0;
  activeCount = 0;
  payloadByJob.clear();
}
