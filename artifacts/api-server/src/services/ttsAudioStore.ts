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

const GCS_PREFIX = "tts-cache";

export type TtsStoreBackend = "postgres" | "gcs";

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

function gcsObjectName(cacheKey: string): string {
  return `${GCS_PREFIX}/${cacheKey}.mp3`;
}

function getBucket() {
  const bucketId = getGcsBucketId();
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  return getGcsClient().bucket(bucketId);
}

/** True when legacy Replit GCS bucket + credentials are available. */
export function legacyGcsConfigured(): boolean {
  return getGcsDiagnostics().legacyGcsConfigured;
}

async function tryLegacyGcsRead(cacheKey: string): Promise<Buffer | null> {
  if (!legacyGcsConfigured()) return null;
  try {
    const [buffer] = await getBucket().file(gcsObjectName(cacheKey)).download();
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
    const [exists] = await getBucket().file(gcsObjectName(cacheKey)).exists();
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

export function ttsAudioPath(cacheKey: string): string {
  return gcsObjectName(cacheKey);
}

export async function ttsAudioExists(
  cacheKey: string,
  audioData: Buffer | null | undefined,
): Promise<boolean> {
  if (audioData && audioData.byteLength > 0) return true;
  return tryLegacyGcsExists(cacheKey);
}

export async function ttsAudioRead(
  cacheKey: string,
  audioData: Buffer | null | undefined,
): Promise<Buffer | null> {
  if (audioData && audioData.byteLength > 0) return audioData;
  if (resolveBackend() === "gcs") {
    return tryLegacyGcsRead(cacheKey);
  }
  const legacy = await tryLegacyGcsRead(cacheKey);
  if (legacy) return legacy;
  return null;
}

export async function ttsAudioWrite(
  cacheKey: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ storedInPostgres: boolean }> {
  const mode = resolveBackend();
  if (mode === "gcs") {
    try {
      const file = getBucket().file(gcsObjectName(cacheKey));
      await file.save(buffer, { contentType, resumable: false });
      logger.info(
        { evt: "tts.gcs_write_ok", cacheKey, bytes: buffer.byteLength },
        "TTS audio saved to GCS",
      );
      return { storedInPostgres: false };
    } catch (err) {
      logger.warn(
        {
          evt: "tts.gcs_write_failed",
          cacheKey,
          message: err instanceof Error ? err.message : String(err),
        },
        "GCS TTS upload failed — falling back to Postgres bytea",
      );
    }
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

  return { storedInPostgres: true };
}

/** Copy GCS bytes into Postgres so future reads work without GCS. */
export async function ttsAudioBackfillPostgres(
  cacheKey: string,
  buffer: Buffer,
): Promise<void> {
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
