import type { StaticAudioMode } from "@workspace/static-audio";
import { getStaticAudioHash } from "@workspace/static-audio";
import { logger } from "../lib/logger.js";
import { enqueueAiJob } from "../queue/ai-job-queue.js";
import { wrapJobInput } from "../queue/ai-job-payload.js";
import { recordGenerationQueueDepth } from "./staticAudioMetrics.js";
import { getAiJobsQueue, isBullMqActive } from "../queue/index.js";

/** @deprecated Use BullMQ worker — kept for callers that gate enqueue behavior. */
export function isStaticAudioWorkerPreferred(): boolean {
  if (process.env.STATIC_AUDIO_WORKER_ENABLED === "false") return false;
  if (process.env.WORKER_AVAILABLE === "false") return false;
  return process.env.WORKER_ENABLED === "true" || !!process.env.REDIS_URL?.trim();
}

const memoryInflightHashes = new Set<string>();

function staticAudioJobId(hash: string): string {
  return `static-audio:${hash}`;
}

async function isStaticAudioJobActive(jobId: string): Promise<boolean> {
  if (!isBullMqActive()) {
    return memoryInflightHashes.has(jobId);
  }
  try {
    const queue = getAiJobsQueue();
    const existing = await queue.getJob(jobId);
    if (!existing) return false;
    const state = await existing.getState();
    return state === "waiting" || state === "active" || state === "delayed";
  } catch {
    return false;
  }
}

export function enqueueStaticAudioGeneration(
  text: string,
  mode: StaticAudioMode,
  hash?: string,
  priority = 25,
): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  const resolvedHash = hash ?? getStaticAudioHash(trimmed, mode);
  const jobId = staticAudioJobId(resolvedHash);

  void (async () => {
    if (await isStaticAudioJobActive(jobId)) {
      logger.info(
        { evt: "static_audio.enqueue_deduped", jobId, mode, hash },
        "static audio generation already queued",
      );
      return;
    }

    if (!isBullMqActive()) {
      memoryInflightHashes.add(jobId);
    }

    const enqueued = await enqueueAiJob(
      "static-audio.generate",
      "system",
      wrapJobInput("static-audio/generate", {
        text: trimmed,
        mode,
        hash,
        priority,
        source: "missing_report",
      }),
      { deterministicJobId: jobId },
    );

    if (!isBullMqActive() && !enqueued.jobId) {
      memoryInflightHashes.delete(jobId);
    }

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
  })();
}

/** Release memory-queue dedup slot when worker completes (memory mode only). */
export function releaseStaticAudioMemoryJob(hash: string): void {
  memoryInflightHashes.delete(staticAudioJobId(hash));
}

/** Cron hook — no in-process drain; worker consumes BullMQ jobs. */
export async function runStaticAudioGenerationCron(): Promise<void> {
  /* no-op: generation runs on amynest-ai-worker via static-audio.generate */
}
