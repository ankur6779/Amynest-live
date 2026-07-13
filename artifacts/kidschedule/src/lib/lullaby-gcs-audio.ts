/**
 * Same-origin stream URLs for GCS-backed lullabies/rhymes.
 * Never exposes raw GCS object paths — only audioId → /api/audio/stream/:id.
 */
import { getApiUrl } from "@/lib/api";

const LULLABY_UNAVAILABLE = "Audio temporarily unavailable";

export function clearLullabySignedUrlCacheForTests(): void {
  /* no-op — stream URLs are stable per audioId */
}

/** Stable same-origin playback URL (Cloudflare Worker → API → GCS). */
export function resolveLullabyStreamUrl(audioId: string): string | null {
  const id = audioId.trim();
  if (!id) return null;
  return getApiUrl(`/api/audio/stream/${encodeURIComponent(id)}`);
}

export type AuthFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function fetchSignedLullabyUrl(
  audioId: string,
  _authFetch?: AuthFetch,
): Promise<{ signedUrl: string | null; error: string | null }> {
  const streamUrl = resolveLullabyStreamUrl(audioId);
  if (!streamUrl) return { signedUrl: null, error: LULLABY_UNAVAILABLE };
  console.info("[LullabyGcs]", JSON.stringify({
    audioId: audioId.trim(),
    streamUrl: true,
    playbackStarted: false,
  }));
  return { signedUrl: streamUrl, error: null };
}

export { LULLABY_UNAVAILABLE };
