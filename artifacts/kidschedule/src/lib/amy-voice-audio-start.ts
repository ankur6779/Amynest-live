/**
 * Audio start guarantee — every speak() path must prove playback actually started,
 * or fail fast so callers can retry / fallback / surface an error.
 */

import { recordTtsUserGesture } from "@/lib/tts-guard";
import {
  isAudioPlaybackRecoveryMode,
  schedulePlaybackProgressCheck,
} from "@/lib/audio-playback-recovery";
import {
  AUDIBLE_START_TIMEOUT_MS,
  LOADING_STUCK_MS,
  classifyAudibleStartFailure,
  logAudibleStartGate,
  type AudibleStartTimestamps,
} from "@/lib/audible-start-diagnostic";

export { AUDIBLE_START_TIMEOUT_MS, LOADING_STUCK_MS };
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

/** Validate truncated / corrupt blob payloads before attaching to audio. */
export function validateAudioBlob(blob: Blob): void {
  if (blob.size < MIN_AUDIO_BLOB_BYTES) {
    throw new Error("invalid_audio_blob");
  }
}

let decodeCtx: AudioContext | null = null;

/** Decode-check blob MP3 payload — catches silent Android corrupt downloads. */
export async function validateAudioBlobDecodable(blob: Blob): Promise<void> {
  validateAudioBlob(blob);
  if (typeof window === "undefined") return;

  type AudioCtxCtor = typeof AudioContext;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext;
  if (!Ctor) return;

  if (!decodeCtx) {
    try {
      decodeCtx = new Ctor();
    } catch {
      return;
    }
  }
  if (decodeCtx.state === "suspended") {
    await decodeCtx.resume().catch(() => {});
  }

  const buffer = await blob.arrayBuffer();
  try {
    await decodeCtx.decodeAudioData(buffer.slice(0));
  } catch {
    throw new Error("invalid_audio_blob_decode");
  }
}

/**
 * Resolve when the browser fires "playing", or reject on error / timeout.
 * Recovery mode: play() already resolved — do not fail on slow currentTime advance.
 */
export function waitForAudibleStart(
  audio: HTMLAudioElement,
  timeoutMs = AUDIBLE_START_TIMEOUT_MS,
  timestamps?: AudibleStartTimestamps,
): Promise<boolean> {
  if (isAudioPlaybackRecoveryMode()) {
    logAudibleStartGate("waitForAudibleStart", "skip", audio, {
      timestamps,
      reason: "recovery_mode_bypass",
    });
    return Promise.resolve(true);
  }

  if (!audio.paused && audio.currentTime > 0) {
    logAudibleStartGate("waitForAudibleStart", "exit", audio, {
      timestamps,
      fastPath: "already_playing_currentTime_gt_0",
    });
    return Promise.resolve(true);
  }

  const checkStart = performance.now();
  if (timestamps) timestamps.audibleCheckStartAt = checkStart;
  logAudibleStartGate("waitForAudibleStart", "enter", audio, {
    timestamps,
    timeoutMs,
    waitsFor: "playing_event OR (!paused && currentTime>0)",
    note: "readyState=4 alone is NOT sufficient",
  });

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      const checkEnd = performance.now();
      if (timestamps) timestamps.audibleCheckEndAt = checkEnd;
      logAudibleStartGate("waitForAudibleStart", "fail", audio, {
        timestamps,
        errorMessage: "audio_start_timeout",
        waitedMs: timeoutMs,
        classification: classifyAudibleStartFailure(audio, "waitForAudibleStart"),
      });
      reject(new Error("audio_start_timeout"));
    }, timeoutMs);

    function onPlaying() {
      cleanup();
      const checkEnd = performance.now();
      if (timestamps) timestamps.audibleCheckEndAt = checkEnd;
      logAudibleStartGate("waitForAudibleStart", "exit", audio, {
        timestamps,
        via: "playing_event",
      });
      resolve(true);
    }

    function onError() {
      cleanup();
      const checkEnd = performance.now();
      if (timestamps) timestamps.audibleCheckEndAt = checkEnd;
      logAudibleStartGate("waitForAudibleStart", "fail", audio, {
        timestamps,
        errorMessage: "audio_error",
      });
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
  timestamps?: AudibleStartTimestamps,
): Promise<void> {
  if (isAudioPlaybackRecoveryMode()) {
    logAudibleStartGate("waitForLoadingProgress", "skip", audio, {
      timestamps,
      reason: "recovery_mode_bypass",
    });
    return Promise.resolve();
  }
  if (audio.currentTime > 0 || audio.ended) {
    logAudibleStartGate("waitForLoadingProgress", "exit", audio, {
      timestamps,
      fastPath: "currentTime_gt_0_or_ended",
    });
    return Promise.resolve();
  }

  const progressStart = performance.now();
  if (timestamps) timestamps.loadingProgressStartAt = progressStart;
  logAudibleStartGate("waitForLoadingProgress", "enter", audio, {
    timestamps,
    timeoutMs,
    requires: "currentTime > 0 within timeout",
  });

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      const progressEnd = performance.now();
      if (timestamps) timestamps.loadingProgressEndAt = progressEnd;
      if (audio.currentTime === 0 && !audio.ended) {
        logAudibleStartGate("waitForLoadingProgress", "fail", audio, {
          timestamps,
          errorMessage: "audio_loading_stuck",
          classification: classifyAudibleStartFailure(audio, "waitForLoadingProgress"),
        });
        reject(new Error("audio_loading_stuck"));
        return;
      }
      logAudibleStartGate("waitForLoadingProgress", "exit", audio, { timestamps });
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

  const timestamps: AudibleStartTimestamps = {};

  const attempt = async (isRetry: boolean): Promise<void> => {
    try {
      timestamps.playCalledAt = performance.now();
      logAudibleStartGate("playWithAudibleStartGuarantee", "enter", audio, {
        timestamps,
        layer,
        isRetry,
      });
      await play();
      timestamps.playResolvedAt = performance.now();
      logAudibleStartGate("playWithAudibleStartGuarantee", "exit", audio, {
        timestamps,
        layer,
        phase: "play_promise_resolved",
        msPlayDuration: Math.round(
          timestamps.playResolvedAt - (timestamps.playCalledAt ?? timestamps.playResolvedAt),
        ),
      });
      if (isAudioPlaybackRecoveryMode()) {
        schedulePlaybackProgressCheck(audio, layer ?? "play");
        logAudioStart({ event: "audio_start", success: true, src, layer });
        return;
      }
      await waitForAudibleStart(audio, AUDIBLE_START_TIMEOUT_MS, timestamps);
      await waitForLoadingProgress(audio, LOADING_STUCK_MS, timestamps);
      logAudibleStartGate("playWithAudibleStartGuarantee", "exit", audio, {
        timestamps,
        layer,
        phase: "all_gates_passed",
      });
      logAudioStart({ event: "audio_start", success: true, src, layer });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logAudibleStartGate("playWithAudibleStartGuarantee", "fail", audio, {
        timestamps,
        layer,
        isRetry,
        errorMessage: msg,
        classification:
          msg === "audio_start_timeout"
            ? classifyAudibleStartFailure(audio, "playWithAudibleStartGuarantee")
            : undefined,
      });
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
