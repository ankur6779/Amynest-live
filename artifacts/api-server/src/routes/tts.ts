import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { TTS_MAX_INPUT_CHARS, readCachedAudio } from "../services/ttsCacheService";
import { isValidTtsPublicUrl, MIN_TTS_BYTES } from "../services/ttsAudioStore";
import {
  AMY_MODEL_ID_DEFAULT as ELEVEN_MODEL_DEFAULT,
  AMY_MODEL_ID_FLASH,
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
import { submitRouteAiJob } from "../lib/route-ai-queue.js";
import { isPregenerationPaused } from "../services/admin-ops-store.js";
import {
  ingestTtsTelemetry,
  resolveTtsStrategy,
} from "../services/ttsIntelligenceService.js";
import { applyPredictiveStrategyAdjustments } from "../services/predictive-strategy.js";
import {
  computeTtsCacheKey,
  AMY_MODEL_ID_DEFAULT,
} from "../services/ttsCacheService.js";
import { recordApiHealthSample } from "../services/api-health-store.js";
import { getOpenAiTtsModel } from "../lib/openai-tts-config.js";
import { streamOpenAiTtsWithCache } from "../services/openaiTtsStreamCache.js";
import { ingestRlTelemetry, resolveRlStrategy } from "../services/ttsRlService.js";
import {
  isTtsRateLimitedError,
  ttsRateLimitResponseBody,
} from "../services/ttsCostGuardService.js";

export const ttsPublicRouter: IRouter = Router();

ttsPublicRouter.get("/tts/audio/:key.mp3", async (req, res): Promise<void> => {
  const key = String(req.params.key ?? "");
  if (!/^[a-f0-9]{64}$/.test(key)) {
    res.status(400).json({ error: "invalid_key" });
    return;
  }

  const streamCached = async (attempt: number): Promise<boolean> => {
    try {
      const cached = await readCachedAudio(key);
      if (cached) {
        if (cached.buffer.byteLength < MIN_TTS_BYTES) {
          if (attempt === 0) return streamCached(1);
          res.status(404).json({ error: "not_found" });
          return true;
        }
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Length", String(cached.buffer.byteLength));
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.status(200).end(cached.buffer);
        return true;
      }
      return false;
    } catch (err) {
      logger.warn(
        {
          evt: "tts.stream_read_retry",
          key,
          attempt,
          message: err instanceof Error ? err.message : String(err),
        },
        "TTS audio read failed — retrying once",
      );
      if (attempt === 0) return streamCached(1);
      throw err;
    }
  };

  try {
    const served = await streamCached(0);
    if (served) return;

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
 * POST /api/tts/generate — OpenAI TTS via BullMQ worker (cache-first).
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
  const clientVoice = parsed.data.voice?.trim();
  const mode = parsed.data.mode ?? "default";
  const category = parsed.data.category ?? "words";

  const startedAt = Date.now();
  await submitRouteAiJob({
    res,
    userId,
    type: "tts.synthesize",
    routeName: "tts/generate",
    waitMs: 0,
    input: {
      text: phrase,
      options: {
        voiceId: clientVoice && clientVoice.length > 0 ? clientVoice : getOpenAiTtsVoice(),
        speed: parsed.data.speed,
        mode,
        category,
        letterKey: letterKey || undefined,
        phonemeKey: phonemeKey || undefined,
        cvcWord: cvcWord || undefined,
        blendWord: blendWord || undefined,
      },
    },
    pollContext: { route: "tts/generate", startedAt },
    buildSyncBody: (result) => {
      const r = result as {
        cacheKey?: string;
        audioUrl?: string;
        cached?: boolean;
      };
      recordApiHealthSample({
        route: "generate",
        success: true,
        latencyMs: Date.now() - startedAt,
      });
      return {
        ok: true,
        url: r.audioUrl,
        audioUrl: r.audioUrl,
        cacheKey: r.cacheKey,
        cached: r.cached,
      };
    },
    buildAsyncBody: (jobId) => ({
      jobId,
      status: "processing",
      pollUrl: `/api/result/${jobId}`,
    }),
  });
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
    const result = await synthesizeElevenLabsFallback(
      text,
      {
        voiceId: parsed.data.voiceId ?? ELEVEN_VOICE_DEFAULT,
        modelId: parsed.data.modelId ?? ELEVEN_MODEL_DEFAULT,
        mode,
      },
      { userId, route: "tts/elevenlabs-fallback" },
    );
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
    if (isTtsRateLimitedError(err)) {
      res.status(429).json(ttsRateLimitResponseBody(err));
      return;
    }
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
  const startedAt = Date.now();

  await submitRouteAiJob({
    res,
    userId,
    type: "tts.synthesize",
    routeName: "tts/synthesize",
    waitMs: 0,
    input: {
      text: phrase,
      options: {
        voiceId: body.voice,
        mode,
        category: body.category,
        phonemeKey: parsed.data.phoneme,
        cvcWord: parsed.data.word,
        blendWord: parsed.data.blend,
      },
    },
    pollContext: { route: "tts/synthesize", startedAt },
    buildSyncBody: (result) => {
      const r = result as {
        cacheKey?: string;
        audioUrl?: string;
        cached?: boolean;
        charCount?: number;
      };
      recordApiHealthSample({
        route: "synthesize",
        success: true,
        latencyMs: Date.now() - startedAt,
      });
      return {
        ok: true,
        success: true,
        cacheKey: r.cacheKey,
        audioUrl: r.audioUrl,
        cached: r.cached,
        charCount: phrase.length,
        contentType: "audio/mpeg",
      };
    },
    buildAsyncBody: (jobId) => ({
      jobId,
      status: "processing",
      pollUrl: `/api/result/${jobId}`,
    }),
  });
});

/**
 * POST /api/tts/pregenerate
 *
 * Batch-warm TTS cache for visible phrases (phonics tiles, lesson snippets).
 * Already-cached texts are no-ops. Runs in the AI job queue when deferred.
 */
router.post("/tts/pregenerate", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (isPregenerationPaused()) {
    res.status(503).json({ error: "pregeneration_paused", ok: false });
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

  const mode = req.body?.mode === "phonics" ? ("phonics" as const) : ("default" as const);
  const validTexts = rawTexts
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= TTS_MAX_INPUT_CHARS);

  if (validTexts.length === 0) {
    res.json({ ok: true, total: 0, succeeded: 0, failed: 0, cached: 0, skipped: rawTexts.length });
    return;
  }

  const skipped = rawTexts.length - validTexts.length;

  await submitRouteAiJob({
    routeName: "tts/pregenerate",
    type: "tts.pregenerate",
    userId,
    input: { texts: validTexts, mode, userId },
    waitMs: 120_000,
    buildSyncBody: (result) => {
      const body = result as {
        ok: true;
        total: number;
        succeeded: number;
        failed: number;
        cached: number;
        skipped: number;
        rateLimited?: number;
      };
      logger.info(
        {
          evt: "tts.pregenerate",
          userId,
          total: body.total,
          succeeded: body.succeeded,
          failed: body.failed,
          cached: body.cached,
          rateLimited: body.rateLimited ?? 0,
          skipped,
          mode,
        },
        "tts pregenerate complete",
      );
      if ((body.rateLimited ?? 0) > 0 && body.succeeded === 0) {
        res.status(429);
        return {
          ...body,
          error: "tts_rate_limited",
          ok: false,
          skipped,
        };
      }
      return { ...body, skipped };
    },
    res,
  });
});

const telemetryEventSchema = z.object({
  cacheKeyHash: z.string().min(8).max(128),
  layer: z.enum(["static", "cache", "api", "elevenlabs"]),
  success: z.boolean(),
  latency: z.number().min(0).max(60_000),
  deviceClass: z.enum(["low", "mid", "high"]).or(z.string().max(16)),
  networkType: z.enum(["fast", "slow"]).or(z.string().max(16)),
  textLength: z.number().int().min(0).max(2000),
  module: z.enum(["lesson", "phonics", "catalog", "default"]).optional(),
  exploration: z.boolean().optional(),
  fromKeyHash: z.string().min(8).max(128).optional(),
  toKeyHash: z.string().min(8).max(128).optional(),
});

const telemetryBodySchema = z.object({
  events: z.array(telemetryEventSchema).min(1).max(50),
});

/**
 * POST /api/tts/telemetry — batched pipeline learning events (hashed keys only).
 */
router.post("/tts/telemetry", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = telemetryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const { accepted } = ingestTtsTelemetry(parsed.data.events);
  res.status(202).json({ ok: true, accepted });
});

