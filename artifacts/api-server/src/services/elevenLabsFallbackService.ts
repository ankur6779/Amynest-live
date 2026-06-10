import { createHash } from "node:crypto";
import { db, ttsCacheTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  getElevenLabsApiKey,
  isElevenLabsFallbackEnabled,
  parseEnvMs,
} from "../lib/env";
import { logger } from "../lib/logger";
import { fetchWithTimeout } from "../utils/fetch-with-timeout.js";
import {
  isValidTtsPublicUrl,
  resolveTtsPlaybackUrl,
  ttsAudioExists,
  ttsAudioPath,
  ttsGcsUpload,
  ttsStorageBackend,
  computeTtsContentSha256,
  purgeStaleTtsCacheRow,
} from "./ttsAudioStore";
import type { TtsGenerationContext } from "./ttsGenerate.js";
import {
  assertTtsCacheMissAllowed,
  refundTtsDailyMiss,
  recordTtsCacheHit,
  recordTtsCacheMissAndGenerated,
  TtsRateLimitedError,
} from "./ttsCostGuardService.js";
import {
  AMY_TTS_MODEL_ID,
  AMY_TTS_OUTPUT_FORMAT,
  AMY_TTS_VOICE_ID,
  getAmyTtsModelId,
  getAmyTtsVoiceId,
} from "../lib/amy-tts-config.js";
import { VOICE_SETTINGS } from "./elevenLabsVoiceSettings.js";
import { withTtsInflightGeneration } from "./ttsInflightGeneration.js";
import { recordTtsLatencySample } from "./ttsLatencyMetrics.js";

// ─── Indian ElevenLabs Voice IDs ────────────────────────────────────────────
export const AMY_VOICE_ID_EN_FEMALE = AMY_TTS_VOICE_ID;
export const AMY_VOICE_ID_EN_MALE = "oaz5NvoRIhcJystOASAA";
export const AMY_VOICE_ID_HI_FEMALE = "TllHtNijgXBd45uTSCS7";
export const AMY_VOICE_ID_HI_MALE = "2cdvnKJ5TZi631y5PN1s";

/** Canonical Amy voice + model — re-exported for legacy imports. */
export const AMY_VOICE_ID_DEFAULT = AMY_TTS_VOICE_ID;
export const AMY_MODEL_ID_DEFAULT = AMY_TTS_MODEL_ID;
export const AMY_MODEL_ID_FLASH = AMY_TTS_MODEL_ID;
export const AMY_VOICE_ID_HINDI = AMY_VOICE_ID_HI_FEMALE;
export const AMY_MODEL_ID_HINDI = AMY_TTS_MODEL_ID;

// Hard guard against huge payloads.
export const TTS_MAX_INPUT_CHARS = 4000;

/** Hard cap on ElevenLabs round-trip so TTS never blocks the server. */
const TTS_ELEVENLABS_TIMEOUT_MS = 5_000;

/**
 * `default` = the warm conversational Amy voice used for stories, coaching,
 *             reels, etc. Stability=0.5, similarity=0.75, style=0.
 * `phonics` = TIGHT pronunciation tuned for teaching phonemes to children:
 *             higher stability so the same letter sound never drifts, max
 *             similarity_boost to keep the voice timbre crisp on very short
 *             inputs ("buh", "ah", "shhh"), and zero style so the model
 *             does not embellish a 2-letter input with extra emoting that
 *             would distort the phoneme. The cache key is namespaced so a
 *             given text rendered in `phonics` mode never collides with the
 *             same text rendered in `default` mode.
 */
export type SynthesizeMode = "default" | "phonics";

export interface SynthesizeOptions {
  voiceId?: string;
  modelId?: string;
  mode?: SynthesizeMode;
}

export interface SynthesizeResult {
  cacheKey: string;
  audioPath: string;
  audioUrl: string;
  contentType: string;
  charCount: number;
  cached: boolean;
}

