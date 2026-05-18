import { createHash } from "node:crypto";
import { db, ttsCacheTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getElevenLabsApiKey } from "../lib/env";
import { logger } from "../lib/logger";
import { fetchWithTimeout } from "../utils/fetch-with-timeout.js";
import {
  resolveTtsPlaybackUrl,
  ttsAudioBackfillPostgres,
  ttsAudioExists,
  ttsAudioPath,
  ttsAudioRead,
  ttsGcsUpload,
  ttsPublicGcsUrl,
  ttsStorageBackend,
} from "./ttsAudioStore";

// ─── Indian ElevenLabs Voice IDs ────────────────────────────────────────────
// English Indian Female — Ananya K (Clear & Polished Indian Reel Voice)
export const AMY_VOICE_ID_EN_FEMALE = "QbQKfe9vgx5OsbZUvlFv";
// English Indian Male — Karthik (Indian AI Voice)
export const AMY_VOICE_ID_EN_MALE   = "oaz5NvoRIhcJystOASAA";
// Hindi Female — Anjura (Calm & Warm Hindi Agent)
export const AMY_VOICE_ID_HI_FEMALE = "TllHtNijgXBd45uTSCS7";
// Hindi Male — Rahul S (Professional Hindi Conversational Voice)
export const AMY_VOICE_ID_HI_MALE   = "2cdvnKJ5TZi631y5PN1s";

// Defaults (English Indian Female)
export const AMY_VOICE_ID_DEFAULT = AMY_VOICE_ID_EN_FEMALE;
export const AMY_MODEL_ID_DEFAULT = "eleven_turbo_v2_5";

// Hindi defaults
export const AMY_VOICE_ID_HINDI = AMY_VOICE_ID_HI_FEMALE;
export const AMY_MODEL_ID_HINDI  = "eleven_multilingual_v2";

// Hard guard against huge payloads.
export const TTS_MAX_INPUT_CHARS = 4000;

// ─── In-flight single-flight map ────────────────────────────────────────────
const inFlight = new Map<string, Promise<SynthesizeResult>>();

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
  const defaultKey = computeCacheKey(text, voiceId, modelId, "default");
  return cacheKey === defaultKey ? "default" : "phonics";
}

function computeCacheKey(
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

/** Per-mode ElevenLabs voice settings. See SynthesizeMode docstring for rationale. */
const VOICE_SETTINGS: Record<SynthesizeMode, {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}> = {
  default: { stability: 0.5,  similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
  phonics: { stability: 0.85, similarity_boost: 0.85, style: 0.0, use_speaker_boost: true },
};

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

  const voiceId = options.voiceId?.trim() || AMY_VOICE_ID_DEFAULT;
  const modelId = options.modelId?.trim() || AMY_MODEL_ID_DEFAULT;
  const mode: SynthesizeMode = options.mode ?? "default";
  const cacheKey = computeCacheKey(text, voiceId, modelId, mode);

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

export async function synthesize(
  rawText: string,
  options: SynthesizeOptions = {},
): Promise<SynthesizeResult> {
  const text = rawText.trim();
  if (!text) throw new Error("tts_empty_text");
  if (text.length > TTS_MAX_INPUT_CHARS) throw new Error("tts_text_too_long");

  const voiceId = options.voiceId?.trim() || AMY_VOICE_ID_DEFAULT;
  const modelId = options.modelId?.trim() || AMY_MODEL_ID_DEFAULT;
  const mode: SynthesizeMode = options.mode ?? "default";
  const cacheKey = computeCacheKey(text, voiceId, modelId, mode);
  const audioPath = ttsAudioPath(cacheKey);

  const cachedOnly = await trySynthesizeFromCache(text, options);
  if (cachedOnly) return cachedOnly;

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
  }

  const pending = inFlight.get(cacheKey);
  if (pending) {
    logger.info({ evt: "tts.in_flight_wait", cacheKey, charCount: text.length }, "TTS: waiting on in-flight generation");
    const result = await pending;
    return { ...result, cached: true };
  }

  const generation = generateAndStore({ text, voiceId, modelId, mode, cacheKey, audioPath });
  inFlight.set(cacheKey, generation);
  try {
    return await generation;
  } finally {
    inFlight.delete(cacheKey);
  }
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

  const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
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

  const aiTimeoutMs = Number(process.env.AI_JOB_TIMEOUT_MS ?? "10_000");
  const response = await fetchWithTimeout(elevenUrl, {
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
    timeoutMs: aiTimeoutMs,
  });

  const aiDurationMs = Math.round(performance.now() - aiStarted);

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
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
  if (buffer.byteLength === 0) {
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
  const storeBytesInPostgres = backend === "postgres";

  let audioUrl: string | null = null;
  if (!storeBytesInPostgres) {
    audioUrl = await ttsGcsUpload(cacheKey, buffer, contentType);
  } else {
    audioUrl = null;
  }

  try {
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

  const playbackUrl = resolveTtsPlaybackUrl(cacheKey);

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

/** Download a previously cached MP3 (for API streaming endpoints). */
export async function readCachedAudio(
  cacheKey: string,
): Promise<{ buffer: Buffer; contentType: string; audioUrl?: string } | null> {
  const rows = await db
    .select()
    .from(ttsCacheTable)
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .limit(1);
  if (rows.length === 0) return null;

  const row = rows[0]!;
  const playbackUrl = resolveTtsPlaybackUrl(cacheKey, row);

  let buffer = await ttsAudioRead(cacheKey, row.audioData);
  if (!buffer && row.text) {
    const mode = inferSynthesizeModeFromCacheKey(cacheKey, row.text, row.voiceId, row.modelId);
    try {
      await synthesize(row.text, { voiceId: row.voiceId, modelId: row.modelId, mode });
      const refreshed = await db
        .select()
        .from(ttsCacheTable)
        .where(eq(ttsCacheTable.cacheKey, cacheKey))
        .limit(1);
      buffer = await ttsAudioRead(cacheKey, refreshed[0]?.audioData);
    } catch (err) {
      logger.warn(
        {
          evt: "tts.stream_repair_failed",
          cacheKey,
          message: err instanceof Error ? err.message : String(err),
        },
        "failed to repair missing TTS audio on stream",
      );
    }
  }
  if (!buffer) return null;

  void ttsAudioBackfillPostgres(cacheKey, buffer);

  void db
    .update(ttsCacheTable)
    .set({ hitCount: sql`${ttsCacheTable.hitCount} + 1`, lastAccessedAt: sql`now()` })
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .catch(() => {});

  return {
    buffer,
    contentType: row.contentType,
    audioUrl: playbackUrl.startsWith("https://") ? playbackUrl : undefined,
  };
}
