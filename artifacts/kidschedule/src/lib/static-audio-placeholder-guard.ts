/**
 * Detect server placeholder static-audio responses so playback never
 * treats near-silent clips as success (TTS fallback must run).
 */

import { getApiUrl } from "@/lib/api";
import { MIN_AUDIO_BLOB_BYTES } from "@/lib/amy-voice-audio-start";
import { isStaticAudioProxyUrl } from "@/lib/static-audio-guard";

export const STATIC_AUDIO_SOURCE_HEADER = "X-AmyNest-Static-Source";
export const MIN_STATIC_AUDIO_BYTES = MIN_AUDIO_BLOB_BYTES;

export type PlaceholderCheckInput = {
  staticSourceHeader?: string | null;
  contentLength?: number | null;
  blobSize?: number | null;
};

export function isPlaceholderStaticAsset(input: PlaceholderCheckInput): boolean {
  const source = (input.staticSourceHeader ?? "").trim().toLowerCase();
  if (source === "placeholder") return true;

  const bytes = input.blobSize ?? input.contentLength;
  if (bytes != null && bytes > 0 && bytes < MIN_STATIC_AUDIO_BYTES) {
    return true;
  }
  return false;
}

export type StaticAudioProbeResult = {
  ok: boolean;
  isPlaceholder: boolean;
};

const probeCache = new Map<string, StaticAudioProbeResult>();

function resolveProbeUrl(proxyUrl: string): string {
  return proxyUrl.startsWith("http") ? proxyUrl : getApiUrl(proxyUrl);
}

function parseProbeResponse(res: Response): StaticAudioProbeResult {
  const source = res.headers.get(STATIC_AUDIO_SOURCE_HEADER);
  const contentLength = Number(res.headers.get("content-length") ?? "0");
  const isPlaceholder = isPlaceholderStaticAsset({
    staticSourceHeader: source,
    contentLength: Number.isFinite(contentLength) ? contentLength : null,
  });
  return { ok: res.ok, isPlaceholder };
}

/**
 * HEAD (or ranged GET) probe before streaming static audio from the proxy URL.
 * Results are cached per URL for the session.
 */
export async function probeStaticAudioProxyUrl(
  proxyUrl: string,
): Promise<StaticAudioProbeResult> {
  const trimmed = (proxyUrl ?? "").trim();
  if (!trimmed || !isStaticAudioProxyUrl(trimmed)) {
    return { ok: false, isPlaceholder: false };
  }

  const cached = probeCache.get(trimmed);
  if (cached) return cached;

  const absUrl = resolveProbeUrl(trimmed);
  try {
    let res = await fetch(absUrl, {
      method: "HEAD",
      credentials: "omit",
      cache: "no-store",
    });

    if (res.status === 405 || res.status === 501) {
      res = await fetch(absUrl, {
        method: "GET",
        credentials: "omit",
        cache: "no-store",
        headers: { Range: "bytes=0-0" },
      });
    }

    const result = parseProbeResponse(res);
    probeCache.set(trimmed, result);
    return result;
  } catch {
    const fallback = { ok: false, isPlaceholder: false };
    probeCache.set(trimmed, fallback);
    return fallback;
  }
}

export function clearStaticAudioProbeCache(): void {
  probeCache.clear();
}

/** After direct-stream play, reject clips shorter than a real phoneme/word. */
export function isNearSilentStaticDuration(durationSec: number): boolean {
  return Number.isFinite(durationSec) && durationSec > 0 && durationSec < 0.12;
}
