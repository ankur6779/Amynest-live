import { Storage, type StorageOptions } from "@google-cloud/storage";
import { db, ttsCacheTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  getGcsBucketId,
  getGcsDiagnostics,
  parseGcsServiceAccountJson,
  readEnv,
} from "../lib/env";
import { logger } from "../lib/logger";
import { ttsGcsObjectName, ttsPublicGcsUrl as buildPublicGcsUrl } from "./ttsGcsPaths";

export type TtsStoreBackend = "postgres" | "gcs";

export { ttsGcsObjectName };

export { getGcsDiagnostics };

let backend: TtsStoreBackend | null = null;
let gcsClient: Storage | null = null;
let gcsInitError: string | null = null;

function isReplitRuntime(): boolean {
  return !!(readEnv("REPL_ID", "REPL_IDENTITY", "REPLIT_DEPLOYMENT"));
}

function resolveBackend(): TtsStoreBackend {
  if (backend) return backend;
  const forced = readEnv("TTS_STORAGE")?.toLowerCase();
  if (forced === "postgres" || forced === "db") {
    backend = "postgres";
    return backend;
  }
  if (forced === "gcs") {
    if (!legacyGcsConfigured()) {
      throw new Error(
        "TTS_STORAGE=gcs but GCS is not configured: set DEFAULT_OBJECT_STORAGE_BUCKET_ID and GCS_SERVICE_ACCOUNT_JSON",
      );
    }
    backend = "gcs";
    return backend;
  }
  const bucketId = getGcsBucketId();
  const parsed = parseGcsServiceAccountJson();
  const hasFileCreds = readEnv("GOOGLE_APPLICATION_CREDENTIALS");
  backend = bucketId && (parsed.ok || hasFileCreds) ? "gcs" : "postgres";
  return backend;
}

