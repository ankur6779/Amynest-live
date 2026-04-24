import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { db, ttsCacheTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

// ─── Defaults ───────────────────────────────────────────────────────────────
// "Rachel" — calm, mature female narrator; the safest default for the "Amy"
// persona. We expose voiceId so individual call sites can override per use.
export const AMY_VOICE_ID_DEFAULT = "21m00Tcm4TlvDq8ikWAM";
// Turbo v2.5 — half the cost of standard quality, latency optimised, still
// natural sounding. Right balance for Read-Aloud features.
export const AMY_MODEL_ID_DEFAULT = "eleven_turbo_v2_5";

// Hard guard against huge payloads — anything bigger almost certainly belongs
// in a different feature (full article narration etc.) and we want to think
// about cost before we wire it up.
export const TTS_MAX_INPUT_CHARS = 4000;

// Where MP3 blobs live on disk. Local FS is fine for a cache because cache
// misses are recoverable (we just regenerate the audio on-demand).
const CACHE_DIR = path.resolve(process.cwd(), "data", "tts-cache");

let cacheDirReady: Promise<void> | null = null;
function ensureCacheDir(): Promise<void> {
  if (!cacheDirReady) cacheDirReady = fs.mkdir(CACHE_DIR, { recursive: true }).then(() => {});
  return cacheDirReady;
}

// Single shared connectors client (handles auth + token refresh internally).
const connectors = new ReplitConnectors();

// In-flight single-flight map: if two callers ask for the same cacheKey at the
// same time we want exactly one ElevenLabs call (and one disk write). Without
// this, a burst of identical requests on a cold cache pays for N synths even
// though we'll only ever store one. Keyed by cacheKey; entries removed in a
// finally so failures don't permanently block the key.
const inFlight = new Map<string, Promise<SynthesizeResult>>();

export interface SynthesizeOptions {
  voiceId?: string;
  modelId?: string;
}

export interface SynthesizeResult {
  cacheKey: string;
  audioPath: string;
  contentType: string;
  charCount: number;
  cached: boolean;
}

function computeCacheKey(text: string, voiceId: string, modelId: string): string {
  return createHash("sha256")
    .update(`${modelId}|${voiceId}|${text}`)
    .digest("hex");
}

function audioPathFor(cacheKey: string): string {
  return path.join(CACHE_DIR, `${cacheKey}.mp3`);
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Synthesize text → MP3 using ElevenLabs, with a content-addressed disk +
 * DB cache. Identical (text, voiceId, modelId) inputs only ever cost money
 * once — every subsequent call reuses the on-disk MP3.
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

  const cacheKey = computeCacheKey(text, voiceId, modelId);
  const audioPath = audioPathFor(cacheKey);

  // Cache lookup. We re-validate that the file is still on disk because the
  // container's data dir is not durable across rebuilds — if the row exists
  // but the file is gone, regenerate.
  const existing = await db
    .select()
    .from(ttsCacheTable)
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .limit(1);

  if (existing.length > 0 && (await fileExists(audioPath))) {
    await db
      .update(ttsCacheTable)
      .set({
        hitCount: sql`${ttsCacheTable.hitCount} + 1`,
        lastAccessedAt: sql`now()`,
      })
      .where(eq(ttsCacheTable.cacheKey, cacheKey));

    logger.info(
      { evt: "tts.cache_hit", cacheKey, charCount: text.length, voiceId },
      "tts cache hit",
    );

    return {
      cacheKey,
      audioPath,
      contentType: existing[0]!.contentType,
      charCount: existing[0]!.charCount,
      cached: true,
    };
  }

  // Single-flight: if another request for the same cacheKey is already
  // generating, await its result instead of issuing a parallel ElevenLabs
  // call. Marked `cached: true` because *this* caller didn't pay for a synth.
  const pending = inFlight.get(cacheKey);
  if (pending) {
    const result = await pending;
    return { ...result, cached: true };
  }

  // Cache miss → call ElevenLabs. Register our promise BEFORE awaiting so any
  // concurrent caller for the same key joins us instead of duplicating work.
  const generation = generateAndStore({ text, voiceId, modelId, cacheKey, audioPath });
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
  cacheKey: string;
  audioPath: string;
}

async function generateAndStore(args: GenerateArgs): Promise<SynthesizeResult> {
  const { text, voiceId, modelId, cacheKey, audioPath } = args;
  await ensureCacheDir();

  const response = await connectors.proxy(
    "elevenlabs",
    `/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
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
  if (buffer.byteLength === 0) {
    throw new Error("tts_empty_audio");
  }

  const contentType = response.headers.get("content-type") ?? "audio/mpeg";
  await fs.writeFile(audioPath, buffer);

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

  logger.info(
    {
      evt: "tts.cache_miss",
      cacheKey,
      charCount: text.length,
      bytes: buffer.byteLength,
      voiceId,
      modelId,
    },
    "tts generated and cached",
  );

  return { cacheKey, audioPath, contentType, charCount: text.length, cached: false };
}

// Public API surface above; helpers below.
/** Streamable read of a previously cached MP3 (raw buffer). */
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

  if (!(await fileExists(row.audioPath))) return null;

  const buffer = await fs.readFile(row.audioPath);

  // Best-effort metadata bump; don't block the stream on it.
  void db
    .update(ttsCacheTable)
    .set({
      hitCount: sql`${ttsCacheTable.hitCount} + 1`,
      lastAccessedAt: sql`now()`,
    })
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .catch(() => {});

  return { buffer, contentType: row.contentType };
}
