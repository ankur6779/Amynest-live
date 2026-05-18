import { logger } from "../lib/logger.js";
import { getMemorySnapshot } from "../utils/memory-monitor.js";
import { AI_CHAT_TIMEOUT_MS } from "../services/openai-chat.js";
import { runAiJobHandler } from "../services/ai-job-handlers.js";
import type { AiJobQueuePayload } from "../queue/index.js";
import { patchJobRecord, saveJobRecord } from "../queue/job-results.js";
import type { AiJobRecord } from "../queue/types.js";

const JOB_TIMEOUT_MS = Number(process.env.AI_JOB_TIMEOUT_MS ?? String(AI_CHAT_TIMEOUT_MS));

/**
 * Process one BullMQ AI job — OpenAI / ElevenLabs with timeout + Redis result storage.
 */
export async function processAiJob(data: AiJobQueuePayload): Promise<unknown> {
  const { jobId, type, userId, payload } = data;
  const started = Date.now();

  logger.info(
    { evt: "ai_worker.job_start", jobId, type, userId, memory: getMemorySnapshot() },
    "AI worker job start",
  );

  const processing: AiJobRecord = {
    id: jobId,
    type,
    userId,
    status: "processing",
    createdAt: started,
    updatedAt: started,
  };
  await saveJobRecord(processing);

  const timeoutMs = Number.isFinite(JOB_TIMEOUT_MS) ? JOB_TIMEOUT_MS : 10_000;
  const timeout = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), timeoutMs),
  );

  try {
    const result = await Promise.race([runAiJobHandler(type, payload), timeout]);

    if (result === "timeout") {
      await patchJobRecord(jobId, {
        status: "timed_out",
        timedOut: true,
        error: "AI job timed out",
      });
      logger.warn({ evt: "ai_worker.job_timeout", jobId, durationMs: Date.now() - started }, "AI job timed out");
      return null;
    }

    await patchJobRecord(jobId, { status: "completed", result });
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
    await patchJobRecord(jobId, {
      status: "failed",
      error: message.slice(0, 500),
    });
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
