/**
 * Audio start guarantee — every speak() path must prove playback actually started,
 * or fail fast so callers can retry / fallback / surface an error.
 */

import { recordTtsUserGesture } from "@/lib/tts-guard";

export const AUDIBLE_START_TIMEOUT_MS = 800;
export const LOADING_STUCK_MS = 1000;
export const MIN_AUDIO_SRC_LENGTH = 10;
export const MIN_AUDIO_BLOB_BYTES = 500;

export type AudioStartLog = {
  event: "audio_start";
  success: boolean;
  src: string;
  layer?: string;
  error?: string;
};

export function logAudioStart(payload: AudioStartLog): void {
  if (import.meta.env.DEV) {
    console.info("[AmyVoiceAudioStart]", payload);
  }
}

export function isNotAllowedPlayError(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? "";
  const msg = err instanceof Error ? err.message : String(err);
  return (
    name === "NotAllowedError" ||
    /notallowed|user interaction|gesture/i.test(msg)
  );
}

function isRetryableStartError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === "invalid_audio_src" || msg === "invalid_audio_blob") return false;
  return true;
}

/** Block play when src is missing or obviously invalid. */
export function validateAudioSrc(audio: HTMLAudioElement): void {
  const src = (audio.src ?? "").trim();
  if (!src || src.length < MIN_AUDIO_SRC_LENGTH) {
    throw new Error("invalid_audio_src");
  }
}

/** Reject truncated / corrupt blob payloads before attaching to audio. */
export function validateAudioBlob(blob: Blob): void {
  if (blob.size < MIN_AUDIO_BLOB_BYTES) {
    throw new Error("invalid_audio_blob");
  }
}

/**
 * Resolve when the browser fires "playing", or reject on error / timeout.
 * Single authoritative "did audio actually start?" gate.
 */
export function waitForAudibleStart(
  audio: HTMLAudioElement,
  timeoutMs = AUDIBLE_START_TIMEOUT_MS,
): Promise<boolean> {
  if (!audio.paused && audio.currentTime > 0) {
    return Promise.resolve(true);
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("audio_start_timeout"));
    }, timeoutMs);

    function onPlaying() {
      cleanup();
      resolve(true);
    }

    function onError() {
      cleanup();
      reject(new Error("audio_error"));
    }

    function cleanup() {
      window.clearTimeout(timeout);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
    }

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError, { once: true });
  });
}

/** Loading stuck: currentTime still 0 after 1s while not ended. */
export function waitForLoadingProgress(
  audio: HTMLAudioElement,
  timeoutMs = LOADING_STUCK_MS,
): Promise<void> {
  if (audio.currentTime > 0 || audio.ended) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      if (audio.currentTime === 0 && !audio.ended) {
        reject(new Error("audio_loading_stuck"));
        return;
      }
      resolve();
    }, timeoutMs);

    const onProgress = () => {
      if (audio.currentTime > 0 || audio.ended) {
        cleanup();
        resolve();
      }
    };

    function cleanup() {
      window.clearTimeout(timeout);
      audio.removeEventListener("playing", onProgress);
      audio.removeEventListener("timeupdate", onProgress);
      audio.removeEventListener("canplay", onProgress);
      audio.removeEventListener("ended", onProgress);
    }

    audio.addEventListener("playing", onProgress);
    audio.addEventListener("timeupdate", onProgress);
    audio.addEventListener("canplay", onProgress);
    audio.addEventListener("ended", onProgress);
  });
}

export type PlayWithAudibleStartOpts = {
  audio: HTMLAudioElement;
  layer?: string;
  /** Called to invoke audio.play() — may throw. */
  play: () => Promise<void>;
  /** Retry play once after gesture unlock on NotAllowedError. */
  unlockGesture?: () => void;
};

/**
 * Validate src → play → waitForAudibleStart → loading progress.
 * Retries once on failure; throws if still not audible.
 */
export async function playWithAudibleStartGuarantee(
  opts: PlayWithAudibleStartOpts,
): Promise<void> {
  const { audio, layer, play, unlockGesture } = opts;
  const src = audio.src ?? "";

  validateAudioSrc(audio);

  const attempt = async (isRetry: boolean): Promise<void> => {
    try {
      await play();
      await waitForAudibleStart(audio);
      await waitForLoadingProgress(audio);
      logAudioStart({ event: "audio_start", success: true, src, layer });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logAudioStart({
        event: "audio_start",
        success: false,
        src,
        layer,
        error: msg,
      });

      if (!isRetry && isNotAllowedPlayError(err)) {
        recordTtsUserGesture();
        unlockGesture?.();
        await attempt(true);
        return;
      }

      if (!isRetry) {
        if (!isRetryableStartError(err)) {
          throw err;
        }
        if (import.meta.env.DEV) {
          console.warn("[AmyVoiceAudioStart] playback failed, retrying", { layer, error: msg });
        }
        await attempt(true);
        return;
      }

      throw err;
    }
  };

  await attempt(false);
}
