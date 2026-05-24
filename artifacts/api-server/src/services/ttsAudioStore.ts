import { Storage, type StorageOptions } from "@google-cloud/storage";
import { createHash } from "node:crypto";
import { db, ttsCacheTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  getGcsBucketId,
  getGcsDiagnostics,
  isTtsCacheGcsEnabled,
  parseGcsServiceAccountJson,
  readEnv,
} from "../lib/env";
import { logger } from "../lib/logger";
import {
  isValidTtsPublicUrl,
  ttsGcsObjectName,
  ttsPublicGcsUrl as buildPublicGcsUrl,
} from "./ttsGcsPaths";

export { isValidTtsPublicUrl };
export { isTtsCacheGcsEnabled };

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
  if (!isTtsCacheGcsEnabled()) {
    backend = "postgres";
    return backend;
  }
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

function resolveGcsProjectId(parsed: ReturnType<typeof parseGcsServiceAccountJson>): string | undefined {
  return (
    parsed.projectId ??
    readEnv("GCS_PROJECT_ID", "GOOGLE_CLOUD_PROJECT", "GCLOUD_PROJECT")
  );
}

function buildGcsClient(): Storage {
  const parsed = parseGcsServiceAccountJson();
  const projectId = resolveGcsProjectId(parsed);
  if (parsed.ok && parsed.credentials) {
    const opts: StorageOptions = {
      credentials: parsed.credentials as StorageOptions["credentials"],
      projectId,
    };
    return new Storage(opts);
  }

  if (parsed.ok && parsed.source === "GOOGLE_APPLICATION_CREDENTIALS") {
    return new Storage({ projectId });
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

async function tryLegacyGcsRead(cacheKey: string, attempt = 0): Promise<Buffer | null> {
  if (!isTtsCacheGcsEnabled() || !legacyGcsConfigured()) return null;
  try {
    const [buffer] = await getBucket().file(ttsGcsObjectName(cacheKey)).download();
    const byteLen = buffer?.byteLength ?? 0;
    if (isValidTtsBuffer(buffer)) return buffer;
    if (attempt === 0) {
      logger.warn(
        { evt: "tts.gcs_read_retry", cacheKey, bytes: byteLen },
        "GCS TTS read undersized — retrying once",
      );
      return tryLegacyGcsRead(cacheKey, 1);
    }
    return null;
  } catch (err) {
    if (attempt === 0) {
      logger.warn(
        {
          evt: "tts.gcs_read_failed",
          cacheKey,
          attempt,
          message: err instanceof Error ? err.message : String(err),
        },
        "GCS TTS read failed — retrying once",
      );
      return tryLegacyGcsRead(cacheKey, 1);
    }
    logger.warn(
      {
        evt: "tts.gcs_read_failed",
        cacheKey,
        attempt,
        message: err instanceof Error ? err.message : String(err),
      },
      "GCS TTS read failed",
    );
    return null;
  }
}

const STATIC_AUDIO_GCS_TIMEOUT_MS = Number(process.env.STATIC_AUDIO_GCS_TIMEOUT_MS ?? "7000");
/** Minimum MP3 payload — rejects truncated / corrupt cache entries. */
export const MIN_TTS_BYTES = 500;

export function computeTtsContentSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function isValidTtsBuffer(buffer: Buffer | null | undefined): buffer is Buffer {
  return Boolean(buffer && buffer.byteLength >= MIN_TTS_BYTES);
}

function isBufferChecksumValid(
  buffer: Buffer,
  expectedSha256?: string | null,
): boolean {
  if (!expectedSha256) return true;
  return computeTtsContentSha256(buffer) === expectedSha256;
}

export function isValidTtsBufferWithChecksum(
  buffer: Buffer | null | undefined,
  expectedSha256?: string | null,
): buffer is Buffer {
  return isValidTtsBuffer(buffer) && isBufferChecksumValid(buffer, expectedSha256);
}

async function readStaticAudioFromGcsInner(hash: string): Promise<Buffer | null> {
  const file = getBucket().file(`static-audio/${hash}.mp3`);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buffer] = await file.download();
  return buffer.byteLength > 0 ? buffer : null;
}

function getSecondaryBucketId(): string | null {
  return readEnv("SECONDARY_GCS_BUCKET_ID", "STATIC_AUDIO_BACKUP_BUCKET_ID") ?? null;
}

/** Read from optional backup bucket when primary GCS misses. */
export async function readStaticAudioFromSecondaryGcs(hash: string): Promise<Buffer | null> {
  const bucketId = getSecondaryBucketId();
  if (!bucketId || !legacyGcsConfigured()) return null;
  try {
    const [exists] = await getGcsClient().bucket(bucketId).file(`static-audio/${hash}.mp3`).exists();
    if (!exists) return null;
    const [buffer] = await getGcsClient().bucket(bucketId).file(`static-audio/${hash}.mp3`).download();
    return buffer.byteLength > 0 ? buffer : null;
  } catch {
    return null;
  }
}

export type StaticGcsWriteResult =
  | { success: true; publicUrl: string }
  | { success: false; error: string };

/** True when object exists in the primary GCS bucket. */
export async function gcsObjectExists(objectName: string): Promise<boolean> {
  if (!legacyGcsConfigured()) return false;
  try {
    const [exists] = await getBucket().file(objectName).exists();
    return exists;
  } catch {
    return false;
  }
}

/** Stream upload to primary GCS bucket (large video/PDF mirrors). */
export async function uploadStreamToGcs(params: {
  objectName: string;
  stream: NodeJS.ReadableStream;
  contentType: string;
  cacheControl?: string;
}): Promise<StaticGcsWriteResult> {
  if (!legacyGcsConfigured()) return { success: false, error: "gcs_not_configured" };
  const bucketName = getGcsBucketId();
  if (!bucketName) return { success: false, error: "gcs_bucket_missing" };
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${params.objectName}`;
  try {
    const file = getBucket().file(params.objectName);
    await new Promise<void>((resolve, reject) => {
      const ws = file.createWriteStream({
        resumable: true,
        metadata: {
          contentType: params.contentType,
          cacheControl: params.cacheControl ?? "public, max-age=31536000, immutable",
        },
      });
      params.stream.pipe(ws);
      ws.on("error", reject);
      ws.on("finish", () => resolve());
    });
    await file.makePublic().catch(() => {});
    return { success: true, publicUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Upload static-audio/{hash}.mp3 to primary GCS bucket. */
export async function writeStaticAudioToGcs(
  hash: string,
  buffer: Buffer,
): Promise<StaticGcsWriteResult> {
  if (!legacyGcsConfigured()) return { success: false, error: "gcs_not_configured" };
  const bucketName = getGcsBucketId();
  if (!bucketName) return { success: false, error: "gcs_bucket_missing" };
  const objectName = `static-audio/${hash}.mp3`;
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
  try {
    const file = getBucket().file(objectName);
    await file.save(buffer, {
      contentType: "audio/mpeg",
      resumable: false,
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
    });
    await file.makePublic().catch(() => {});
    return { success: true, publicUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Read pre-generated static phrase MP3 from GCS (`static-audio/{md5}.mp3`). */
export async function readStaticAudioFromGcs(hash: string): Promise<Buffer | null> {
  if (!/^[a-f0-9]{32}$/.test(hash)) return null;
  if (!legacyGcsConfigured()) {
    throw new Error("gcs_not_configured");
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      readStaticAudioFromGcsInner(hash),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("gcs_timeout")), STATIC_AUDIO_GCS_TIMEOUT_MS);
      }),
    ]);
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "gcs_timeout") {
      throw err;
    }
    const code = (err as { code?: number }).code;
    if (code === 404) return null;
    logger.error(
      {
        evt: "static_audio.gcs_read_failed",
        hash,
        code,
        message: err instanceof Error ? err.message : String(err),
      },
      "GCS static audio read failed",
    );
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function tryLegacyGcsExists(cacheKey: string): Promise<boolean> {
  if (!isTtsCacheGcsEnabled() || !legacyGcsConfigured()) return false;
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
  row?: { audioUrl?: string | null; audioData?: Buffer | null; contentSha256?: string | null },
): Promise<boolean> {
  const buffer = await ttsAudioRead(cacheKey, row?.audioData, row?.contentSha256);
  if (isValidTtsBuffer(buffer)) return true;

  const byteLen = buffer?.byteLength ?? 0;
  logger.warn(
    {
      evt: "tts.cache_ghost_row",
      cacheKey,
      bytes: byteLen,
      hasGcsUrl: Boolean(row?.audioUrl?.startsWith("https://storage.googleapis.com/")),
      hasPostgresBytes: Boolean(row?.audioData && row.audioData.byteLength > 0),
    },
    "TTS cache row exists but bytes are not readable — treating as miss",
  );
  return false;
}

export async function ttsAudioRead(
  cacheKey: string,
  audioData: Buffer | null | undefined,
  expectedSha256?: string | null,
): Promise<Buffer | null> {
  if (isValidTtsBufferWithChecksum(audioData, expectedSha256)) return audioData;
  if (isTtsCacheGcsEnabled() && (resolveBackend() === "gcs" || legacyGcsConfigured())) {
    const fromGcs = await tryLegacyGcsRead(cacheKey);
    if (isValidTtsBufferWithChecksum(fromGcs, expectedSha256)) return fromGcs;
    if (fromGcs !== null && expectedSha256 && !isBufferChecksumValid(fromGcs, expectedSha256)) {
      logger.warn(
        { evt: "tts.checksum_mismatch", cacheKey, bytes: fromGcs.byteLength },
        "TTS GCS bytes failed checksum — treating as miss",
      );
    }
    return null;
  }
  return null;
}

export type TtsGcsUploadResult =
  | { success: true; publicUrl: string }
  | { success: false; error: string };

/**
 * Upload MP3 bytes to GCS. Returns the stable public object URL.
 * Bucket objects should be world-readable (uniform bucket-level access + allUsers objectViewer).
 */
export async function ttsGcsUpload(
  cacheKey: string,
  buffer: Buffer,
  contentType = "audio/mpeg",
): Promise<TtsGcsUploadResult> {
  if (!isTtsCacheGcsEnabled()) {
    return { success: false, error: "tts_gcs_disabled" };
  }
  if (!legacyGcsConfigured()) {
    return { success: false, error: "gcs_not_configured" };
  }
  const bucketName = getGcsBucketId();
  if (!bucketName) {
    return { success: false, error: "gcs_bucket_missing" };
  }

  const objectName = ttsGcsObjectName(cacheKey);
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
  if (!isValidTtsPublicUrl(publicUrl)) {
    return { success: false, error: "gcs_invalid_public_url" };
  }

  try {
    const file = getBucket().file(objectName);
    await file.save(buffer, {
      contentType,
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
        contentSha256: computeTtsContentSha256(buffer),
      },
    });

    try {
      await file.makePublic();
    } catch (makePublicErr) {
      logger.warn(
        {
          evt: "tts.make_public_skipped",
          cacheKey,
          message:
            makePublicErr instanceof Error ? makePublicErr.message : String(makePublicErr),
        },
        "TTS: file.makePublic() failed — bucket may use uniform public access",
      );
    }

    const [exists] = await file.exists();
    if (!exists) {
      console.error("GCS upload failed", { cacheKey, objectName, publicUrl });
      return { success: false, error: "gcs_upload_failed" };
    }

    if (!isValidTtsPublicUrl(publicUrl)) {
      console.error("Invalid audio URL", publicUrl);
      return { success: false, error: "gcs_invalid_public_url" };
    }

    logger.info(
      { evt: "tts.uploaded_to_gcs", cacheKey, bytes: buffer.byteLength, objectName, publicUrl },
      "TTS: uploaded to GCS",
    );
    console.log("[TTS GENERATED]", { cacheKey, publicUrl });
    return { success: true, publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GCS upload failed", { cacheKey, message });
    logger.error(
      { evt: "tts.gcs_upload_failed", cacheKey, message },
      "TTS: GCS upload failed",
    );
    return { success: false, error: "gcs_upload_failed" };
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
    const upload = await ttsGcsUpload(cacheKey, buffer, contentType);
    if (!upload.success) {
      throw new Error(upload.error);
    }
    return { storedInPostgres: false, audioUrl: upload.publicUrl };
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

export { resolveTtsPlaybackUrl } from "./ttsPlaybackUrl.js";