function buildGcsClient(): Storage {
  const parsed = parseGcsServiceAccountJson();
  if (parsed.ok && parsed.credentials) {
    const opts: StorageOptions = {
      credentials: parsed.credentials as StorageOptions["credentials"],
      projectId: parsed.projectId,
    };
    return new Storage(opts);
  }

  if (parsed.ok && parsed.source === "GOOGLE_APPLICATION_CREDENTIALS") {
    return new Storage({ projectId: parsed.projectId });
  }

  if (isReplitRuntime()) {
    const REPLIT_SIDECAR = "http://127.0.0.1:1106";
    return new Storage({
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
  }

  throw new Error(
    "GCS not configured: set DEFAULT_OBJECT_STORAGE_BUCKET_ID + GCS_SERVICE_ACCOUNT_JSON on Render",
  );
}

function getGcsClient(): Storage {
  if (gcsClient) return gcsClient;
  if (gcsInitError) throw new Error(gcsInitError);
  try {
    gcsClient = buildGcsClient();
    return gcsClient;
  } catch (err) {
    gcsInitError = err instanceof Error ? err.message : String(err);
    logger.error({ evt: "gcs.init_failed", message: gcsInitError }, "GCS client init failed");
    throw err;
  }
}

/** Public HTTPS URL for a cached MP3 (bucket must allow public read). */
export function ttsPublicGcsUrl(cacheKey: string): string | null {
  const bucketId = getGcsBucketId();
  if (!bucketId) return null;
  return buildPublicGcsUrl(cacheKey, bucketId);
}

function getBucket() {
  const bucketId = getGcsBucketId();
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  return getGcsClient().bucket(bucketId);
}

/** True when GCS bucket + credentials are available. */
export function legacyGcsConfigured(): boolean {
  return getGcsDiagnostics().legacyGcsConfigured;
}

async function tryLegacyGcsRead(cacheKey: string): Promise<Buffer | null> {
  if (!legacyGcsConfigured()) return null;
  try {
    const [buffer] = await getBucket().file(ttsGcsObjectName(cacheKey)).download();
    return buffer.byteLength > 0 ? buffer : null;
  } catch (err) {
    logger.warn(
      {
        evt: "tts.gcs_read_failed",
        cacheKey,
        message: err instanceof Error ? err.message : String(err),
      },
      "GCS TTS read failed",
    );
    return null;
  }
}

async function tryLegacyGcsExists(cacheKey: string): Promise<boolean> {
  if (!legacyGcsConfigured()) return false;
  try {
    const [exists] = await getBucket().file(ttsGcsObjectName(cacheKey)).exists();
    return exists;
  } catch (err) {
    logger.warn(
      {
        evt: "tts.gcs_exists_failed",
        cacheKey,
        message: err instanceof Error ? err.message : String(err),
      },
      "GCS TTS exists check failed",
    );
    return false;
  }
}

export function ttsStorageBackend(): TtsStoreBackend {
  return resolveBackend();
}

/** @deprecated Use ttsGcsObjectName — kept for existing DB rows. */
export function ttsAudioPath(cacheKey: string): string {
  return ttsGcsObjectName(cacheKey);
}

export async function ttsAudioExists(
  cacheKey: string,
  row?: { audioUrl?: string | null; audioData?: Buffer | null },
): Promise<boolean> {
  if (row?.audioUrl?.startsWith("https://storage.googleapis.com/")) return true;
  if (row?.audioData && row.audioData.byteLength > 0) return true;
  return tryLegacyGcsExists(cacheKey);
}

export async function ttsAudioRead(
  cacheKey: string,
  audioData: Buffer | null | undefined,
): Promise<Buffer | null> {
  if (audioData && audioData.byteLength > 0) return audioData;
  if (resolveBackend() === "gcs" || legacyGcsConfigured()) {
    return tryLegacyGcsRead(cacheKey);
  }
  return null;
}

/**
 * Upload MP3 bytes to GCS. Returns the public object URL.
 * Bucket objects should be world-readable (uniform bucket-level access + allUsers objectViewer).
 */
export async function ttsGcsUpload(
  cacheKey: string,
  buffer: Buffer,
  contentType = "audio/mpeg",
): Promise<string> {
  if (!legacyGcsConfigured()) {
    throw new Error("gcs_not_configured");
  }
  const objectName = ttsGcsObjectName(cacheKey);
  const publicUrl = ttsPublicGcsUrl(cacheKey);
  if (!publicUrl) throw new Error("gcs_bucket_missing");

  try {
    const file = getBucket().file(objectName);
    await file.save(buffer, {
      contentType,
      resumable: false,
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
    });
    logger.info(
      { evt: "tts.uploaded_to_gcs", cacheKey, bytes: buffer.byteLength, objectName },
      "TTS: uploaded to GCS",
    );
    return publicUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      { evt: "tts.gcs_upload_failed", cacheKey, message },
      "TTS: GCS upload failed",
    );
    throw new Error(`tts_gcs_upload_failed: ${message}`);
  }
}

/** @deprecated Prefer ttsGcsUpload + DB metadata only. Postgres bytea fallback for local dev. */
export async function ttsAudioWrite(
  cacheKey: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ storedInPostgres: boolean; audioUrl: string | null }> {
  const mode = resolveBackend();
  if (mode === "gcs") {
    const audioUrl = await ttsGcsUpload(cacheKey, buffer, contentType);
    return { storedInPostgres: false, audioUrl };
  }

  const updated = await db
    .update(ttsCacheTable)
    .set({ audioData: buffer, lastAccessedAt: sql`now()` })
    .where(eq(ttsCacheTable.cacheKey, cacheKey))
    .returning({ cacheKey: ttsCacheTable.cacheKey });

  if (updated.length === 0) {
    logger.error(
      { evt: "tts.postgres_write_no_row", cacheKey, bytes: buffer.byteLength },
      "TTS: failed to save to database — cache row missing",
    );
    throw new Error("tts_postgres_row_missing");
  }

  logger.info(
    { evt: "tts.saved_to_database", cacheKey, bytes: buffer.byteLength },
    "TTS: saved to database",
  );

  return { storedInPostgres: true, audioUrl: null };
}

/** Copy GCS bytes into Postgres so future reads work without GCS (legacy migration only). */
export async function ttsAudioBackfillPostgres(
  cacheKey: string,
  buffer: Buffer,
): Promise<void> {
  if (resolveBackend() === "gcs") return;
  if (buffer.byteLength === 0) return;
  try {
    await db
      .update(ttsCacheTable)
      .set({ audioData: buffer, lastAccessedAt: sql`now()` })
      .where(eq(ttsCacheTable.cacheKey, cacheKey));
    logger.info({ evt: "tts.postgres_backfill_ok", cacheKey }, "TTS backfilled to Postgres");
  } catch (err) {
    logger.warn(
      {
        evt: "tts.postgres_backfill_failed",
        cacheKey,
        message: err instanceof Error ? err.message : String(err),
      },
      "failed to backfill TTS bytes into Postgres",
    );
  }
}

export function resolveTtsPlaybackUrl(
  cacheKey: string,
  row?: { audioUrl?: string | null },
): string {
  if (row?.audioUrl?.startsWith("https://")) return row.audioUrl;
  const gcsUrl = ttsPublicGcsUrl(cacheKey);
  if (gcsUrl && resolveBackend() === "gcs") return gcsUrl;
  return `/api/tts/audio/${cacheKey}.mp3`;
}
