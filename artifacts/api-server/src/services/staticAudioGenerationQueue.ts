import type { StaticAudioMode } from "@workspace/static-audio";
import { logger } from "../lib/logger.js";
import { generateAndPersistStaticPhrase } from "./staticAudioGeneration.js";
import { recordGenerationQueueDepth } from "./staticAudioMetrics.js";

type QueuedPhrase = { text: string; mode: StaticAudioMode; hash?: string };

const pending = new Map<string, QueuedPhrase>();
let processing = false;

export function isStaticAudioWorkerPreferred(): boolean {
  if (process.env.STATIC_AUDIO_WORKER_ENABLED === "false") return false;
  if (process.env.WORKER_AVAILABLE === "false") return false;
  return process.env.WORKER_ENABLED === "true" || !!process.env.REDIS_URL?.trim();
}

export function enqueueStaticAudioGeneration(
  text: string,
  mode: StaticAudioMode,
  hash?: string,
): void {
  const key = `${mode}:${text.trim().toLowerCase()}`;
  if (pending.has(key)) return;
  pending.set(key, { text: text.trim(), mode, hash });
  recordGenerationQueueDepth(pending.size);
  void drainQueue();
}

async function drainQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (pending.size > 0) {
      const [key, job] = pending.entries().next().value as [string, QueuedPhrase];
      pending.delete(key);
      recordGenerationQueueDepth(pending.size);
      try {
        await generateAndPersistStaticPhrase(job.text, job.mode, "missing_report");
      } catch (err) {
        logger.error(
          { evt: "static_audio.queue_job_failed", err: String(err) },
          "static audio queue job failed",
        );
      }
    }
  } finally {
    processing = false;
  }
}

/** Cron hook — process reported missing phrases. */
export async function runStaticAudioGenerationCron(): Promise<void> {
  await drainQueue();
}
