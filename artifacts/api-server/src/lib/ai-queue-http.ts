import type { Response } from "express";
import {
  enqueueAiJob,
  getQueueStats,
  isBullMqActive,
  isInProcessQueueMode,
} from "../queue/ai-job-queue.js";
import { waitForJob } from "../queue/ai-job-store.js";
import { getJobForApi, waitForJobResult, isTerminalStatus } from "../queue/index.js";
import { isProductionDeployment } from "../queue/mode.js";
import type { AiJobType } from "../queue/types.js";
import { checkAiRateLimitAsync, type RateLimitOptions } from "../utils/ai-rate-limit.js";
import { parseEnvMs } from "./env.js";
import { logger } from "./logger.js";
import { resolveSyncApiBody } from "./ai-job-finalize.js";
import { sendStaticAudioAlert } from "../services/staticAudioAlerts.js";
import { isRedisClosedError } from "../queue/redis.js";

export { isTerminalStatus as isTerminal };

/** Inline/memory queue: wait for job completion before responding (ms). */
export const AI_HTTP_WAIT_MS = parseEnvMs("AI_HTTP_WAIT_MS", 30_000);

/** BullMQ: max wait before 202 (set AI_HTTP_WAIT_MS=0 for immediate async). */
const BULLMQ_HTTP_WAIT_MS = parseEnvMs("AI_HTTP_WAIT_MS", 2_500);

function resolveHttpWaitMs(explicit?: number): number {
  if (explicit !== undefined) return explicit;
  if (isBullMqActive()) {
    return isProductionDeployment() ? 0 : BULLMQ_HTTP_WAIT_MS;
  }
  return AI_HTTP_WAIT_MS;
}

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
  /** Override default AI enqueue rate limit (30/min). TTS routes use a higher cap. */
  rateLimitOptions?: RateLimitOptions;
  /** BullMQ job id — dedupes concurrent enqueues for the same logical work unit. */
  deterministicJobId?: string;
}

async function respondQueueUnavailable(
  opts: SubmitAiJobOptions,
  code?: string,
): Promise<void> {
  logger.error(
    { evt: "ai_queue.unavailable", type: opts.type, userId: opts.userId, code },
    "AI queue unavailable — refusing inline execution on API tier",
  );
  if (isProductionDeployment()) {
    void sendStaticAudioAlert("ai_queue_unavailable", {
      type: opts.type,
      userId: opts.userId,
      code,
    });
  }
  opts.res.status(503).json({
    error: code === "job_records_disabled" ? "job_records_disabled" : "ai_queue_unavailable",
    message:
      code === "job_records_disabled"
        ? "AI job tracking is temporarily disabled. Please try again shortly."
        : "AI processing is temporarily unavailable. Please try again shortly.",
    code,
  });
}

/**
 * Enqueue AI work and respond without blocking the event loop indefinitely.
 * Fast jobs (cache hits) usually finish within `waitMs` and keep the legacy JSON shape.
 */
export async function submitAiJobAndRespond(opts: SubmitAiJobOptions): Promise<void> {
  const waitMs = resolveHttpWaitMs(opts.waitMs);
  const rateKey = opts.rateLimitKey ?? opts.userId;

  const rate = await checkAiRateLimitAsync(rateKey, opts.rateLimitOptions);
  if (!rate.allowed) {
    opts.res.status(429).json({
      error: "rate_limit",
      retryAfterMs: rate.retryAfterMs,
    });
    return;
  }

  if (isInProcessQueueMode()) {
    if (isProductionDeployment()) {
      await respondQueueUnavailable(opts);
      return;
    }
    const { runAiJobHandler } = await import("../services/ai-job-handlers.js");
    try {
      const result = await runAiJobHandler(opts.type, opts.payload);
      const body = await resolveSyncApiBody({
        rawResult: result,
        payload: opts.payload,
        userId: opts.userId,
        buildSyncBody: opts.buildSyncBody,
      });
      opts.res.json(body);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { evt: "ai_job.inline_failed", type: opts.type, message: message.slice(0, 300) },
        "In-process AI job failed",
      );
      opts.res.status(502).json({
        error: "ai_job_failed",
        message: message.slice(0, 300),
      });
      return;
    }
  }

  let enqueued;
  try {
    enqueued = await enqueueAiJob(opts.type, opts.userId, opts.payload, {
      deterministicJobId: opts.deterministicJobId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      { evt: "ai_job.enqueue_threw", type: opts.type, message: message.slice(0, 300) },
      "AI enqueue threw",
    );
    if (isRedisClosedError(err) || /redis/i.test(message)) {
      await respondQueueUnavailable(opts, "redis_unavailable");
      return;
    }
    throw err;
  }
  if (!enqueued.jobId) {
    const queueUnavailable = (enqueued.retryAfterMs ?? 0) === 0;
    if (queueUnavailable) {
      await respondQueueUnavailable(opts, enqueued.error);
      return;
    }
    opts.res.status(429).json({
      error: "ai_queue_busy",
      message: "Another AI request is in progress. Please wait.",
      retryAfterMs: enqueued.retryAfterMs ?? 2_000,
    });
    return;
  }

  const jobId = enqueued.jobId;
  const finished = isBullMqActive()
    ? await waitForJobResult(jobId, waitMs)
    : await waitForJob(jobId, waitMs);
  if (finished && isTerminalStatus(finished.status) && finished.status === "completed") {
    const body = await resolveSyncApiBody({
      rawResult: finished.result,
      payload: opts.payload,
      userId: opts.userId,
      jobId,
      buildSyncBody: opts.buildSyncBody,
    });
    opts.res.json(body);
    return;
  }

  if (finished && isTerminalStatus(finished.status) && finished.status !== "completed") {
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
      pollUrl: `/api/result/${jobId}`,
      legacyPollUrl: `/api/ai/jobs/${jobId}`,
    });

  opts.res.status(202).json(asyncBody);
}

export async function getAiQueueHealth(): Promise<Record<string, unknown>> {
  return getQueueStats();
}

export async function getJobForPoll(jobId: string, userId: string) {
  const job = await getJobForApi(jobId);
  if (!job) return { status: 404 as const };
  if (job.userId !== userId && job.userId !== "anonymous") {
    return { status: 403 as const };
  }
  return { status: 200 as const, job };
}

/** Shared JSON body for GET /api/result/:jobId and GET /api/ai/jobs/:jobId */
export function buildJobPollResponse(job: {
  id: string;
  status: string;
  type: string;
  createdAt: number;
  updatedAt: number;
  result?: unknown;
  error?: string;
  timedOut?: boolean;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    jobId: job.id,
    status: job.status,
    type: job.type,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
  if (isTerminalStatus(job.status as import("../queue/types.js").AiJobStatus)) {
    if (job.status === "completed") body.result = job.result;
    else body.error = job.error ?? "failed";
    if (job.timedOut) body.timedOut = true;
  }
  return body;
}
