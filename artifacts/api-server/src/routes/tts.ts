import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  AMY_VOICE_ID_DEFAULT,
  TTS_MAX_INPUT_CHARS,
  readCachedAudio,
  synthesize,
} from "../services/elevenLabsService";

// ─── Public router (mounted BEFORE requireAuth) ──────────────────────────────
//
// Streams cached MP3s by content-hash key. Public on purpose: the cacheKey is
// SHA256(text|voice|model) — 256 bits of entropy — and only authenticated
// callers of /tts/synthesize can ever obtain a valid one. Going public lets
// <audio> / expo-audio load the URL directly without juggling bearer tokens
// in the source URI.
export const ttsPublicRouter: IRouter = Router();

ttsPublicRouter.get("/tts/audio/:key.mp3", async (req, res): Promise<void> => {
  const key = String(req.params.key ?? "");
  if (!/^[a-f0-9]{64}$/.test(key)) {
    res.status(400).json({ error: "invalid_key" });
    return;
  }

  try {
    const cached = await readCachedAudio(key);
    if (!cached) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    // Lock the response to a fixed audio MIME regardless of what the cache
    // row claims. The endpoint is public, so we don't want a future ingest
    // path that wrote a weird `contentType` to ever serve, say, text/html
    // from this URL. `nosniff` blocks MIME-sniffing attacks on top of that.
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Length", String(cached.buffer.byteLength));
    // Audio bytes are immutable for a given content hash → safe to cache hard.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.status(200).end(cached.buffer);
  } catch (err) {
    logger.error(
      {
        evt: "tts.stream_failed",
        key,
        message: err instanceof Error ? err.message : String(err),
      },
      "tts stream failed",
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── Authed router (mounted AFTER requireAuth) ──────────────────────────────
const router: IRouter = Router();

const synthesizeSchema = z.object({
  text: z.string().min(1).max(TTS_MAX_INPUT_CHARS),
  voiceId: z.string().min(1).max(64).optional(),
  modelId: z.string().min(1).max(64).optional(),
});

/**
 * POST /api/tts/synthesize
 *
 * Returns a JSON envelope (NOT the raw audio) with a cacheKey + a relative
 * `audioUrl` the client can hand straight to an <audio> / expo-audio player.
 * Splitting "synthesize" from "stream" keeps the JSON request cheap and lets
 * us add per-user quotas later without touching the audio path.
 */
router.post("/tts/synthesize", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = synthesizeSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  try {
    const result = await synthesize(parsed.data.text, {
      voiceId: parsed.data.voiceId,
      modelId: parsed.data.modelId,
    });

    logger.info(
      {
        evt: "tts.synthesize",
        userId,
        cached: result.cached,
        charCount: result.charCount,
        voiceId: parsed.data.voiceId ?? AMY_VOICE_ID_DEFAULT,
      },
      result.cached ? "tts cached response" : "tts new generation",
    );

    res.json({
      ok: true,
      cacheKey: result.cacheKey,
      audioUrl: `/api/tts/audio/${result.cacheKey}.mp3`,
      cached: result.cached,
      charCount: result.charCount,
      contentType: result.contentType,
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "tts_failed";
    const status =
      code === "tts_text_too_long" || code === "tts_empty_text" ? 400 : 502;
    logger.error(
      { evt: "tts.synthesize_failed", userId, code },
      "tts synthesize failed",
    );
    res.status(status).json({ error: code });
  }
});

export default router;
