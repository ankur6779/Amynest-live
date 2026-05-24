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
import { audioManager } from "@/lib/audio-manager";
import { warmLocalCacheFromUrl } from "@/lib/local-tts-cache";
import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { logAudioHealthSuccess } from "@/lib/audio-health";
import { recordTtsUserGesture } from "@/lib/tts-guard";
import { logPhonicsPlaybackFailure } from "@/lib/phonics-playback-fallback";

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

function blendEndTimeoutMs(audio: HTMLAudioElement): number {
  const durationSec =
    Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
  return durationSec > 0 ? Math.ceil((durationSec + 0.35) * 1000) : 8_000;
}

function waitForClipEnd(
  audio: HTMLAudioElement,
  isCancelled: () => boolean,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (audio.ended) {
      resolve(true);
      return;
    }
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      resolve(ok);
    };
    const onEnded = () => finish(true);
    const onError = () => finish(false);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    const timer = window.setTimeout(() => {
      if (isCancelled()) return finish(false);
      if (audio.ended) return finish(true);
      finish(false);
    }, timeoutMs);
  });
}

/** One phoneme clip for CVC blend — no retry storms on the same letter. */
export async function playBlendPhonemeClip(
  audioKey: string,
  options?: Pick<PlayPhonicsStaticOptions, "isCancelled" | "playbackRate">,
): Promise<PlayPhonicsStaticResult> {
  const key = (audioKey ?? "").trim().toLowerCase();
  if (!key) return { ok: false, audioKey: key, error: "phonics_empty_key" };
  if (options?.isCancelled?.()) {
    return { ok: false, audioKey: key, error: "phonics_cancelled" };
  }

  recordTtsUserGesture();
  const url = resolvePlayableUrl(key);
  const audio = audioManager.create(url);
  if (options?.playbackRate && options.playbackRate !== 1) {
    audio.playbackRate = options.playbackRate;
  }

  const started = await audioManager.play(
    audio,
    {
      proxyUrl: url,
      source: "cvc-blend-phoneme",
      phrase: key,
      channel: "ui",
      interrupt: true,
    },
    {
      channel: "ui",
      interrupt: true,
      maxRetries: 0,
      skipForceRestart: true,
    },
  );

  if (!started || options?.isCancelled?.()) {
    return { ok: false, audioKey: key, error: "phonics_playback_failed" };
  }

  const ended = await waitForClipEnd(
    audio,
    () => options?.isCancelled?.() ?? false,
    blendEndTimeoutMs(audio),
  );

  if (ended) {
    void warmLocalCacheFromUrl(getPhonicsLetterCacheKey(key), url);
    logAudioHealthSuccess({ layer: "static", fallbackUsed: false });
    return { ok: true, audioKey: key, url };
  }

  logPhonicsPlaybackFailure(key, "blend_clip_end_failed");
  return { ok: false, audioKey: key, error: "blend_clip_end_failed" };
}

async function playStaticMp3(
  key: string,
  url: string,
  options?: PlayPhonicsStaticOptions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  recordTtsUserGesture();

  const tryPlay = async (playUrl: string): Promise<boolean> => {
    if (options?.isCancelled?.()) return false;

    if (options?.waitUntilEnd) {
      const audio = audioManager.create(playUrl);
      if (options.playbackRate && options.playbackRate !== 1) {
        audio.playbackRate = options.playbackRate;
      }
      const playOpts = options.blendSequence
        ? { channel: "ui" as const, interrupt: true, maxRetries: 0, skipForceRestart: true }
        : { channel: "ui" as const, interrupt: true };
      const started = await audioManager.play(
        audio,
        {
          proxyUrl: playUrl,
          source: options.blendSequence ? "cvc-blend-phoneme" : "phonics-static",
          phrase: key,
          channel: "ui",
          interrupt: true,
        },
        playOpts,
      );
      if (!started) return false;
      if (options.isCancelled?.()) return false;
      if (options.blendSequence) {
        return waitForClipEnd(
          audio,
          () => options.isCancelled?.() ?? false,
          blendEndTimeoutMs(audio),
        );
      }
      const ended = await audioManager.waitUntilEnd(
        audio,
        () => options.isCancelled?.() ?? false,
      );
      return ended.ok;
    }

    return audioManager.playUrl(
      playUrl,
      { source: "phonics-static", phrase: key },
      { channel: "ui", interrupt: true },
    );
  };

  if (await tryPlay(url)) {
    void warmLocalCacheFromUrl(getPhonicsLetterCacheKey(key), url);
    logAudioHealthSuccess({ layer: "static", fallbackUsed: false });
    return { ok: true };
  }

  if (options?.blendSequence) {
    return { ok: false, error: "phonics_playback_failed" };
  }

  const bust = `${url}${url.includes("?") ? "&" : "?"}cb=1`;
  if (await tryPlay(bust)) {
    logAudioHealthSuccess({ layer: "static", fallbackUsed: false });
    return { ok: true };
  }

  return { ok: false, error: "phonics_playback_failed" };
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

  const url = resolvePlayableUrl(key);
  logAmyVoiceDiag("phonics_static_play", { audioKey: key, url });

  const played = await playStaticMp3(key, url, options);
  if (played.ok) {
    return { ok: true, audioKey: key, url };
  }

  logPhonicsPlaybackFailure(key, played.error);
  return { ok: false, audioKey: key, error: played.error };
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
