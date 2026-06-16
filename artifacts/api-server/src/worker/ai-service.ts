import { logger } from "../lib/logger.js";
import { getMemorySnapshot } from "../utils/memory-monitor.js";
import { parseEnvMs } from "../lib/env.js";
import { getMealsAiWorkerTimeoutMs } from "../lib/meals-ai-timeouts.js";
import { AI_CHAT_TIMEOUT_MS } from "../services/openai-chat.js";
import { COACH_WORKER_TIMEOUT_MS } from "@workspace/coach-journey";
import { runAiJobHandler } from "../services/ai-job-handlers.js";
import type { AiJobQueuePayload } from "../queue/index.js";
import { getJobRecord, patchJobRecord, saveJobRecord } from "../queue/job-results.js";
import type { AiJobRecord } from "../queue/types.js";

const JOB_TIMEOUT_MS = parseEnvMs("AI_JOB_TIMEOUT_MS", AI_CHAT_TIMEOUT_MS);

const AUDIO_WARMUP_JOB_TIMEOUT_MS = parseEnvMs("AUDIO_WARMUP_JOB_TIMEOUT_MS", 180_000);

const AUDIO_JOB_TYPES = new Set([
  "audio.warmup",
  "tts.pregenerate",
  "tts.synthesize",
  "static-audio.generate",
  "audio-lessons.pregenerate",
  "ai-coach.pregenerate_audio",
  "ai-coach.pregenerate_infant_audio",
]);

const COACH_JOB_TYPES = new Set([
  "ai-coach.initial_wins",
  "ai-coach.next_win",
  "ai-coach.remaining_wins",
  "ai-coach.extend",
  "ai-coach.stream_plan",
]);

function resolveJobTimeoutMs(type: string): number {
  if (type === "meals.ai_generate") {
    return getMealsAiWorkerTimeoutMs();
  }
  if (type === "audio.warmup") {
    return AUDIO_WARMUP_JOB_TIMEOUT_MS;
  }
  if (COACH_JOB_TYPES.has(type)) {
    return COACH_WORKER_TIMEOUT_MS;
  }
  const ms = Number.isFinite(JOB_TIMEOUT_MS) ? JOB_TIMEOUT_MS : 10_000;
  return ms > 0 ? ms : 10_000;
}

/**
 * Process one BullMQ AI job — OpenAI / ElevenLabs with timeout + Redis result storage.
 */
