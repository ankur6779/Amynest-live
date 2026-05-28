/**
 * Curated phonics MP3 playback — bypasses runtime ElevenLabs / OpenAI TTS.
 * Uses production /phonics-audio/*.mp3 only (no browser speech-synthesis fallback).
 */

import {
  getAllPhonicsAudioKeys,
  getPhonicsAudioPath,
  getPhonicsLetterCacheKey,
  resolvePhonicsAudioKey,
  resolvePhonicsSequenceKeys,
} from "@workspace/phonics-sounds";
import { getGlobalCachedAudioForPlayback } from "@/lib/global-audio-cache";
import { getLocalCachedAudioUrl, warmLocalCacheFromUrl } from "@/lib/local-tts-cache";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { logAudioHealthSuccess } from "@/lib/audio-health";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import { logPhonicsPlaybackFailure } from "@/lib/phonics-playback-fallback";
import {
  playPhonicsUrl,
  stopPhonicsPlayback,
  isPhonicsPlaying,
} from "@/lib/phonics-player";

export { getAllPhonicsAudioKeys, resolvePhonicsAudioKey, resolvePhonicsSequenceKeys };
export { stopPhonicsPlayback, isPhonicsPlaying };

export function getPhonicsStaticAudioUrl(audioKey: string): string {
  const path = getPhonicsAudioPath(audioKey);
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).href;
  }
  return path;
}

export function prefetchPhonicsAudioKeys(keys: string[]): void {
  const unique = [...new Set(keys.map((k) => k.trim().toLowerCase()).filter(Boolean))];
  for (const key of unique) {
    void warmLocalCacheFromUrl(getPhonicsLetterCacheKey(key), getPhonicsStaticAudioUrl(key));
  }
}

export function prefetchAllPhonicsAudio(): void {
  prefetchPhonicsAudioKeys(getAllPhonicsAudioKeys());
}

export type PlayPhonicsStaticOptions = {
  waitUntilEnd?: boolean;
  playbackRate?: number;
  isCancelled?: () => boolean;
  /** CVC blend — single play attempt, no cache-bust / manager retries. */
  blendSequence?: boolean;
};

export type PlayPhonicsStaticResult =
  | { ok: true; audioKey: string; url?: string }
  | { ok: false; audioKey: string; error: string };

function resolvePlayableUrl(audioKey: string): string {
  return getPhonicsStaticAudioUrl(audioKey);
}

type ResolvedPlayUrl = { url: string; cleanup?: () => void };

/**
 * Prefer the warm cache's resolved URL → IndexedDB blob → HTTP URL.
 *
 * IMPORTANT: prewarm only supplies the (network/decoder-warm) URL. The primed
 * HTMLAudioElement instance is NEVER returned for direct replay — playback always
 * happens through a clean instance owned by the phonics player. Replaying primed
 * instances was the source of the "ka ka ka" looping / stutter.
 */
async function resolveBestPlayUrl(audioKey: string): Promise<ResolvedPlayUrl> {
  const key = (audioKey ?? "").trim().toLowerCase();
  const cacheKey = getPhonicsLetterCacheKey(key);

  const warmed = getGlobalCachedAudioForPlayback(cacheKey);
  if (warmed?.src) {
    return { url: warmed.src };
  }

  const blobUrl = await getLocalCachedAudioUrl(cacheKey);
  if (blobUrl) {
    return { url: blobUrl, cleanup: () => URL.revokeObjectURL(blobUrl) };
  }

  return { url: resolvePlayableUrl(key) };
}

function isCancelledError(error: string): boolean {
  return error === "phonics_superseded" || error === "phonics_cancelled";
}

/** Single phoneme/letter clip — sole owner, clean instance, no retry storms. */
async function playStaticKeyClip(
  audioKey: string,
  source: string,
  options?: Pick<PlayPhonicsStaticOptions, "isCancelled" | "playbackRate">,
): Promise<PlayPhonicsStaticResult> {
  const key = (audioKey ?? "").trim().toLowerCase();
  if (!key) return { ok: false, audioKey: key, error: "phonics_empty_key" };
  if (options?.isCancelled?.()) {
    return { ok: false, audioKey: key, error: "phonics_cancelled" };
  }

  recordTtsUserGesture();
  const resolved = await resolveBestPlayUrl(key);
  logAmyVoiceDiag("phonics_static_play", { audioKey: key, url: resolved.url, source });

  const result = await playPhonicsUrl(resolved.url, {
    label: key,
    playbackRate: options?.playbackRate,
    isCancelled: options?.isCancelled,
    cleanup: resolved.cleanup,
  });

  if (result.ok) {
    void warmLocalCacheFromUrl(getPhonicsLetterCacheKey(key), resolvePlayableUrl(key));
    logAudioHealthSuccess({ layer: "static", fallbackUsed: false });
    return { ok: true, audioKey: key, url: resolved.url };
  }

  if (isCancelledError(result.error)) {
    return { ok: false, audioKey: key, error: "phonics_cancelled" };
  }

  logPhonicsPlaybackFailure(key, result.error);
  return { ok: false, audioKey: key, error: result.error };
}

/** One phoneme clip for CVC blend. */
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
  return playStaticKeyClip(audioKey, "phonics-static", options);
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