const strategyQuerySchema = z.object({
  deviceClass: z.enum(["low", "mid", "high"]).optional(),
  networkType: z.enum(["fast", "slow"]).optional(),
  textLength: z.coerce.number().int().min(0).max(2000).optional(),
  module: z.enum(["lesson", "phonics", "catalog", "default"]).optional(),
});

/**
 * GET /api/tts/strategy — global layer strategy for client hybrid scoring.
 */
router.get("/tts/strategy", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = strategyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  res.json(applyPredictiveStrategyAdjustments(resolveTtsStrategy(parsed.data)));
});

/**
 * POST /api/tts/stream — streaming MP3 (cache-first, live OpenAI pipe).
 * Response: audio/mpeg with X-TTS-Cache-Key header.
 */
router.post("/tts/stream", async (req, res): Promise<void> => {
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

  const mode = parsed.data.mode ?? "default";
  const startedAt = Date.now();

  // Primary: ElevenLabs Flash v2.5 — generate once (cache-first → GCS) and
  // serve the bytes through this streaming endpoint. OpenAI stays the safety
  // net below so audio never disappears if ElevenLabs is unavailable.
  if (isElevenLabsFallbackEnabled()) {
    try {
      const el = await synthesizeElevenLabsFallback(
        phrase,
        { voiceId: ELEVEN_VOICE_DEFAULT, modelId: AMY_MODEL_ID_FLASH, mode },
        { userId, route: "tts/stream" },
      );
      if (el && isValidTtsPublicUrl(el.audioUrl)) {
        const cached = await readCachedAudio(el.cacheKey);
        if (cached && cached.buffer.byteLength >= MIN_TTS_BYTES) {
          res.setHeader("X-TTS-Cache-Key", el.cacheKey);
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Content-Length", String(cached.buffer.byteLength));
          res.status(200).end(cached.buffer);
          recordApiHealthSample({ route: "stream", success: true, latencyMs: Date.now() - startedAt });
          return;
        }
      }
    } catch (err) {
      if (isTtsRateLimitedError(err)) {
        if (!res.headersSent) res.status(429).json(ttsRateLimitResponseBody(err));
        return;
      }
      logger.warn(
        {
          evt: "tts.stream_elevenlabs_fallback_openai",
          message: err instanceof Error ? err.message : String(err),
        },
        "ElevenLabs Flash stream failed — falling back to OpenAI",
      );
    }
  }

  const clientVoice = parsed.data.voice?.trim();
  const voiceId = (clientVoice && clientVoice.length > 0 ? clientVoice : getOpenAiTtsVoice()).slice(0, 64);
  const modelId = getOpenAiTtsModel() || AMY_MODEL_ID_DEFAULT;
  const cacheKey = computeTtsCacheKey(phrase, voiceId, modelId, mode);

  if (!res.headersSent) res.setHeader("X-TTS-Cache-Key", cacheKey);

  try {
    const ok = await streamOpenAiTtsWithCache(
      res,
      {
        text: phrase,
        voiceId,
        modelId,
        mode,
        cacheKey,
      },
      { userId, route: "tts/stream" },
    );
    recordApiHealthSample({
      route: "stream",
      success: ok,
      latencyMs: Date.now() - startedAt,
      errorType: ok ? undefined : "tts_stream_failed",
    });
    if (!ok && !res.headersSent) {
      res.status(502).json({ error: "tts_stream_failed" });
    }
  } catch (err) {
    recordApiHealthSample({
      route: "stream",
      success: false,
      latencyMs: Date.now() - startedAt,
      errorType: err instanceof Error ? err.message : "tts_stream_failed",
    });
    logger.error(
      {
        evt: "tts.stream_route_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      "tts stream route failed",
    );
    if (!res.headersSent) res.status(502).json({ error: "tts_stream_failed" });
  }
});

const rlEventSchema = z.object({
  contextKey: z.string().min(4).max(64),
  layer: z.enum(["static", "cache", "api", "elevenlabs"]),
  reward: z.number().min(-2).max(2),
  ttfaMs: z.number().min(0).max(60_000),
  bufferingEvents: z.number().int().min(0).max(100),
  success: z.boolean(),
  exploration: z.boolean().optional(),
  streaming: z.boolean().optional(),
});

const rlTelemetryBodySchema = z.object({
  events: z.array(rlEventSchema).min(1).max(50),
});

/**
 * POST /api/tts/rl-telemetry — batched RL reward events.
 */
router.post("/tts/rl-telemetry", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = rlTelemetryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const { accepted } = ingestRlTelemetry(parsed.data.events);
  res.status(202).json({ ok: true, accepted });
});

/**
 * GET /api/tts/rl-strategy — aggregated Q-values for hybrid RL merge.
 */
router.get("/tts/rl-strategy", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  res.json(resolveRlStrategy());
});

export default router;
