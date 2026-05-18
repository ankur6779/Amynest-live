import type { Response } from "express";
import { enqueueAiJob, getQueueStats } from "../queue/ai-job-queue.js";
import { getJob, waitForJob, isTerminal } from "../queue/ai-job-store.js";
import type { AiJobType } from "../queue/types.js";
import { checkAiRateLimit } from "../utils/ai-rate-limit.js";
import { logger } from "./logger.js";

export const AI_HTTP_WAIT_MS = Number(process.env.AI_HTTP_WAIT_MS ?? "9_000");

export interface SubmitAiJobOptions {
  res: Response;
  userId: string;
  type: AiJobType;
  payload: unknown;
  /** If job completes within this window, respond 200 with `buildSyncBody`. */
  waitMs?: number;
  buildSyncBody: (result: unknown) => unknown;
  buildAsyncBody?: (jobId: string) => unknown;
  rateLimitKey?: string;
}

/**
 * Enqueue AI work and respond without blocking the event loop indefinitely.
 * Fast jobs (cache hits) usually finish within `waitMs` and keep the legacy JSON shape.
 */
export async function submitAiJobAndRespond(opts: SubmitAiJobOptions): Promise<void> {
  const waitMs = opts.waitMs ?? AI_HTTP_WAIT_MS;
  const rateKey = opts.rateLimitKey ?? opts.userId;

  const rate = checkAiRateLimit(rateKey);
  if (!rate.allowed) {
    opts.res.status(429).json({
      error: "rate_limit",
      retryAfterMs: rate.retryAfterMs,
    });
    return;
  }

  const enqueued = enqueueAiJob(opts.type, opts.userId, opts.payload);
  if (!enqueued.jobId) {
    opts.res.status(429).json({
      error: "ai_queue_busy",
      message: "Another AI request is in progress. Please wait.",
      retryAfterMs: enqueued.retryAfterMs ?? 2_000,
    });
    return;
  }

  const jobId = enqueued.jobId;
  const finished = await waitForJob(jobId, waitMs);
  if (finished && isTerminal(finished.status) && finished.status === "completed") {
    opts.res.json(opts.buildSyncBody(finished.result));
    return;
  }

  if (finished && isTerminal(finished.status) && finished.status !== "completed") {
    logger.warn(
      { evt: "ai_job.http_failed", jobId, status: finished.status, error: finished.error },
      "AI job failed before async response",
    );
    opts.res.status(502).json({
      error: finished.error ?? "ai_job_failed",
      jobId,
      status: finished.status,
      pollUrl: `/api/ai/jobs/${jobId}`,
    });
    return;
  }

  const asyncBody =
    opts.buildAsyncBody?.(jobId) ??
    ({
      jobId,
      status: "processing",
      pollUrl: `/api/ai/jobs/${jobId}`,
    });

  opts.res.status(202).json(asyncBody);
}

export function getAiQueueHealth(): Record<string, unknown> {
  return getQueueStats();
}

export function getJobForPoll(jobId: string, userId: string) {
  const job = getJob(jobId);
  if (!job) return { status: 404 as const };
  if (job.userId !== userId && job.userId !== "anonymous") {
    return { status: 403 as const };
  }
  return { status: 200 as const, job };
}
