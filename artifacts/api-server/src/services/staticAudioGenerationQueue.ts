import type { StaticAudioMode } from "@workspace/static-audio";
import { logger } from "../lib/logger.js";
import { generateAndPersistStaticPhrase } from "./staticAudioGeneration.js";
import { recordGenerationQueueDepth } from "./staticAudioMetrics.js";

type QueuedPhrase = {
  text: string;
  mode: StaticAudioMode;
  hash?: string;
  priority: number;
};

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
  priority = 25,
): void {
  const key = `${mode}:${text.trim().toLowerCase()}`;
  const existing = pending.get(key);
  if (existing && existing.priority >= priority) return;
  pending.set(key, {
    text: text.trim(),
    mode,
    hash,
    priority: existing ? Math.max(existing.priority, priority) : priority,
  });
  recordGenerationQueueDepth(pending.size);
  void drainQueue();
}

function pickHighestPriorityJob(): [string, QueuedPhrase] | null {
  let bestKey: string | null = null;
  let best: QueuedPhrase | null = null;
  for (const [key, job] of pending) {
    if (!best || job.priority > best.priority) {
      best = job;
      bestKey = key;
    }
  }
  if (!bestKey || !best) return null;
  pending.delete(bestKey);
  return [bestKey, best];
}

async function drainQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (pending.size > 0) {
      const next = pickHighestPriorityJob();
      if (!next) break;
      const [, job] = next;
      recordGenerationQueueDepth(pending.size);
      try {
        await generateAndPersistStaticPhrase(job.text, job.mode, "missing_report");
      } catch (err) {
        logger.error(
          { evt: "static_audio.queue_job_failed", err: String(err), priority: job.priority },
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
