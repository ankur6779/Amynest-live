import { createHash } from "node:crypto";
import { db, ttsCacheTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getOpenAiTtsModel, getOpenAiTtsVoice } from "../lib/openai-tts-config.js";
import { logger } from "../lib/logger.js";
import {
  resolveTtsPlaybackUrl,
  ttsAudioBackfillPostgres,
  ttsAudioExists,
  ttsAudioRead,
} from "./ttsAudioStore.js";

/** OpenAI voice + model defaults (content-addressed cache). */
export const AMY_VOICE_ID_DEFAULT = getOpenAiTtsVoice();
export const AMY_MODEL_ID_DEFAULT = getOpenAiTtsModel();

export const TTS_MAX_INPUT_CHARS = 4000;

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

/** Fast path: return cached audio metadata only (no upstream TTS). */
export async function trySynthesizeFromCache(
  rawText: string,
  options: SynthesizeOptions = {},
): Promise<SynthesizeResult | null> {
  const text = rawText.trim();
  if (!text) return null;

  const voiceId = options.voiceId?.trim() || AMY_VOICE_ID_DEFAULT;
  const modelId = options.modelId?.trim() || AMY_MODEL_ID_DEFAULT;
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

  const buffer = await ttsAudioRead(cacheKey, row.audioData, row.contentSha256);
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
