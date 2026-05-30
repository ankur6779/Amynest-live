/**
 * Curated phonics library playback — GCS pre-generated assets only.
 * Never calls ElevenLabs or OpenAI at runtime.
 *
 * Fallback order: global cache → IndexedDB → GCS manifest → log + fallback clip.
 */

import {
  getAllPhonicsAudioKeys,
  getPhonicsCatalogKey,
  getPhonicsLetterCacheKey,
  resolveLetterClipCatalogKey,
  resolvePhonicsAudioKey,
  resolvePhonicsSequenceKeys,
  type PhonicsAssetType,
} from "@workspace/phonics-sounds";
import { getGlobalCachedAudioForPlayback } from "@/lib/global-audio-cache";
import { getLocalCachedAudioUrl, warmLocalCacheFromUrl } from "@/lib/local-tts-cache";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { logAudioHealthSuccess } from "@/lib/audio-health";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import { logPhonicsPlaybackFailure } from "@/lib/phonics-playback-fallback";
import {
  getPhonicsLibraryFallbackUrl,
  lookupPhonicsContentUrl,
  lookupPhonicsLetterUrl,
  reportPhonicsLibraryMissing,
} from "@/lib/phonics-audio-map";
import {
  playPhonicsUrl,
  stopPhonicsPlayback,
  isPhonicsPlaying,
} from "@/lib/phonics-player";

export { getAllPhonicsAudioKeys, resolvePhonicsAudioKey, resolvePhonicsSequenceKeys };
export { stopPhonicsPlayback, isPhonicsPlaying };

/** HTTPS URL for a letter/digraph phoneme clip from the GCS library. */
export function getPhonicsStaticAudioUrl(audioKey: string): string {
  const fromLibrary = lookupPhonicsLetterUrl(audioKey);
  if (fromLibrary) return fromLibrary;

  const catalogKey = resolveLetterClipCatalogKey(audioKey);
  if (catalogKey) reportPhonicsLibraryMissing(catalogKey, `letter:${audioKey}`);

  const fallback = getPhonicsLibraryFallbackUrl();
  if (fallback) return fallback;

  return "";
}

/** HTTPS URL for CVC word, sight word, sentence, or quiz prompt. */
export function getPhonicsContentAudioUrl(
  text: string,
  preferredType?: PhonicsAssetType,
): string {
  const fromLibrary = lookupPhonicsContentUrl(text, preferredType);
  if (fromLibrary) return fromLibrary;

  const type = preferredType ?? "cvc";
  reportPhonicsLibraryMissing(`${type}:${text}`, "content");
  return getPhonicsLibraryFallbackUrl() ?? "";
}

export function prefetchPhonicsAudioKeys(keys: string[]): void {
  const unique = [...new Set(keys.map((k) => k.trim().toLowerCase()).filter(Boolean))];
  for (const key of unique) {
    const url = getPhonicsStaticAudioUrl(key);
    if (!url) continue;
    void warmLocalCacheFromUrl(getPhonicsLetterCacheKey(key), url);
  }
}

export function prefetchPhonicsContentTexts(
  texts: string[],
  preferredType?: PhonicsAssetType,
): void {
  for (const text of texts) {
    const url = getPhonicsContentAudioUrl(text, preferredType);
    if (!url) continue;
    const catalogKey =
      resolveLetterClipCatalogKey(text) ??
      getPhonicsCatalogKey(preferredType ?? "cvc", text.trim().toLowerCase());
    void warmLocalCacheFromUrl(`phonics:content:${catalogKey}`, url);
  }
}

export function prefetchAllPhonicsAudio(): void {
  prefetchPhonicsAudioKeys(getAllPhonicsAudioKeys());
}

export type PlayPhonicsStaticOptions = {
  waitUntilEnd?: boolean;
  playbackRate?: number;
  isCancelled?: () => boolean;
  blendSequence?: boolean;
};

export type PlayPhonicsStaticResult =
  | { ok: true; audioKey: string; url?: string }
  | { ok: false; audioKey: string; error: string };

type ResolvedPlayUrl = { url: string; cleanup?: () => void };

async function resolveBestPlayUrl(
  audioKey: string,
  networkUrl: string,
): Promise<ResolvedPlayUrl> {
  const key = (audioKey ?? "").trim().toLowerCase();
  const cacheKey = getPhonicsLetterCacheKey(key);

  const warmed = getGlobalCachedAudioForPlayback(cacheKey);
  if (warmed?.src) return { url: warmed.src };

  const blobUrl = await getLocalCachedAudioUrl(cacheKey);
  if (blobUrl) {
    return { url: blobUrl, cleanup: () => URL.revokeObjectURL(blobUrl) };
  }

  if (!networkUrl) {
    return { url: getPhonicsLibraryFallbackUrl() ?? "" };
  }
  return { url: networkUrl };
}

