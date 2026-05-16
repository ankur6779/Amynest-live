import { createHash } from "node:crypto";
import { db, ttsCacheTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  ttsAudioBackfillPostgres,
  ttsAudioExists,
  ttsAudioPath,
  ttsAudioRead,
  ttsAudioWrite,
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
 * ever call ElevenLabs once — audio is stored in GCS (Replit) or Postgres
 * bytea (Render) and reused by all users.
 */
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

  const existing = await db
    .select()
    .from(ttsCacheTable)
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .limit(1);

  const row = existing[0];
  if (row && (await ttsAudioExists(cacheKey, row.audioData))) {
    const readable = await ttsAudioRead(cacheKey, row.audioData);
    if (readable) {
      void ttsAudioBackfillPostgres(cacheKey, readable);
      void db
        .update(ttsCacheTable)
        .set({ hitCount: sql`${ttsCacheTable.hitCount} + 1`, lastAccessedAt: sql`now()` })
        .where(eq(ttsCacheTable.cacheKey, cacheKey))
        .catch(() => {});

      logger.info({ evt: "tts.cache_hit", cacheKey, charCount: text.length, voiceId }, "tts cache hit");

      return {
        cacheKey,
        audioPath: row.audioPath,
        contentType: row.contentType,
        charCount: row.charCount,
        cached: true,
      };
    }
    logger.warn(
      { evt: "tts.stale_cache_row", cacheKey, charCount: text.length },
      "tts cache metadata present but audio bytes missing — regenerating",
    );
  }

  const pending = inFlight.get(cacheKey);
  if (pending) {
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

async function generateAndStore(args: GenerateArgs): Promise<SynthesizeResult> {
  const { text, voiceId, modelId, mode, cacheKey, audioPath } = args;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("tts_missing_api_key");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
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
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    logger.error(
      { evt: "tts.upstream_error", status: response.status, detail: detail.slice(0, 500), voiceId },
      "elevenlabs synthesize failed",
    );
    throw new Error(`tts_upstream_${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0) throw new Error("tts_empty_audio");

  const contentType = response.headers.get("content-type") ?? "audio/mpeg";

  await db
    .insert(ttsCacheTable)
    .values({
      cacheKey,
      text,
      voiceId,
      modelId,
      audioPath,
      contentType,
      charCount: text.length,
      hitCount: 0,
    })
    .onConflictDoUpdate({
      target: ttsCacheTable.cacheKey,
      set: {
        audioPath,
        contentType,
        charCount: text.length,
        lastAccessedAt: sql`now()`,
      },
    });

  const { storedInPostgres } = await ttsAudioWrite(cacheKey, buffer, contentType);

  if (storedInPostgres) {
    await db
      .update(ttsCacheTable)
      .set({ audioData: buffer })
      .where(eq(ttsCacheTable.cacheKey, cacheKey));
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
      storage: storedInPostgres ? "postgres" : ttsStorageBackend(),
    },
    storedInPostgres ? "tts generated and cached in Postgres" : "tts generated and cached in GCS",
  );

  return { cacheKey, audioPath, contentType, charCount: text.length, cached: false };
}

/** Download a previously cached MP3. */
export async function readCachedAudio(
  cacheKey: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const rows = await db
    .select()
    .from(ttsCacheTable)
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .limit(1);
  if (rows.length === 0) return null;

  const row = rows[0]!;
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

  return { buffer, contentType: rows[0]!.contentType };
}
