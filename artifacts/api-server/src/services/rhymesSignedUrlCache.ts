/**
 * In-memory signed-URL cache with GCS signature expiry validation.
 */
import {
  GCS_SIGNED_URL_EXPIRY_BUFFER_MS,
  isGcsSignedUrlValid,
  parseGcsV4SignedUrlExpiresAtMs,
  type RhymesGcsRegistryEntry,
} from "@workspace/rhymes-audio";

export type CachedSignedUrl = {
  signedUrl: string;
  title: string;
  objectPath: string;
  cacheExpiresAt: number;
  signedUrlExpiresAt: number;
  expiresInSec: number;
};

export type RhymesSignedUrlCacheConfig = {
  signedUrlTtlMs: number;
  cacheTtlMs: number;
};

export function createRhymesSignedUrlCache(config: RhymesSignedUrlCacheConfig) {
  const signedUrlCache = new Map<string, CachedSignedUrl>();

  function cacheKey(audioId: string): string {
    return audioId.trim().toLowerCase();
  }

  function resolveSignedUrlExpiresAtMs(signedUrl: string): number {
    return (
      parseGcsV4SignedUrlExpiresAtMs(signedUrl) ??
      Date.now() + config.signedUrlTtlMs
    );
  }

  function isCacheEntryValid(hit: CachedSignedUrl, nowMs = Date.now()): boolean {
    if (nowMs >= hit.cacheExpiresAt) return false;
    if (nowMs + GCS_SIGNED_URL_EXPIRY_BUFFER_MS >= hit.signedUrlExpiresAt) return false;
    if (!isGcsSignedUrlValid(hit.signedUrl, nowMs, GCS_SIGNED_URL_EXPIRY_BUFFER_MS)) {
      return false;
    }
    return true;
  }

  function remainingExpiresInSec(hit: CachedSignedUrl, nowMs = Date.now()): number {
    const effectiveExpiresAt = Math.min(hit.cacheExpiresAt, hit.signedUrlExpiresAt);
    return Math.max(60, Math.floor((effectiveExpiresAt - nowMs) / 1000));
  }

  return {
    clear(): void {
      signedUrlCache.clear();
    },

    size(): number {
      return signedUrlCache.size;
    },

    read(audioId: string): CachedSignedUrl | null {
      const key = cacheKey(audioId);
      const hit = signedUrlCache.get(key);
      if (!hit) return null;
      if (!isCacheEntryValid(hit)) {
        signedUrlCache.delete(key);
        return null;
      }
      return hit;
    },

    write(entry: RhymesGcsRegistryEntry, signedUrl: string, expiresInSec: number): void {
      signedUrlCache.set(cacheKey(entry.id), {
        signedUrl,
        title: entry.title,
        objectPath: entry.objectPath,
        cacheExpiresAt: Date.now() + config.cacheTtlMs,
        signedUrlExpiresAt: resolveSignedUrlExpiresAtMs(signedUrl),
        expiresInSec,
      });
    },

    remainingExpiresInSec(hit: CachedSignedUrl): number {
      return remainingExpiresInSec(hit);
    },

    /** @internal test hook */
    readRaw(audioId: string): CachedSignedUrl | null {
      return signedUrlCache.get(cacheKey(audioId)) ?? null;
    },
  };
}

export type RhymesSignedUrlCache = ReturnType<typeof createRhymesSignedUrlCache>;