export async function processAiJob(data: AiJobQueuePayload): Promise<unknown> {
  const { jobId, type, userId, payload } = data;
  const started = Date.now();

  console.log("Processing job:", jobId);
  logger.info(
    { evt: "ai_worker.job_start", jobId, type, userId, memory: getMemorySnapshot() },
    "AI worker job start",
  );

  const existing = await getJobRecord(jobId);
  const processing: AiJobRecord = {
    id: jobId,
    type,
    userId,
    status: "processing",
    createdAt: existing?.createdAt ?? started,
    updatedAt: started,
    payload: existing?.payload ?? payload,
  };
  await saveJobRecord(processing);

  const timeoutMs = resolveJobTimeoutMs(type);
  const traceId = (await import("../lib/coach-generate-trace.js")).extractCoachTraceIdFromPayload(payload);
  if (traceId) {
    const { logCoachGenerateTrace } = await import("../lib/coach-generate-trace.js");
    logCoachGenerateTrace("bullmq.job_started", { traceId, jobId, layer: "bullmq" });
  }
  const timeout = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), timeoutMs),
  );

  try {
    const result = await Promise.race([runAiJobHandler(type, payload), timeout]);

    if (result === "timeout") {
      if (COACH_JOB_TYPES.has(type)) {
        const { buildCoachWorkerFallbackResult } = await import("../lib/coach-generate-response.js");
        const fallback = await buildCoachWorkerFallbackResult(type, payload);
        if (fallback) {
          await patchJobRecord(jobId, { status: "completed", result: fallback });
          if (traceId) {
            const { logCoachGenerateTrace } = await import("../lib/coach-generate-trace.js");
            logCoachGenerateTrace("bullmq.job_completed", {
              traceId,
              jobId,
              layer: "bullmq",
              timeoutMs,
              meta: { durationMs: Date.now() - started, workerTimeoutFallback: true },
            });
          }
          logger.warn(
            { evt: "ai_worker.coach_timeout_fallback", jobId, type, timeoutMs },
            "coach job timed out — completed with emergency fallback",
          );
          return fallback;
        }
      }
      await patchJobRecord(jobId, {
        status: "timed_out",
        timedOut: true,
        error: "AI job timed out",
      });
      if (AUDIO_JOB_TYPES.has(type)) {
        logger.error(
          { evt: "audio_job.timed_out", jobId, type, userId, timeoutMs },
          "audio job timed out",
        );
        const { recordAudioJobFailure } = await import("../services/audio-job-alert-store.js");
        recordAudioJobFailure(type, jobId, "timed_out");
      }
      logger.warn(
        { evt: "ai_worker.job_timeout", jobId, type, timeoutMs, durationMs: Date.now() - started },
        "AI job timed out",
      );
      if (!COACH_JOB_TYPES.has(type) && !AUDIO_JOB_TYPES.has(type)) {
        const { recordAiJobFailure } = await import("../services/ai-job-alert-store.js");
        recordAiJobFailure(type, jobId, "timed_out");
      }
      const { recordDlqEntry } = await import("../queue/dlq-store.js");
      await recordDlqEntry({
        jobId,
        type,
        userId,
        reason: "timed_out",
        route: type,
        payload,
        error: `AI job timed out after ${timeoutMs}ms`,
      });
      const { captureBullMqJobFailure } = await import("../lib/sentry.js");
      captureBullMqJobFailure(new Error(`AI job timed out after ${timeoutMs}ms`), {
        jobId,
        type,
        userId,
      });
      throw new Error(`AI job timed out after ${timeoutMs}ms`);
    }

    await patchJobRecord(jobId, { status: "completed", result });
    if (traceId) {
      const { logCoachGenerateTrace } = await import("../lib/coach-generate-trace.js");
      logCoachGenerateTrace("bullmq.job_completed", {
        traceId,
        jobId,
        layer: "bullmq",
        meta: { durationMs: Date.now() - started },
      });
    }
    logger.info(
      {
        evt: "ai_worker.job_done",
        jobId,
        type,
        durationMs: Date.now() - started,
        memory: getMemorySnapshot(),
      },
      "AI worker job completed",
    );
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (COACH_JOB_TYPES.has(type)) {
      const { buildCoachWorkerFallbackResult } = await import("../lib/coach-generate-response.js");
      const fallback = await buildCoachWorkerFallbackResult(type, payload);
      if (fallback) {
        await patchJobRecord(jobId, { status: "completed", result: fallback });
        logger.warn(
          { evt: "ai_worker.coach_error_fallback", jobId, type, message: message.slice(0, 200) },
          "coach job failed — completed with emergency fallback",
        );
        return fallback;
      }
    }
    if (AUDIO_JOB_TYPES.has(type)) {
      logger.error(
        {
          evt: "audio_job.failed",
          jobId,
          type,
          userId,
          message: message.slice(0, 300),
        },
        "audio job failed — inspect BullMQ failed queue",
      );
      const { recordAudioJobFailure } = await import("../services/audio-job-alert-store.js");
      recordAudioJobFailure(type, jobId, message);
    }
    await patchJobRecord(jobId, {
      status: "failed",
      error: message.slice(0, 500),
    });
    if (!COACH_JOB_TYPES.has(type) && !AUDIO_JOB_TYPES.has(type)) {
      const { recordAiJobFailure } = await import("../services/ai-job-alert-store.js");
      recordAiJobFailure(type, jobId, message);
    }
    const { recordDlqEntry } = await import("../queue/dlq-store.js");
    await recordDlqEntry({
      jobId,
      type,
      userId,
      reason: "failed",
      route: type,
      payload,
      error: message,
    });
    const { captureBullMqJobFailure } = await import("../lib/sentry.js");
    captureBullMqJobFailure(err, { jobId, type, userId });
    logger.error(
      {
        evt: "ai_worker.job_failed",
        jobId,
        message: message.slice(0, 300),
        memory: getMemorySnapshot(),
      },
      "AI worker job failed",
    );
    throw err;
  }
}
