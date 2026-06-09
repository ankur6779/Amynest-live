import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  getRhymesRegistryCount,
  listRhymesRegistryEntries,
} from "@workspace/rhymes-audio";
import { logger } from "../lib/logger.js";
import { resolveRhymesSignedUrl } from "../services/rhymesAudioSignedUrlService.js";

const router: IRouter = Router();

const AudioIdParams = z.object({
  audioId: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9-]*$/i),
});

/** GET /api/audio/signed-url/:audioId — V4 GCS signed read URL for allowlisted rhyme/lullaby. */
router.get("/audio/signed-url/:audioId", async (req, res): Promise<void> => {
  const parsed = AudioIdParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "invalid_audio_id" });
    return;
  }

  const { audioId } = parsed.data;
  const result = await resolveRhymesSignedUrl(audioId);

  if (!result.ok) {
    const status =
      result.reason === "not_found" || result.reason === "missing_object"
        ? 404
        : result.reason === "gcs_unconfigured"
          ? 503
          : 500;
    logger.warn({
      evt: "rhymes.signed_url_request_failed",
      audioId,
      reason: result.reason,
    });
    res.status(status).json({
      success: false,
      audioId,
      error: result.reason,
    });
    return;
  }

  res.setHeader("Cache-Control", "private, max-age=600, stale-while-revalidate=120");
  res.json({
    success: true,
    audioId: result.audioId,
    title: result.title,
    signedUrl: result.signedUrl,
    expiresIn: result.expiresIn,
    cached: result.cached,
  });
});

/** GET /api/audio/rhymes/catalog — metadata only (no GCS paths). */
router.get("/audio/rhymes/catalog", (_req, res): void => {
  const entries = listRhymesRegistryEntries().map((e) => ({
    id: e.id,
    title: e.title,
    durationSec: e.durationSec,
    category: e.category,
    sizeBytes: e.sizeBytes,
  }));
  res.json({
    success: true,
    count: getRhymesRegistryCount(),
    entries,
  });
});

export const audioSignedUrlPublicRouter: IRouter = router;