function isCancelledError(error: string): boolean {
  return error === "phonics_superseded" || error === "phonics_cancelled";
}

async function playUrlClip(
  label: string,
  networkUrl: string,
  cacheKey: string,
  source: string,
  options?: Pick<PlayPhonicsStaticOptions, "isCancelled" | "playbackRate">,
): Promise<PlayPhonicsStaticResult> {
  if (!label.trim()) return { ok: false, audioKey: label, error: "phonics_empty_key" };
  if (options?.isCancelled?.()) {
    return { ok: false, audioKey: label, error: "phonics_cancelled" };
  }

  recordTtsUserGesture();
  const resolved = await resolveBestPlayUrl(label, networkUrl);
  if (!resolved.url) {
    return { ok: false, audioKey: label, error: "phonics_library_missing" };
  }

  logAmyVoiceDiag("phonics_library_play", { label, url: resolved.url, source });

  const result = await playPhonicsUrl(resolved.url, {
    label,
    playbackRate: options?.playbackRate,
    isCancelled: options?.isCancelled,
    cleanup: resolved.cleanup,
  });

  if (result.ok) {
    void warmLocalCacheFromUrl(cacheKey, networkUrl || resolved.url);
    logAudioHealthSuccess({ layer: "static", fallbackUsed: false });
    return { ok: true, audioKey: label, url: resolved.url };
  }

  if (isCancelledError(result.error)) {
    return { ok: false, audioKey: label, error: "phonics_cancelled" };
  }

  logPhonicsPlaybackFailure(label, result.error);
  return { ok: false, audioKey: label, error: result.error };
}

async function playStaticKeyClip(
  audioKey: string,
  source: string,
  options?: Pick<PlayPhonicsStaticOptions, "isCancelled" | "playbackRate">,
): Promise<PlayPhonicsStaticResult> {
  const key = (audioKey ?? "").trim().toLowerCase();
  const url = getPhonicsStaticAudioUrl(key);
  return playUrlClip(key, url, getPhonicsLetterCacheKey(key), source, options);
}

/** Play pre-generated word/sentence/quiz audio from the library. */
export async function playPhonicsContentAudio(
  text: string,
  options?: PlayPhonicsStaticOptions & { contentType?: PhonicsAssetType },
): Promise<PlayPhonicsStaticResult> {
  const trimmed = (text ?? "").trim();
  const url = getPhonicsContentAudioUrl(trimmed, options?.contentType);
  const cacheKey = `phonics:content:${options?.contentType ?? "auto"}:${trimmed.toLowerCase()}`;
  return playUrlClip(trimmed, url, cacheKey, "phonics-content", options);
}

export async function playBlendPhonemeClip(
  audioKey: string,
  options?: Pick<PlayPhonicsStaticOptions, "isCancelled" | "playbackRate">,
): Promise<PlayPhonicsStaticResult> {
  return playStaticKeyClip(audioKey, "cvc-blend-phoneme", options);
}

export async function playPhonicsStaticAudio(
  audioKey: string,
  options?: PlayPhonicsStaticOptions,
): Promise<PlayPhonicsStaticResult> {
  return playStaticKeyClip(audioKey, "phonics-library", options);
}

export async function playPhonicsSequence(
  word: string,
  options?: PlayPhonicsStaticOptions & { gapMs?: number },
): Promise<{ ok: boolean; keys: string[]; error?: string }> {
  const keys = resolvePhonicsSequenceKeys(word);
  if (keys.length === 0) {
    return { ok: false, keys, error: "phonics_sequence_empty" };
  }

  prefetchPhonicsAudioKeys(keys);

  const gap = options?.gapMs ?? 120;
  for (let i = 0; i < keys.length; i++) {
    if (options?.isCancelled?.()) {
      return { ok: false, keys, error: "phonics_cancelled" };
    }
    const result = await playPhonicsStaticAudio(keys[i]!, {
      ...options,
      waitUntilEnd: true,
    });
    if (!result.ok) {
      return { ok: false, keys, error: result.error };
    }
    if (i < keys.length - 1) {
      await new Promise((r) => setTimeout(r, gap));
    }
  }

  return { ok: true, keys };
}
