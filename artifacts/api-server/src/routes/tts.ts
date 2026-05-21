import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  AMY_VOICE_ID_DEFAULT,
  AMY_MODEL_ID_DEFAULT,
  TTS_MAX_INPUT_CHARS,
  computeTtsCacheKey,
  readCachedAudio,
  trySynthesizeFromCache,
} from "../services/elevenLabsService";
import {
  getElevenLabsApiKey,
  getTtsProvider,
  isElevenLabsTtsEnabled,
  isTtsCacheGcsEnabled,
} from "../lib/env";
import { legacyGcsConfigured } from "../services/ttsAudioStore";
import { isValidTtsPublicUrl } from "../services/ttsAudioStore";
import { isStaticTtsText } from "@workspace/static-audio";
import { synthesizeSafe } from "../services/ttsSafe.js";
import { registerTtsPending, takeTtsPending } from "../services/ttsPendingRegistry.js";
import { streamLiveTtsToClient } from "../services/ttsLiveStream.js";
import { generateOpenAiTts } from "../services/ttsGenerate.js";
import { getOpenAiTtsVoice } from "../lib/openai-tts-config.js";
import {
  getPhonicsAudioText,
  getPhonemeAudioText,
  getCvcWordAudioText,
} from "@workspace/phonics-sounds";

// ─── Public router (mounted BEFORE requireAuth) ──────────────────────────────
//
// Streams cached MP3s by content-hash key. Public on purpose: the cacheKey is
// SHA256(text|voice|model) — 256 bits of entropy — and only authenticated
// callers of /tts/synthesize can ever obtain a valid one. Going public lets
// <audio> / expo-audio load the URL directly without juggling bearer tokens
// in the source URI.
//
// When TTS_PROVIDER=openai, cache misses registered by /tts/synthesize are
// streamed live from OpenAI (ElevenLabs fallback) without persisting audio.
export const ttsPublicRouter: IRouter = Router();

ttsPublicRouter.get("/tts/audio/:key.mp3", async (req, res): Promise<void> => {
  const key = String(req.params.key ?? "");
  if (!/^[a-f0-9]{64}$/.test(key)) {
    res.status(400).json({ error: "invalid_key" });
    return;
  }

  try {
    const cached = await readCachedAudio(key);
    if (cached) {
      if (cached.buffer.byteLength === 0) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Length", String(cached.buffer.byteLength));
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.status(200).end(cached.buffer);
      return;
    }

    const pending = takeTtsPending(key);
    if (pending) {
      await streamLiveTtsToClient(res, {
        cacheKey: key,
        text: pending.text,
        voiceId: pending.voiceId,
        modelId: pending.modelId,
        mode: pending.mode,
      });
      return;
    }

    res.status(404).json({ error: "not_found" });
  } catch (err) {
    logger.error(
      {
        evt: "tts.stream_failed",
        key,
        message: err instanceof Error ? err.message : String(err),
      },
      "tts stream failed",
    );
    if (!res.headersSent) res.status(500).json({ error: "server_error" });
  }
});

// ─── Authed router (mounted AFTER requireAuth) ──────────────────────────────
const router: IRouter = Router();

