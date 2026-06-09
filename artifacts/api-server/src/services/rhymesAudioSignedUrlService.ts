/**
 * GCS signed URL issuance for Rhymes/lullaby library (allowlisted registry only).
 */
import {
  getRhymesRegistryEntry,
  isValidRhymesGcsObjectPath,
  type RhymesGcsRegistryEntry,
} from "@workspace/rhymes-audio";
import { logger } from "../lib/logger.js";
import {
  getGcsSignedReadUrl,
  gcsObjectExists,
  legacyGcsConfigured,
} from "./ttsAudioStore.js";

/** Signed URL lifetime presented to clients (45 min). Override via RHYMES_SIGNED_URL_TTL_MS for audits. */
export const RHYMES_SIGNED_URL_TTL_MS = Number(process.env.RHYMES_SIGNED_URL_TTL_MS) > 0
  ? Number(process.env.RHYMES_SIGNED_URL_TTL_MS)
  : 45 * 60 * 1000;

/** Server-side cache for signed URL responses (12 min). Override via RHYMES_SIGNED_URL_CACHE_TTL_MS. */
const SIGNED_URL_CACHE_TTL_MS = Number(process.env.RHYMES_SIGNED_URL_CACHE_TTL_MS) > 0
  ? Number(process.env.RHYMES_SIGNED_URL_CACHE_TTL_MS)
  : 12 * 60 * 1000;

type CachedSignedUrl = {
  signedUrl: string;
  title: string;
  objectPath: string;
  expiresAt: number;
  expiresInSec: number;
};

const signedUrlCache = new Map<string, CachedSignedUrl>();

export type RhymesSignedUrlResult =
  | {
      ok: true;
      audioId: string;
      title: string;
      signedUrl: string;
      expiresIn: number;
      cached: boolean;
      gcsObjectPath: string;
    }
  | { ok: false; reason: "not_found" | "gcs_unconfigured" | "invalid_path" | "sign_failed" | "missing_object" };

export function clearRhymesSignedUrlCacheForTests(): void {
  signedUrlCache.clear();
}

export function getRhymesSignedUrlCacheSizeForTests(): number {
  return signedUrlCache.size;
}

function cacheKey(audioId: string): string {
  return audioId.trim().toLowerCase();
}

function readCache(audioId: string): CachedSignedUrl | null {
  const hit = signedUrlCache.get(cacheKey(audioId));
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    signedUrlCache.delete(cacheKey(audioId));
    return null;
  }
  return hit;
}

function writeCache(entry: RhymesGcsRegistryEntry, signedUrl: string, expiresInSec: number): void {
  signedUrlCache.set(cacheKey(entry.id), {
    signedUrl,
    title: entry.title,
    objectPath: entry.objectPath,
    expiresAt: Date.now() + SIGNED_URL_CACHE_TTL_MS * 1000,
    expiresInSec,
  });
}

export async function resolveRhymesSignedUrl(audioId: string): Promise<RhymesSignedUrlResult> {
  const id = audioId.trim();
  const registryEntry = getRhymesRegistryEntry(id);
  if (!registryEntry) {
    logger.warn({ evt: "rhymes.signed_url_not_found", audioId: id });
    return { ok: false, reason: "not_found" };
  }

  if (!isValidRhymesGcsObjectPath(registryEntry.objectPath)) {
    logger.warn({
      evt: "rhymes.signed_url_invalid_path",
      audioId: id,
      objectPath: registryEntry.objectPath,
    });
    return { ok: false, reason: "invalid_path" };
  }

  const cached = readCache(id);
  if (cached) {
    logger.info({
      evt: "rhymes.signed_url_generated",
      audioId: id,
      title: cached.title,
      gcsObjectPath: cached.objectPath,
      signedUrlGenerated: true,
      cached: true,
    });
    return {
      ok: true,
      audioId: id,
      title: cached.title,
      signedUrl: cached.signedUrl,
      expiresIn: Math.max(60, Math.floor((cached.expiresAt - Date.now()) / 1000)),
      cached: true,
      gcsObjectPath: cached.objectPath,
    };
  }

  if (!legacyGcsConfigured()) {
    return { ok: false, reason: "gcs_unconfigured" };
  }

  const exists = await gcsObjectExists(registryEntry.objectPath);
  if (!exists) {
    logger.warn({
      evt: "rhymes.signed_url_missing_object",
      audioId: id,
      gcsObjectPath: registryEntry.objectPath,
    });
    return { ok: false, reason: "missing_object" };
  }

  const signedUrl = await getGcsSignedReadUrl(registryEntry.objectPath, RHYMES_SIGNED_URL_TTL_MS);
  if (!signedUrl) {
    logger.warn({
      evt: "rhymes.signed_url_failed",
      audioId: id,
      gcsObjectPath: registryEntry.objectPath,
    });
    return { ok: false, reason: "sign_failed" };
  }

  const expiresInSec = Math.floor(RHYMES_SIGNED_URL_TTL_MS / 1000);
  writeCache(registryEntry, signedUrl, expiresInSec);

  logger.info({
    evt: "rhymes.signed_url_generated",
    audioId: id,
    title: registryEntry.title,
    gcsObjectPath: registryEntry.objectPath,
    signedUrlGenerated: true,
    cached: false,
  });

  return {
    ok: true,
    audioId: id,
    title: registryEntry.title,
    signedUrl,
    expiresIn: expiresInSec,
    cached: false,
    gcsObjectPath: registryEntry.objectPath,
  };
}
