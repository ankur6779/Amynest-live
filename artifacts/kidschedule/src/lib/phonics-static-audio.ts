/**
 * Curated phonics MP3 playback — bypasses runtime ElevenLabs / OpenAI TTS.
 * Fallback order: static → speech synthesis → tone (never silent).
 */

import {
  getAllPhonicsAudioKeys,
  getPhonicsAudioPath,
  getPhonicsLetterCacheKey,
  resolvePhonicsAudioKey,
  resolvePhonicsSequenceKeys,
} from "@workspace/phonics-sounds";
import { audioManager } from "@/lib/audio-manager";
import {
  getLocalCachedAudioUrl,
  localCacheKeyForPhonics,
  warmLocalCacheFromUrl,
} from "@/lib/local-tts-cache";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { logAudioHealthSuccess } from "@/lib/audio-health";
import { shouldUsePhonicsVoiceFallback } from "@/lib/phonics-manifest";
import {
  logPhonicsPlaybackFailure,
  playPhonemeFallbackVoice,
} from "@/lib/phonics-playback-fallback";

export { getAllPhonicsAudioKeys, resolvePhonicsAudioKey, resolvePhonicsSequenceKeys };

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
    void warmLocalCacheFromUrl(localCacheKeyForPhonics(key), getPhonicsStaticAudioUrl(key));
  }
}

export function prefetchAllPhonicsAudio(): void {
  prefetchPhonicsAudioKeys(getAllPhonicsAudioKeys());
}

export type PlayPhonicsStaticOptions = {
  waitUntilEnd?: boolean;
  playbackRate?: number;
  isCancelled?: () => boolean;
};

export type PlayPhonicsStaticResult =
  | { ok: true; audioKey: string; url?: string; fallback?: "voice" | "tone" }
  | { ok: false; audioKey: string; error: string };

async function resolvePlayableUrl(audioKey: string): Promise<string | null> {
  const cacheKey = localCacheKeyForPhonics(audioKey);
  const cached = await getLocalCachedAudioUrl(cacheKey);
  if (cached) return cached;
  return getPhonicsStaticAudioUrl(audioKey);
}

async function playStaticMp3(
  key: string,
  url: string,
  options?: PlayPhonicsStaticOptions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const audio = audioManager.createManagedAudio(url);
  if (options?.playbackRate && options.playbackRate !== 1) {
    audio.playbackRate = options.playbackRate;
  }

  if (options?.waitUntilEnd) {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
      };
      const onEnded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("phonics_playback_error"));
      };
      if (options?.isCancelled?.()) {
        cleanup();
        reject(new Error("phonics_cancelled"));
        return;
      }
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("error", onError);
      void audioManager.play(audio).catch(reject);
    });
  } else {
    await audioManager.play(audio);
  }

  void warmLocalCacheFromUrl(getPhonicsLetterCacheKey(key), url);
  logAudioHealthSuccess({ layer: "static", fallbackUsed: false });
  return { ok: true };
}

export async function playPhonicsStaticAudio(
  audioKey: string,
  options?: PlayPhonicsStaticOptions,
): Promise<PlayPhonicsStaticResult> {
  const key = (audioKey ?? "").trim().toLowerCase();
  if (!key) return { ok: false, audioKey: key, error: "phonics_empty_key" };

  if (options?.isCancelled?.()) {
    return { ok: false, audioKey: key, error: "phonics_cancelled" };
  }

  const skipStatic = await shouldUsePhonicsVoiceFallback(key);
  if (skipStatic) {
    logAmyVoiceDiag("phonics_skip_tone_clip", { audioKey: key });
    const fallback = await playPhonemeFallbackVoice(key);
    if (fallback.success) {
      return { ok: true, audioKey: key, fallback: fallback.fallback };
    }
    logPhonicsPlaybackFailure(key, fallback.error);
    return { ok: false, audioKey: key, error: fallback.error };
  }

  const url = await resolvePlayableUrl(key);
  if (!url) {
    logPhonicsPlaybackFailure(key, "missing_url");
    const fallback = await playPhonemeFallbackVoice(key);
    if (fallback.success) {
      return { ok: true, audioKey: key, fallback: fallback.fallback };
    }
    return { ok: false, audioKey: key, error: "phonics_missing_url" };
  }

  logAmyVoiceDiag("phonics_static_play", { audioKey: key, url });

  try {
    await playStaticMp3(key, url, options);
    return { ok: true, audioKey: key, url };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "play_failed";
    logPhonicsPlaybackFailure(key, reason);
    const fallback = await playPhonemeFallbackVoice(key);
    if (fallback.success) {
      return { ok: true, audioKey: key, fallback: fallback.fallback };
    }
    const msg = err instanceof Error ? err.message : "phonics_playback_failed";
    return { ok: false, audioKey: key, error: msg };
  }
}

export async function playPhonicsSequence(
  word: string,
  options?: PlayPhonicsStaticOptions & { gapMs?: number },
): Promise<{ ok: boolean; keys: string[]; error?: string }> {
  const keys = resolvePhonicsSequenceKeys(word);
  if (keys.length === 0) {
    return { ok: false, keys, error: "phonics_sequence_empty" };
  }

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
