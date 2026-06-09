/**
 * Client-side signed URL fetch + cache for GCS-backed lullabies.
 * Never exposes raw GCS object paths — only audioId → API → signedUrl.
 */
import { getApiUrl } from "@/lib/api";
import type { RhymesSignedUrlResponse } from "@workspace/rhymes-audio";

type CachedSigned = {
  signedUrl: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, CachedSigned>();

const LULLABY_UNAVAILABLE = "Audio temporarily unavailable";

export function clearLullabySignedUrlCacheForTests(): void {
  signedUrlCache.clear();
}

function cacheKey(audioId: string): string {
  return audioId.trim().toLowerCase();
}

function readCache(audioId: string): string | null {
  const hit = signedUrlCache.get(cacheKey(audioId));
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt - 30_000) {
    signedUrlCache.delete(cacheKey(audioId));
    return null;
  }
  return hit.signedUrl;
}

function writeCache(audioId: string, signedUrl: string, expiresInSec: number): void {
  const ttlMs = Math.min(Math.max(expiresInSec - 60, 60), 15 * 60) * 1000;
  signedUrlCache.set(cacheKey(audioId), {
    signedUrl,
    expiresAt: Date.now() + ttlMs,
  });
}

export type AuthFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function fetchSignedLullabyUrl(
  audioId: string,
  authFetch: AuthFetch,
): Promise<{ signedUrl: string | null; error: string | null }> {
  const id = audioId.trim();
  if (!id) return { signedUrl: null, error: LULLABY_UNAVAILABLE };

  const cached = readCache(id);
  if (cached) {
    console.info("[LullabyGcs]", JSON.stringify({ audioId: id, signedUrlGenerated: true, cached: true }));
    return { signedUrl: cached, error: null };
  }

  try {
    const res = await authFetch(getApiUrl(`/api/audio/signed-url/${encodeURIComponent(id)}`), {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) {
      console.warn("[LullabyGcs]", JSON.stringify({ audioId: id, signedUrlGenerated: false, status: res.status }));
      return { signedUrl: null, error: LULLABY_UNAVAILABLE };
    }
    const body = (await res.json()) as RhymesSignedUrlResponse;
    if (!body.success || !body.signedUrl) {
      return { signedUrl: null, error: LULLABY_UNAVAILABLE };
    }
    writeCache(id, body.signedUrl, body.expiresIn);
    console.info("[LullabyGcs]", JSON.stringify({
      audioId: id,
      title: body.title,
      signedUrlGenerated: true,
      cached: Boolean(body.cached),
      playbackStarted: false,
    }));
    return { signedUrl: body.signedUrl, error: null };
  } catch (err) {
    console.warn("[LullabyGcs]", JSON.stringify({
      audioId: id,
      signedUrlGenerated: false,
      error: err instanceof Error ? err.message : String(err),
    }));
    return { signedUrl: null, error: LULLABY_UNAVAILABLE };
  }
}

export { LULLABY_UNAVAILABLE };
