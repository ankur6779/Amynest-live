import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { TTS_MAX_INPUT_CHARS } from "../services/elevenLabsService";
import { submitRouteAiJob } from "../lib/route-ai-queue.js";

const router: IRouter = Router();

/**
 * POST /api/audio-lessons/pregenerate
 *
 * Accepts an array of Hindi lesson texts and pre-synthesizes them all using the
 * Hindi Amy voice, saving each MP3 to GCS + the tts_cache DB table.
 *
 * Callers (web and mobile) send all lesson paragraph texts for the current age
 * group after the user signs in. Subsequent playback of those paragraphs is
 * instant because the cache already has the audio.
 *
 * Already-cached texts are no-ops (synthesize() checks DB+GCS first).
 * Texts longer than TTS_MAX_INPUT_CHARS are silently skipped.
 */
router.post("/audio-lessons/pregenerate", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const rawTexts = req.body?.texts;
  if (!Array.isArray(rawTexts) || rawTexts.length === 0) {
    res.status(400).json({ error: "invalid_texts" });
    return;
  }
  if (rawTexts.length > 300) {
    res.status(400).json({ error: "too_many_texts" });
    return;
  }

  const validTexts = rawTexts
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= TTS_MAX_INPUT_CHARS);

  if (validTexts.length === 0) {
    res.json({ ok: true, total: 0, succeeded: 0, failed: 0, skipped: rawTexts.length });
    return;
  }

  const skipped = rawTexts.length - validTexts.length;

  await submitRouteAiJob({
    routeName: "audio-lessons/pregenerate",
    type: "audio-lessons.pregenerate",
    userId,
    input: { texts: validTexts },
    waitMs: 120_000,
    buildSyncBody: (result) => {
      const body = result as {
        ok: true;
        total: number;
        succeeded: number;
        failed: number;
        cached: number;
        skipped: number;
      };
      logger.info(
        {
          evt: "audio_lessons.pregenerate",
          userId,
          total: body.total,
          succeeded: body.succeeded,
          failed: body.failed,
          cached: body.cached,
          skipped,
        },
        "audio lessons pregenerate complete",
      );
      return { ...body, skipped };
    },
    res,
  });
});

export default router;