export function inferSynthesizeModeFromCacheKey(
  cacheKey: string,
  text: string,
  voiceId: string,
  modelId: string,
): SynthesizeMode {
  const defaultKey = computeTtsCacheKey(text, voiceId, modelId, "default");
  return cacheKey === defaultKey ? "default" : "phonics";
}

export function computeTtsCacheKey(
  text: string,
  voiceId: string,
  modelId: string,
  mode: SynthesizeMode,
): string {
  if (mode === "default") {
    return createHash("sha256")
      .update(`${modelId}|${voiceId}|${text}`)
      .digest("hex");
  }
  return createHash("sha256")
    .update(`\x00mode=${mode}\x00${modelId}\x00${voiceId}\x00${text}`)
    .digest("hex");
}

/**
 * Synthesize text → MP3 using ElevenLabs.
 *
 * Content-addressed cache: identical (text, voiceId, modelId) inputs only
 * ever call ElevenLabs once — audio is stored in GCS (Render) or Postgres
 * bytea (local dev without GCS) and reused by all users.
 */
/** Fast path: return cached audio metadata only (no ElevenLabs). */
export async function trySynthesizeFromCache(
  rawText: string,
  options: SynthesizeOptions = {},
): Promise<SynthesizeResult | null> {
  const text = rawText.trim();
  if (!text) return null;

  const voiceId = options.voiceId?.trim() || getAmyTtsVoiceId();
  const modelId = options.modelId?.trim() || getAmyTtsModelId();
  const mode: SynthesizeMode = options.mode ?? "default";
  const cacheKey = computeTtsCacheKey(text, voiceId, modelId, mode);

  const existing = await db
    .select()
    .from(ttsCacheTable)
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .limit(1);

  const row = existing[0];
  if (!row || !(await ttsAudioExists(cacheKey, row))) return null;

  const audioUrl = resolveTtsPlaybackUrl(cacheKey, row);
  void db
    .update(ttsCacheTable)
    .set({
      hitCount: sql`${ttsCacheTable.hitCount} + 1`,
      lastAccessedAt: sql`now()`,
    })
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .catch(() => {});

  return {
    cacheKey,
    audioPath: row.audioPath,
    audioUrl,
    contentType: row.contentType,
    charCount: row.charCount,
    cached: true,
  };
}

function emitCacheHit(ctx: TtsGenerationContext | undefined): void {
  if (ctx) recordTtsCacheHit(ctx.userId, ctx.route);
}

