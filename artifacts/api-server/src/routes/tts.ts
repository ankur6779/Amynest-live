import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { TTS_MAX_INPUT_CHARS, readCachedAudio } from "../services/ttsCacheService";
import { isValidTtsPublicUrl } from "../services/ttsAudioStore";
import { takeTtsPending } from "../services/ttsPendingRegistry.js";
import { streamLiveTtsToClient } from "../services/ttsLiveStream.js";
import { generateOpenAiTts } from "../services/ttsGenerate.js";
import {
  AMY_MODEL_ID_DEFAULT as ELEVEN_MODEL_DEFAULT,
  AMY_VOICE_ID_DEFAULT as ELEVEN_VOICE_DEFAULT,
  synthesizeElevenLabsFallback,
} from "../services/elevenLabsFallbackService.js";
import { isElevenLabsFallbackEnabled } from "../lib/env.js";
import { getOpenAiTtsVoice } from "../lib/openai-tts-config.js";
import {
  getPhonicsText,
  getPhonicsAudioText,
  formatBlendLine,
} from "@workspace/phonics-sounds";

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

const router: IRouter = Router();

const generateSchema = z
  .object({
    text: z.string().max(TTS_MAX_INPUT_CHARS).optional(),
    letter: z.string().min(1).max(8).optional(),
    phoneme: z.string().min(1).max(8).optional(),
    word: z.string().min(1).max(32).optional(),
    blend: z.string().min(1).max(32).optional(),
    voice: z.string().min(1).max(64).optional(),
    speed: z.number().min(0.5).max(2).optional(),
    mode: z.enum(["default", "phonics"]).optional(),
    category: z.enum(["words", "sentences", "phonics"]).optional(),
  })
  .refine(
    (d) =>
      !!(
        d.text?.trim() ||
        d.letter?.trim() ||
        d.phoneme?.trim() ||
        d.word?.trim() ||
        d.blend?.trim()
      ),
    { message: "text, letter, phoneme, word, or blend required" },
  );

function resolvePhrase(parsed: z.infer<typeof generateSchema>): string {
  const rawText = parsed.text?.trim() ?? "";
  const letterKey = parsed.letter?.trim().toLowerCase() ?? "";
  const phonemeKey = parsed.phoneme?.trim() ?? "";
  const cvcWord = parsed.word?.trim().toLowerCase() ?? "";
  const blendWord = parsed.blend?.trim().toLowerCase() ?? "";

  if (phonemeKey) return getPhonicsText("phoneme", phonemeKey);
  if (blendWord) return formatBlendLine(blendWord);
  if (letterKey) return getPhonicsAudioText(letterKey);
  if (cvcWord && !rawText) return getPhonicsText("word", cvcWord);
  return getPhonicsAudioText(rawText) || rawText;
}

/**
 * POST /api/tts/generate — single OpenAI TTS pipeline (cache-first).
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

  const phrase = resolvePhrase(parsed.data);
  if (!phrase) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const letterKey = parsed.data.letter?.trim().toLowerCase() ?? "";
  const phonemeKey = parsed.data.phoneme?.trim() ?? "";
  const cvcWord = parsed.data.word?.trim().toLowerCase() ?? "";
  const blendWord = parsed.data.blend?.trim().toLowerCase() ?? "";

  try {
    const clientVoice = parsed.data.voice?.trim();
    const result = await generateOpenAiTts({
      text: phrase,
      voice: clientVoice && clientVoice.length > 0 ? clientVoice : getOpenAiTtsVoice(),
      speed: parsed.data.speed,
      mode: parsed.data.mode ?? "default",
      category: parsed.data.category ?? "words",
      letterKey: letterKey || undefined,
      phonemeKey: phonemeKey || undefined,
      cvcWord: cvcWord || undefined,
      blendWord: blendWord || undefined,
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

const elevenLabsFallbackSchema = z.object({
  text: z.string().min(1).max(TTS_MAX_INPUT_CHARS),
  voiceId: z.string().min(1).max(64).optional(),
  modelId: z.string().min(1).max(64).optional(),
  mode: z.enum(["default", "phonics"]).optional(),
});

/**
 * POST /api/tts/elevenlabs-fallback — optional layer after OpenAI fails.
 * Cache-first (legacy ElevenLabs MP3s); live ElevenLabs only when ELEVENLABS_API_KEY is set.
 */
router.post("/tts/elevenlabs-fallback", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (!isElevenLabsFallbackEnabled()) {
    res.status(503).json({ ok: false, error: "elevenlabs_fallback_disabled" });
    return;
  }

  const parsed = elevenLabsFallbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const text = parsed.data.text.trim();
  const mode = parsed.data.mode ?? "default";

  try {
    const result = await synthesizeElevenLabsFallback(text, {
      voiceId: parsed.data.voiceId ?? ELEVEN_VOICE_DEFAULT,
      modelId: parsed.data.modelId ?? ELEVEN_MODEL_DEFAULT,
      mode,
    });
    if (!result || !isValidTtsPublicUrl(result.audioUrl)) {
      res.status(502).json({ ok: false, error: "tts_failed" });
      return;
    }
    res.json({
      ok: true,
      success: true,
      url: result.audioUrl,
      audioUrl: result.audioUrl,
      cacheKey: result.cacheKey,
      cached: result.cached,
      provider: "elevenlabs",
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "tts_failed";
    logger.error(
      { evt: "tts.elevenlabs_fallback_failed", userId, code },
      "elevenlabs fallback failed",
    );
    res.status(502).json({ ok: false, error: code });
  }
});

/** @deprecated Use POST /api/tts/generate — thin alias for legacy clients. */
const synthesizeSchema = z.object({
  text: z.string().min(1).max(TTS_MAX_INPUT_CHARS),
  voiceId: z.string().min(1).max(64).optional(),
  modelId: z.string().min(1).max(64).optional(),
  mode: z.enum(["default", "phonics"]).optional(),
  phoneme: z.string().optional(),
  word: z.string().optional(),
  blend: z.string().optional(),
});

router.post("/tts/synthesize", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = synthesizeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const mode = parsed.data.mode ?? "default";
  const body = {
    text: parsed.data.text,
    letter: undefined as string | undefined,
    phoneme: parsed.data.phoneme,
    word: parsed.data.word,
    blend: parsed.data.blend,
    voice: parsed.data.voiceId ?? getOpenAiTtsVoice(),
    mode,
    category: mode === "phonics" ? ("phonics" as const) : ("words" as const),
  };

  const phrase = resolvePhrase(body);
  try {
    const result = await generateOpenAiTts({
      text: phrase,
      voice: body.voice,
      mode,
      category: body.category,
      phonemeKey: parsed.data.phoneme,
      cvcWord: parsed.data.word,
      blendWord: parsed.data.blend,
    });
    if (!result || !isValidTtsPublicUrl(result.url)) {
      res.status(200).json({ success: false, ok: false, error: "tts_failed" });
      return;
    }
    res.json({
      ok: true,
      success: true,
      cacheKey: result.cacheKey,
      audioUrl: result.url,
      cached: result.cached,
      charCount: phrase.length,
      contentType: "audio/mpeg",
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "tts_failed";
    logger.error({ evt: "tts.synthesize_failed", userId, code }, "tts synthesize failed");
    res.status(200).json({ success: false, ok: false, error: code });
  }
});

export default router;
