import { db, ttsCacheTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import type { SynthesizeMode } from "./ttsCacheService.js";
import {
  isTtsCacheGcsEnabled,
  legacyGcsConfigured,
  ttsAudioPath,
  ttsGcsUpload,
  ttsStorageBackend,
} from "./ttsAudioStore.js";

export type OpenAiTtsPersistParams = {
  cacheKey: string;
  text: string;
  voiceId: string;
  modelId: string;
  mode: SynthesizeMode;
  buffer: Buffer;
};

/**
 * Save OpenAI-generated MP3 to GCS (or Postgres bytea fallback). Never throws —
 * failures are logged only so live playback cannot crash the API process.
 */
export async function persistOpenAiTtsCache(params: OpenAiTtsPersistParams): Promise<void> {
  const { cacheKey, text, voiceId, modelId, mode, buffer } = params;
  if (!buffer.byteLength) {
    logger.warn({ evt: "openai.tts_persist_skip", cacheKey, reason: "empty_buffer" }, "skip persist");
    return;
  }

  const contentType = "audio/mpeg";
  const audioPath = ttsAudioPath(cacheKey);
  const playbackPath = `/api/tts/audio/${cacheKey}.mp3`;

  let storeBytesInPostgres = !isTtsCacheGcsEnabled() || !legacyGcsConfigured();
  let storedGcsUrl: string | null = null;

  if (!storeBytesInPostgres) {
    try {
      const upload = await ttsGcsUpload(cacheKey, buffer, contentType);
      if (upload.success) {
        storedGcsUrl = upload.publicUrl;
      } else {
        logger.warn(
          { evt: "openai.tts_gcs_upload_failed", cacheKey, error: upload.error },
          "OpenAI TTS GCS upload failed — Postgres fallback",
        );
        storeBytesInPostgres = true;
      }
    } catch (err) {
      logger.warn(
        {
          evt: "openai.tts_gcs_upload_failed",
          cacheKey,
          message: err instanceof Error ? err.message : String(err),
        },
        "OpenAI TTS GCS upload threw — Postgres fallback",
      );
      storeBytesInPostgres = true;
    }
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
        audioUrl: playbackPath,
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
          audioUrl: playbackPath,
          contentType,
          charCount: text.length,
          ...(storeBytesInPostgres ? { audioData: buffer } : { audioData: null }),
          lastAccessedAt: sql`now()`,
        },
      });
  } catch (err) {
    logger.error(
      {
        evt: "openai.tts_db_persist_failed",
        cacheKey,
        message: err instanceof Error ? err.message : String(err),
      },
      "OpenAI TTS metadata persist failed",
    );
    return;
  }

  logger.info(
    {
      evt: "openai.tts_persisted",
      cacheKey,
      bytes: buffer.byteLength,
      storage: storeBytesInPostgres ? "postgres" : ttsStorageBackend(),
      mode,
      gcs: Boolean(storedGcsUrl),
    },
    "OpenAI TTS cached for reuse",
  );
}