/** Amy voice fallback — cache-first, then live ElevenLabs when API key is set. */
export async function synthesizeElevenLabsFallback(
  rawText: string,
  options: SynthesizeOptions = {},
  ctx?: TtsGenerationContext,
): Promise<SynthesizeResult> {
  if (!isElevenLabsFallbackEnabled()) {
    throw new Error("tts_elevenlabs_fallback_disabled");
  }
  const text = rawText.trim();
  if (!text) throw new Error("tts_empty_text");
  if (text.length > TTS_MAX_INPUT_CHARS) throw new Error("tts_text_too_long");

  const voiceId = options.voiceId?.trim() || getAmyTtsVoiceId();
  const modelId = options.modelId?.trim() || getAmyTtsModelId();
  const mode: SynthesizeMode = options.mode ?? "default";
  const cacheKey = computeTtsCacheKey(text, voiceId, modelId, mode);
  const audioPath = ttsAudioPath(cacheKey);

  const cachedOnly = await trySynthesizeFromCache(text, { voiceId, modelId, mode });
  if (cachedOnly) {
    emitCacheHit(ctx);
    return cachedOnly;
  }

  const existing = await db
    .select()
    .from(ttsCacheTable)
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .limit(1);

  const row = existing[0];
  if (row && (await ttsAudioExists(cacheKey, row))) {
    const audioUrl = resolveTtsPlaybackUrl(cacheKey, row);

    void db
      .update(ttsCacheTable)
      .set({
        hitCount: sql`${ttsCacheTable.hitCount} + 1`,
        lastAccessedAt: sql`now()`,
        ...(!row.audioUrl && audioUrl.startsWith("https://") ? { audioUrl } : {}),
      })
      .where(eq(ttsCacheTable.cacheKey, cacheKey))
      .catch(() => {});

    logger.info(
      { evt: "tts.cache_hit", cacheKey, charCount: text.length, voiceId, storage: ttsStorageBackend() },
      "TTS: cache hit",
    );

    emitCacheHit(ctx);
    return {
      cacheKey,
      audioPath: row.audioPath,
      audioUrl,
      contentType: row.contentType,
      charCount: row.charCount,
      cached: true,
    };
  }

  if (row) {
    logger.warn(
      { evt: "tts.stale_cache_row", cacheKey, charCount: text.length },
      "tts cache metadata present but audio missing — regenerating",
    );
    await purgeStaleTtsCacheRow(cacheKey);
  }

  let guardPremium: boolean | undefined;
  if (ctx) {
    const guard = await assertTtsCacheMissAllowed(ctx.userId, ctx.route);
    if (!guard.ok) {
      throw new TtsRateLimitedError(guard);
    }
    guardPremium = guard.isPremium;
  }

  return withTtsInflightGeneration(cacheKey, async () => {
    const raced = await trySynthesizeFromCache(text, { voiceId, modelId, mode });
    if (raced) {
      emitCacheHit(ctx);
      return raced;
    }
    try {
      const genStarted = performance.now();
      const result = await generateAndStore({ text, voiceId, modelId, mode, cacheKey, audioPath });
      if (ctx) {
        recordTtsCacheMissAndGenerated(ctx.userId, ctx.route, guardPremium);
      }
      recordTtsLatencySample({
        route: ctx?.route ?? "tts/generate",
        provider: "elevenlabs",
        cacheHit: false,
        generationMs: Math.round(performance.now() - genStarted),
        streaming: false,
        modelId,
        voiceId,
        charCount: text.length,
      });
      return result;
    } catch (err) {
      if (ctx && !(err instanceof TtsRateLimitedError)) {
        await refundTtsDailyMiss(ctx.userId, 1);
      }
      throw err;
    }
  });
}

interface GenerateArgs {
  text: string;
  voiceId: string;
  modelId: string;
  mode: SynthesizeMode;
  cacheKey: string;
  audioPath: string;
}

function logElevenLabsKeyHint(): void {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    logger.warn({ evt: "elevenlabs.key_missing" }, "[ElevenLabs] API key not configured");
    return;
  }
  logger.info(
    { evt: "elevenlabs.key_present", keySuffix: apiKey.slice(-4) },
    "[ElevenLabs] API key loaded",
  );
}

