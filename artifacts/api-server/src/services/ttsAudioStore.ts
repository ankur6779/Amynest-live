import { Storage } from "@google-cloud/storage";
import { db, ttsCacheTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const GCS_PREFIX = "tts-cache";
const REPLIT_SIDECAR = "http://127.0.0.1:1106";

export type TtsStoreBackend = "postgres" | "gcs";

let backend: TtsStoreBackend | null = null;
let gcsClient: Storage | null = null;

function resolveBackend(): TtsStoreBackend {
  if (backend) return backend;
  const forced = process.env.TTS_STORAGE?.trim().toLowerCase();
  if (forced === "postgres" || forced === "db") {
    backend = "postgres";
    return backend;
  }
  if (forced === "gcs") {
    backend = "gcs";
    return backend;
  }
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim();
  const hasGcpCreds =
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    !!process.env.GCS_SERVICE_ACCOUNT_JSON?.trim();
  backend = bucketId && hasGcpCreds ? "gcs" : "postgres";
  return backend;
}

function getGcsClient(): Storage {
  if (gcsClient) return gcsClient;
  const json = process.env.GCS_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    gcsClient = new Storage({ credentials: JSON.parse(json) as never });
    return gcsClient;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    gcsClient = new Storage();
    return gcsClient;
  }
  gcsClient = new Storage({
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
  return gcsClient;
}

function gcsObjectName(cacheKey: string): string {
  return `${GCS_PREFIX}/${cacheKey}.mp3`;
}

function getBucket() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  return getGcsClient().bucket(bucketId);
}

/** True when we can reach the Replit-era GCS bucket (even if TTS_STORAGE=postgres). */
function legacyGcsConfigured(): boolean {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim();
  const hasGcpCreds =
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    !!process.env.GCS_SERVICE_ACCOUNT_JSON?.trim();
  return !!bucketId && hasGcpCreds;
}

async function tryLegacyGcsRead(cacheKey: string): Promise<Buffer | null> {
  if (!legacyGcsConfigured()) return null;
  try {
    const [buffer] = await getBucket().file(gcsObjectName(cacheKey)).download();
    return buffer.byteLength > 0 ? buffer : null;
  } catch {
    return null;
  }
}

async function tryLegacyGcsExists(cacheKey: string): Promise<boolean> {
  if (!legacyGcsConfigured()) return false;
  try {
    const [exists] = await getBucket().file(gcsObjectName(cacheKey)).exists();
    return exists;
  } catch {
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
  // Metadata-only rows from Replit may still have bytes in GCS.
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
  // Postgres is primary on Render; still read legacy GCS objects from Replit.
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

  await db
    .update(ttsCacheTable)
    .set({ audioData: buffer, lastAccessedAt: sql`now()` })
    .where(eq(ttsCacheTable.cacheKey, cacheKey));

  return { storedInPostgres: true };
}

/**
 * After a successful legacy GCS read, copy bytes into Postgres so future
 * requests do not depend on GCS remaining configured.
 */
export async function ttsAudioBackfillPostgres(
  cacheKey: string,
  buffer: Buffer,
): Promise<void> {
  if (resolveBackend() !== "postgres" || buffer.byteLength === 0) return;
  try {
    await db
      .update(ttsCacheTable)
      .set({ audioData: buffer, lastAccessedAt: sql`now()` })
      .where(eq(ttsCacheTable.cacheKey, cacheKey));
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
