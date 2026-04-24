import { createHash } from "node:crypto";
import { Storage } from "@google-cloud/storage";
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

// Hard guard against huge payloads.
export const TTS_MAX_INPUT_CHARS = 4000;

// GCS object prefix for all TTS audio files.
const GCS_PREFIX = "tts-cache";

// ─── GCS client (Replit sidecar auth) ───────────────────────────────────────
const REPLIT_SIDECAR = "http://127.0.0.1:1106";

const gcsClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  } as never,
  projectId: "",
});

function getBucket() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  return gcsClient.bucket(bucketId);
}

function gcsObjectName(cacheKey: string): string {
  return `${GCS_PREFIX}/${cacheKey}.mp3`;
}

async function gcsFileExists(cacheKey: string): Promise<boolean> {
  try {
    const [exists] = await getBucket().file(gcsObjectName(cacheKey)).exists();
    return exists;
  } catch {
    return false;
  }
}

async function gcsUpload(cacheKey: string, buffer: Buffer, contentType: string): Promise<void> {
  const file = getBucket().file(gcsObjectName(cacheKey));
  await file.save(buffer, { contentType, resumable: false });
}

async function gcsDownload(cacheKey: string): Promise<Buffer | null> {
  try {
    const [buffer] = await getBucket().file(gcsObjectName(cacheKey)).download();
    return buffer;
  } catch {
    return null;
  }
}

// ─── In-flight single-flight map ────────────────────────────────────────────
// If two callers ask for the same cacheKey simultaneously, only one ElevenLabs
// call is made — the second awaits the first's result.
const inFlight = new Map<string, Promise<SynthesizeResult>>();

export interface SynthesizeOptions {
  voiceId?: string;
  modelId?: string;
}

export interface SynthesizeResult {
  cacheKey: string;
  audioPath: string; // GCS object name (tts-cache/<key>.mp3)
  contentType: string;
  charCount: number;
  cached: boolean;
}

function computeCacheKey(text: string, voiceId: string, modelId: string): string {
  return createHash("sha256")
    .update(`${modelId}|${voiceId}|${text}`)
    .digest("hex");
}

/**
 * Synthesize text → MP3 using ElevenLabs.
 *
 * Content-addressed cache: identical (text, voiceId, modelId) inputs only
 * ever call ElevenLabs once — the MP3 is stored in GCS and reused by ALL
 * users forever, surviving server restarts.
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
  const audioPath = gcsObjectName(cacheKey);

  // DB + GCS cache check.
  const existing = await db
    .select()
    .from(ttsCacheTable)
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .limit(1);

  if (existing.length > 0 && (await gcsFileExists(cacheKey))) {
    void db
      .update(ttsCacheTable)
      .set({ hitCount: sql`${ttsCacheTable.hitCount} + 1`, lastAccessedAt: sql`now()` })
      .where(eq(ttsCacheTable.cacheKey, cacheKey))
      .catch(() => {});

    logger.info({ evt: "tts.cache_hit", cacheKey, charCount: text.length, voiceId }, "tts cache hit");

    return {
      cacheKey,
      audioPath,
      contentType: existing[0]!.contentType,
      charCount: existing[0]!.charCount,
      cached: true,
    };
  }

  // Single-flight dedup.
  const pending = inFlight.get(cacheKey);
  if (pending) {
    const result = await pending;
    return { ...result, cached: true };
  }

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
  if (buffer.byteLength === 0) throw new Error("tts_empty_audio");

  const contentType = response.headers.get("content-type") ?? "audio/mpeg";

  // Upload to GCS — survives restarts, shared across all users.
  await gcsUpload(cacheKey, buffer, contentType);

  await db
    .insert(ttsCacheTable)
    .values({ cacheKey, text, voiceId, modelId, audioPath, contentType, charCount: text.length, hitCount: 0 })
    .onConflictDoUpdate({
      target: ttsCacheTable.cacheKey,
      set: { audioPath, contentType, charCount: text.length, lastAccessedAt: sql`now()` },
    });

  logger.info(
    { evt: "tts.cache_miss", cacheKey, charCount: text.length, bytes: buffer.byteLength, voiceId, modelId },
    "tts generated and cached to GCS",
  );

  return { cacheKey, audioPath, contentType, charCount: text.length, cached: false };
}

/** Download a previously cached MP3 from GCS. */
export async function readCachedAudio(
  cacheKey: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const rows = await db
    .select()
    .from(ttsCacheTable)
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .limit(1);
  if (rows.length === 0) return null;

  const buffer = await gcsDownload(cacheKey);
  if (!buffer) return null;

  void db
    .update(ttsCacheTable)
    .set({ hitCount: sql`${ttsCacheTable.hitCount} + 1`, lastAccessedAt: sql`now()` })
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .catch(() => {});

  return { buffer, contentType: rows[0]!.contentType };
}
