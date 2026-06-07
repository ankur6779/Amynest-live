import type { StaticAudioMode } from "@workspace/static-audio";
import { logger } from "../lib/logger.js";
import { enqueueAiJob } from "../queue/ai-job-queue.js";
import { wrapJobInput } from "../queue/ai-job-payload.js";
import { recordGenerationQueueDepth } from "./staticAudioMetrics.js";

/** @deprecated Use BullMQ worker — kept for callers that gate enqueue behavior. */
export function isStaticAudioWorkerPreferred(): boolean {
  if (process.env.STATIC_AUDIO_WORKER_ENABLED === "false") return false;
  if (process.env.WORKER_AVAILABLE === "false") return false;
  return process.env.WORKER_ENABLED === "true" || !!process.env.REDIS_URL?.trim();
}

export function enqueueStaticAudioGeneration(
  text: string,
  mode: StaticAudioMode,
  hash?: string,
  priority = 25,
): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  void enqueueAiJob(
    "static-audio.generate",
    "system",
    wrapJobInput("static-audio/generate", {
      text: trimmed,
      mode,
      hash,
      priority,
      source: "missing_report",
    }),
  ).then((enqueued) => {
    if (!enqueued.jobId) {
      logger.error(
        {
          evt: "static_audio.enqueue_failed",
          mode,
          hash,
          retryAfterMs: enqueued.retryAfterMs,
        },
        "static audio generation enqueue failed",
      );
      return;
    }
    recordGenerationQueueDepth(1);
    logger.info(
      { evt: "static_audio.enqueued", jobId: enqueued.jobId, mode, hash, priority },
      "static audio generation enqueued",
    );
  });
}

/** Cron hook — no in-process drain; worker consumes BullMQ jobs. */
export async function runStaticAudioGenerationCron(): Promise<void> {
  /* no-op: generation runs on amynest-ai-worker via static-audio.generate */
}