async function generateAndStore(args: GenerateArgs): Promise<SynthesizeResult> {
  const { text, voiceId, modelId, mode, cacheKey, audioPath } = args;

  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    logElevenLabsKeyHint();
    throw new Error("tts_missing_api_key");
  }

  const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${AMY_TTS_OUTPUT_FORMAT}`;
  const aiStarted = performance.now();

  logger.info(
    {
      evt: "elevenlabs.request_start",
      cacheKey,
      charCount: text.length,
      voiceId,
      modelId,
      mode,
      keySuffix: apiKey.slice(-4),
    },
    "[ElevenLabs] Request start",
  );

  const fetchTimeoutMs = Math.min(
    TTS_ELEVENLABS_TIMEOUT_MS,
    parseEnvMs("AI_JOB_TIMEOUT_MS", 30_000),
  );
  const elevenFetch = fetchWithTimeout(elevenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: VOICE_SETTINGS[mode],
    }),
    timeoutMs: fetchTimeoutMs,
  });
  const hardTimeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("TTS timeout")), TTS_ELEVENLABS_TIMEOUT_MS);
  });
  let response: Awaited<ReturnType<typeof fetchWithTimeout>>;
  try {
    response = await Promise.race([elevenFetch, hardTimeout]);
  } catch (err) {
    console.error("[ElevenLabs] failed", err instanceof Error ? err.message : err);
    throw err;
  }

  const aiDurationMs = Math.round(performance.now() - aiStarted);

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[ElevenLabs] failed", response.status, detail.slice(0, 200));
    logger.error(
      {
        evt: "elevenlabs.error",
        status: response.status,
        durationMs: aiDurationMs,
        detail: detail.slice(0, 500),
        voiceId,
      },
      `[ElevenLabs] Error: HTTP ${response.status}`,
    );
    throw new Error(`tts_upstream_${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer || buffer.byteLength === 0) {
    console.error("[ElevenLabs] failed — empty audio buffer");
    logger.error({ evt: "elevenlabs.empty_audio", durationMs: aiDurationMs }, "[ElevenLabs] Error: empty audio body");
    throw new Error("tts_empty_audio");
  }

  logger.info(
    {
      evt: "elevenlabs.response_success",
      durationMs: aiDurationMs,
      bytes: buffer.byteLength,
      voiceId,
      modelId,
    },
    "[ElevenLabs] Response success",
  );

  const contentType = "audio/mpeg";
  const backend = ttsStorageBackend();
  let storeBytesInPostgres = backend === "postgres";

  let audioUrl: string | null = null;
  if (!storeBytesInPostgres) {
    const upload = await ttsGcsUpload(cacheKey, buffer, contentType);
    if (!upload.success) {
      logger.error(
        { evt: "tts.gcs_upload_failed", cacheKey, error: upload.error },
        "GCS upload failed — falling back to Postgres bytea",
      );
      storeBytesInPostgres = true;
      audioUrl = null;
    } else {
      audioUrl = upload.publicUrl;
      console.log("[TTS GENERATED]", { text: text.slice(0, 120), publicUrl: upload.publicUrl });
    }
  }

  try {
    const contentSha256 = computeTtsContentSha256(buffer);
    await db
      .insert(ttsCacheTable)
      .values({
        cacheKey,
        text,
        voiceId,
        modelId,
        audioPath,
        audioUrl,
        contentType,
        contentSha256,
        charCount: text.length,
        hitCount: 0,
        audioData: storeBytesInPostgres ? buffer : null,
      })
      .onConflictDoUpdate({
        target: ttsCacheTable.cacheKey,
        set: {
          text,
          voiceId,
          modelId,
          audioPath,
          audioUrl,
          contentType,
          contentSha256,
          charCount: text.length,
          ...(storeBytesInPostgres ? { audioData: buffer } : { audioData: null }),
          lastAccessedAt: sql`now()`,
        },
      });
  } catch (err) {
    logger.error(
      {
        evt: "tts.db_write_failed",
        cacheKey,
        message: err instanceof Error ? err.message : String(err),
      },
      "TTS: failed to save cache metadata to database",
    );
    throw err;
  }

  logger.info({ evt: "tts.saved_to_db", cacheKey, storage: backend }, "TTS: saved to DB");

  if (storeBytesInPostgres) {
    logger.info(
      { evt: "tts.saved_to_database", cacheKey, bytes: buffer.byteLength },
      "TTS: saved to database",
    );
  }

  const playbackUrl = resolveTtsPlaybackUrl(cacheKey, { audioUrl });
  if (!isValidTtsPublicUrl(playbackUrl)) {
    console.error("Invalid audio URL", playbackUrl);
    throw new Error("tts_invalid_audio_url");
  }

  logger.info(
    {
      evt: "tts.cache_miss",
      cacheKey,
      charCount: text.length,
      bytes: buffer.byteLength,
      voiceId,
      modelId,
      mode,
      storage: storeBytesInPostgres ? "postgres" : "gcs",
    },
    storeBytesInPostgres ? "TTS: generated and cached in Postgres" : "TTS: generated and cached in GCS",
  );

  return {
    cacheKey,
    audioPath,
    audioUrl: playbackUrl,
    contentType,
    charCount: text.length,
    cached: false,
  };
}

