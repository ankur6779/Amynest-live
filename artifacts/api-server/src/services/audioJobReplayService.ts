/**
 * Replay a failed BullMQ audio job with the same payload.
 */
import { getAiJobsQueue } from "../queue/index.js";
import { isBullMqActive } from "../queue/mode.js";
import { enqueueBullMqJob } from "../queue/index.js";
import type { AiJobType } from "../queue/types.js";
import { getRecentFailedAiJobDiagnostics } from "../queue/failed-job-diagnostics.js";

const REPLAYABLE_AUDIO_TYPES = new Set<AiJobType>([
  "audio.warmup",
  "tts.pregenerate",
  "tts.synthesize",
  "static-audio.generate",
  "audio-lessons.pregenerate",
  "ai-coach.pregenerate_audio",
  "ai-coach.pregenerate_infant_audio",
]);

export async function replayFailedAudioJob(jobId: string): Promise<{
  ok: boolean;
  newJobId?: string;
  error?: string;
}> {
  if (!isBullMqActive()) {
    return { ok: false, error: "bullmq_inactive" };
  }

  const queue = getAiJobsQueue();
  const job = await queue.getJob(jobId);
  if (!job) {
    return { ok: false, error: "job_not_found" };
  }

  const type = job.data?.type as AiJobType | undefined;
  const userId = job.data?.userId;
  const payload = job.data?.payload;

  if (!type || !userId || !REPLAYABLE_AUDIO_TYPES.has(type)) {
    return { ok: false, error: "not_replayable" };
  }

  const enqueued = await enqueueBullMqJob(type, userId, payload);
  if (!enqueued.jobId) {
    return { ok: false, error: enqueued.error ?? "enqueue_deferred" };
  }

  return { ok: true, newJobId: enqueued.jobId };
}

export { getRecentFailedAiJobDiagnostics, REPLAYABLE_AUDIO_TYPES };
