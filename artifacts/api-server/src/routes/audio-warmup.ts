import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { enqueueAiJob } from "../queue/ai-job-queue.js";
import { wrapJobInput } from "../queue/ai-job-payload.js";
import {
  AUDIO_WARMUP_MODULE_CAPS,
  type AudioWarmupModule,
} from "../services/domain-ai/audio-warmup-runner.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const warmupBodySchema = z.object({
  module: z.enum([
    "stories",
    "rhymes",
    "speech_coach",
    "spelling",
    "discovery_world",
    "animal_world",
    "study_zone",
    "parent_hub",
  ] as [AudioWarmupModule, ...AudioWarmupModule[]]),
  maxAssets: z.number().int().min(1).max(32).optional(),
  hints: z
    .object({
      spellingWords: z.array(z.string().min(1).max(64)).max(24).optional(),
      storyIds: z.array(z.string().min(1).max(64)).max(12).optional(),
      discoveryWorldId: z.string().min(1).max(64).optional(),
      animalCategory: z.string().min(1).max(32).optional(),
      studyTexts: z.array(z.string().min(1).max(256)).max(16).optional(),
      ageMonths: z.number().int().min(0).max(240).optional(),
    })
    .optional(),
});

router.post("/audio-warmup/enqueue", async (req, res): Promise<void> => {
  const userId = getAuth(req)?.uid;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = warmupBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  const cap = AUDIO_WARMUP_MODULE_CAPS[parsed.data.module];
  const maxAssets = Math.min(parsed.data.maxAssets ?? cap, cap);

  const enqueued = await enqueueAiJob(
    "audio.warmup",
    userId,
    wrapJobInput("audio/warmup", { ...parsed.data, maxAssets }),
  );

  if (!enqueued.jobId) {
    logger.warn(
      { evt: "audio_warmup.enqueue_failed", module: parsed.data.module, userId },
      "audio warmup enqueue failed",
    );
    res.status(503).json({ error: enqueued.error ?? "ai_queue_unavailable" });
    return;
  }

  res.status(202).json({
    ok: true,
    jobId: enqueued.jobId,
    module: parsed.data.module,
    maxAssets,
  });
});

export default router;