const synthesizeSchema = z.object({
  text: z.string().min(1).max(TTS_MAX_INPUT_CHARS),
  voiceId: z.string().min(1).max(64).optional(),
  modelId: z.string().min(1).max(64).optional(),
  /**
   * `phonics` swaps to tighter ElevenLabs voice settings tuned for teaching
   * phoneme sounds. The resulting cache key is namespaced so phonics audio
   * is stored separately from the default warm Amy voice.
   */
  mode: z.enum(["default", "phonics"]).optional(),
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
    const synthStarted = performance.now();
    console.log("[TTS START]", parsed.data.text.slice(0, 120));

    const synthOptions = {
      voiceId: parsed.data.voiceId,
      modelId: parsed.data.modelId,
      mode: parsed.data.mode,
    };

    const cacheHit = await trySynthesizeFromCache(parsed.data.text, synthOptions);

    const buildTtsJson = (result: {
      cacheKey: string;
      audioUrl: string;
      cached: boolean;
      charCount: number;
      contentType: string;
    }) => {
      const { audioUrl } = result;
      if (!isValidTtsPublicUrl(audioUrl)) {
        console.error("Invalid audio URL", audioUrl);
        logger.error(
          { evt: "tts.invalid_audio_url", userId, cacheKey: result.cacheKey, audioUrl },
          "TTS synthesize: invalid playback URL",
        );
        return { success: false as const, ok: false as const, error: "invalid_audio_url" };
      }

      const synthDurationMs = Math.round(performance.now() - synthStarted);
      console.log("[TTS GENERATED]", {
        text: parsed.data.text.slice(0, 120),
        publicUrl: audioUrl,
      });
      logger.info(
        {
          evt: "tts.synthesize",
          userId,
          cached: result.cached,
          charCount: result.charCount,
          voiceId: parsed.data.voiceId ?? AMY_VOICE_ID_DEFAULT,
          mode: parsed.data.mode ?? "default",
          durationMs: synthDurationMs,
          ttsProvider: getTtsProvider(),
          elevenLabsKeySuffix: getElevenLabsApiKey()?.slice(-4) ?? null,
          audioUrl,
        },
        result.cached ? "TTS: cache hit (synthesize endpoint)" : "TTS: generated (synthesize endpoint)",
      );
      return {
        ok: true as const,
        success: true as const,
        cacheKey: result.cacheKey,
        audioUrl,
        cached: result.cached,
        charCount: result.charCount,
        contentType: result.contentType,
      };
    };

    if (cacheHit) {
      const body = buildTtsJson(cacheHit);
      if (!body.success) {
        res.status(200).json({ success: false, ok: false, error: body.error });
        return;
      }
      res.json(body);
      return;
    }

    const text = parsed.data.text;
    const mode = parsed.data.mode ?? "default";
    if (isTtsCacheGcsEnabled() && legacyGcsConfigured() && isStaticTtsText(text, mode)) {
      res.status(200).json({
        ok: false,
        success: false,
        error: "tts_static_pregenerated_only",
        message: "Static phrases must use pre-generated catalog audio (static-audio-map.json).",
      });
      return;
    }

    const voiceId = parsed.data.voiceId?.trim() || AMY_VOICE_ID_DEFAULT;
    const modelId = parsed.data.modelId?.trim() || AMY_MODEL_ID_DEFAULT;
    const cacheKey = computeTtsCacheKey(text, voiceId, modelId, mode);
    const audioUrl = `/api/tts/audio/${cacheKey}.mp3`;

    if (getTtsProvider() === "openai" || !isElevenLabsTtsEnabled()) {
      registerTtsPending(cacheKey, { text, voiceId, modelId, mode });
      const body = buildTtsJson({
        cacheKey,
        audioUrl,
        cached: false,
        charCount: text.length,
        contentType: "audio/mpeg",
      });
      if (!body.success) {
        res.status(200).json({ success: false, ok: false, error: body.error });
        return;
      }
      res.json(body);
      return;
    }

    // ElevenLabs provider: generate, cache, then return playback URL.
    const generated = await synthesizeSafe(text, synthOptions);
    if (!generated) {
      res.status(200).json({ success: false, ok: false, error: "tts_failed" });
      return;
    }

    const body = buildTtsJson(generated);
    if (!body.success) {
      res.status(200).json({ success: false, ok: false, error: body.error });
      return;
    }
    res.json(body);
  } catch (err) {
    const code = err instanceof Error ? err.message : "tts_failed";
    console.error("TTS synthesize route error", code);
    logger.error(
      { evt: "tts.synthesize_failed", userId, code },
      "tts synthesize failed",
    );
    res.status(200).json({ success: false, ok: false, error: code });
  }
});

const generateSchema = z
  .object({
    text: z.string().max(TTS_MAX_INPUT_CHARS).optional(),
    /** Single letter key (a–z or digraph) — resolves to instructional audioText. */
    letter: z.string().min(1).max(8).optional(),
    /** IPA phoneme key (k, æ, …) — resolves to PHONEME_AUDIO line. */
    phoneme: z.string().min(1).max(8).optional(),
    /** CVC whole word for word_* cache stem. */
    word: z.string().min(1).max(32).optional(),
    voice: z.string().min(1).max(64).optional(),
    speed: z.number().min(0.5).max(2).optional(),
    mode: z.enum(["default", "phonics"]).optional(),
    category: z.enum(["words", "sentences", "phonics"]).optional(),
  })
  .refine((d) => !!(d.text?.trim() || d.letter?.trim() || d.phoneme?.trim()), {
    message: "text, letter, or phoneme required",
  });

/**
 * POST /api/tts/generate
 *
 * OpenAI-only TTS for phonics and dynamic phrases. Checks GCS/DB cache first,
 * then generates with gpt-4o-mini-tts and persists for reuse.
 */
router.post("/tts/generate", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  if (getTtsProvider() === "elevenlabs" && isElevenLabsTtsEnabled()) {
    res.status(503).json({
      error: "tts_openai_only",
      message: "Use TTS_PROVIDER=openai for /api/tts/generate",
    });
    return;
  }

  const rawText = parsed.data.text?.trim() ?? "";
  const letterKey = parsed.data.letter?.trim().toLowerCase() ?? "";
  const phonemeKey = parsed.data.phoneme?.trim() ?? "";
  const cvcWord = parsed.data.word?.trim().toLowerCase() ?? "";

  const phrase = phonemeKey
    ? getPhonemeAudioText(phonemeKey)
    : letterKey
      ? getPhonicsAudioText(letterKey)
      : cvcWord && !rawText
        ? getCvcWordAudioText(cvcWord)
        : getPhonicsAudioText(rawText) || rawText;

  if (!phrase) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  try {
    const result = await generateOpenAiTts({
      text: phrase,
      voice: parsed.data.voice ?? getOpenAiTtsVoice(),
      speed: parsed.data.speed,
      mode: parsed.data.mode ?? "phonics",
      category: parsed.data.category ?? "phonics",
      letterKey: letterKey || undefined,
      phonemeKey: phonemeKey || undefined,
      cvcWord: cvcWord || undefined,
    });
    if (!result || !isValidTtsPublicUrl(result.url)) {
      res.status(502).json({ error: "tts_failed" });
      return;
    }
    res.json({
      ok: true,
      url: result.url,
      audioUrl: result.url,
      cacheKey: result.cacheKey,
      cached: result.cached,
    });
  } catch (err) {
    logger.error(
      {
        evt: "tts.generate_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      "tts generate failed",
    );
    res.status(502).json({ error: "tts_failed" });
  }
});

export default router;
