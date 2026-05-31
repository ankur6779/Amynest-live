/**
 * Phonics player — the STRICT single audio owner for phonics playback.
 *
 * GUARANTEES:
 * - Only ONE phonics HTMLAudioElement may be active at any time, app-wide.
 * - Every play uses a CLEAN instance — primed/cached elements are never replayed
 *   directly (that caused the "ka ka ka" loop). Prewarm only warms the URL/decoder.
 * - Token ownership: a new play (or stop) instantly invalidates the previous one.
 *   Stale playback silently dies with no side effects (no overlap, no race).
 * - Tap debounce (~80ms) collapses accidental re-triggers of the SAME clip.
 * - A single force-attempt per clip — no internal retry/force-restart storms.
 */

import {
  configureMobileAudioElement,
  recordTtsUserGesture,
} from "@/lib/tts-guard";
import {
  isNotAllowedPlayError,
  playWithAudibleStartGuarantee,
} from "@/lib/amy-voice-audio-start";
import { audioManager } from "@/lib/audio-manager";
import {
  recordPhonicsCircuitOutcome,
} from "@/lib/phonics-circuit-breaker";
import { createSafeAudio } from "@/lib/phonics-safe-audio";
import {
  recordPhonicsDebounceSkip,
  recordPhonicsGestureBlocked,
  recordPhonicsInterruption,
  recordPhonicsPlayFailed,
  recordPhonicsPlayStart,
  recordPhonicsPlaySuccess,
  recordPhonicsStartLatency,
  recordPhonicsZombieCleanup,
} from "@/lib/phonics-telemetry";
import { emitAudioPlaybackEvent } from "@/lib/audio-playback-events";
import {
  mapToAudioSourceLayer,
  trackAudioPlayFailed,
  trackAudioPlayStarted,
  trackAudioRequest,
  trackAudioTimeout,
  finishAudioRequest,
} from "@/lib/audio-reliability-telemetry";
import { phonicsPlaybackFsm } from "@/lib/audio-playback-state-machine";
import {
  coalesceAudioRequest,
  resolveAudioCoalesceKey,
} from "@/lib/audio-request-coalescer";
import { recordHotCachePlay } from "@/lib/audio-hot-cache";
import {
  beginPlaybackTrace,
  flushPlaybackTrace,
  getPlaybackTraceId,
  playbackTraceAttach,
  playbackTracePlayCalled,
  playbackTracePlaySettled,
  tracePlaybackDestroy,
  tracePlaybackStop,
  tracePlaybackStopAll,
} from "@/lib/playback-trace";
import {
  recordQueueInterruption,
  recordStaleAudioPrevented,
} from "@/lib/audio-playback-queue";
import {
  recordPlaybackQualityCompleted,
  recordPlaybackQualityFailed,
  recordPlaybackQualityInterrupted,
  recordPlaybackQualityLoaded,
  recordPlaybackQualityRequested,
  recordPlaybackQualityStarted,
} from "@/lib/playback-quality-telemetry";

export type PhonicsPlayResult =
  | { ok: true }
  | { ok: false; error: string };

export type PhonicsPlayUrlOptions = {
  /** Human-readable label (audioKey / word) for structured logs. */
  label?: string;
  playbackRate?: number;
  /** Abort between/within steps (new tap, panel closed, leaving phonics). */
  isCancelled?: () => boolean;
  /** Object URL cleanup (revoke blob) once playback settles. */
  cleanup?: () => void;
};

/** Collapse duplicate taps of the SAME clip within this window. */
const TAP_DEBOUNCE_MS = 80;
/**
 * Zombie watchdog: phoneme clips are tiny (<~900ms). If a clip neither ends nor
 * errors within this window the browser is wedged — force cleanup and clear
 * ownership so the "playing" state can never get stuck forever.
 */
const ZOMBIE_WATCHDOG_MS = 3_000;

let activeElement: HTMLAudioElement | null = null;
/** Ownership token — bumped on every play() and stop(); stale work checks this. */
let ownershipToken = 0;
let playing = false;
let lastUrl = "";
let lastStartAt = 0;
let activeLabel: string | null = null;

const listeners = new Set<(state: { playing: boolean; label: string | null }) => void>();

function log(event: string, detail: Record<string, unknown> = {}): void {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.info("[PhonicsPlayer]", event, detail);
  }
}

function notify(): void {
  const state = { playing, label: activeLabel };
  for (const listener of listeners) listener(state);
}

function setPlaying(next: boolean, label: string | null): void {
  if (playing === next && activeLabel === label) return;
  playing = next;
  activeLabel = label;
  void import("@/lib/audio-session-coordinator").then(({ notifyPlaybackStarted, notifyPlaybackEnded }) => {
    if (next) notifyPlaybackStarted(`phonics:${label ?? "unknown"}`);
    else notifyPlaybackEnded(`phonics:${label ?? "unknown"}`);
  });
  notify();
}

/** Detach listeners and silence an element so it can be garbage collected. */
function teardownElement(el: HTMLAudioElement): void {
  el.onended = null;
  el.onerror = null;
  el.onpause = null;
  try {
    el.pause();
  } catch {
    /* ignore */
  }
  try {
    el.removeAttribute("src");
    el.load();
  } catch {
    /* ignore */
  }
}

/**
 * Stop all phonics playback immediately and reset ownership.
 * Safe to call from anywhere (tap, stop button, leaving phonics, controller pause).
 */
export function stopPhonicsPlayback(reason = "manual"): void {
  ownershipToken += 1;
  const el = activeElement;
  const traceId = el ? getPlaybackTraceId(el) : null;
  recordPlaybackQualityInterrupted(null, { reason, owner: "Phonics" });
  tracePlaybackStop(traceId, "Phonics", reason, el);
  activeElement = null;
  lastUrl = "";
  if (el) {
    tracePlaybackDestroy(traceId, "Phonics", reason, el);
    teardownElement(el);
    log("phonics_stop", { reason });
  }
  setPlaying(false, null);
}

export function isPhonicsPlaying(): boolean {
  return playing;
}

export function getActivePhonicsLabel(): string | null {
  return activeLabel;
}

/** Subscribe to playback state (for a visible Stop control). Returns unsubscribe. */
export function subscribePhonicsPlayback(
  listener: (state: { playing: boolean; label: string | null }) => void,
): () => void {
  listeners.add(listener);
  listener({ playing, label: activeLabel });
  return () => {
    listeners.delete(listener);
  };
}

/** Resolve once the clip ends, errors, is cancelled, or is superseded. */
function waitForClipEnd(
  el: HTMLAudioElement,
  token: number,
  isCancelled?: () => boolean,
): Promise<PhonicsPlayResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: PhonicsPlayResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
      resolve(result);
    };

    const onEnded = () => finish({ ok: true });
    const onError = () => finish({ ok: false, error: "phonics_playback_error" });

    if (el.ended) {
      finish({ ok: true });
      return;
    }

    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);

    const durationSec =
      Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    // Cap by the zombie watchdog: even with metadata a tiny clip never needs >3s.
    const timeoutMs = durationSec > 0
      ? Math.min(Math.ceil((durationSec + 0.4) * 1000), ZOMBIE_WATCHDOG_MS)
      : ZOMBIE_WATCHDOG_MS;

    const poll = window.setInterval(() => {
      if (token !== ownershipToken) {
        finish({ ok: false, error: "phonics_superseded" });
        return;
      }
      if (isCancelled?.()) {
        finish({ ok: false, error: "phonics_cancelled" });
        return;
      }
      if (el.ended) {
        finish({ ok: true });
      }
    }, 60);

    const timer = window.setTimeout(() => {
      if (el.ended) return finish({ ok: true });
      finish({ ok: false, error: "phonics_zombie_timeout" });
    }, timeoutMs);
  });
}

/**
 * Play a single phonics clip from a resolved URL as the sole audio owner.
 * Stops any prior phonics sound, starts a clean instance, and waits for it to end.
 */
export async function playPhonicsUrl(
  url: string,
  options: PhonicsPlayUrlOptions = {},
): Promise<PhonicsPlayResult> {
  const trimmed = (url ?? "").trim();
  const label = options.label ?? trimmed;
  if (!trimmed) {
    options.cleanup?.();
    return { ok: false, error: "phonics_empty_url" };
  }
  if (options.isCancelled?.()) {
    options.cleanup?.();
    return { ok: false, error: "phonics_cancelled" };
  }

  recordTtsUserGesture();

  const now = Date.now();
  if (playing && trimmed === lastUrl && now - lastStartAt < TAP_DEBOUNCE_MS) {
    log("phonics_debounce_skip", { label });
    recordPhonicsDebounceSkip(label);
    options.cleanup?.();
    return { ok: true };
  }

  const module =
    label.includes("blend") || label.includes("cvc") ? "blending" : "phonics";
  const key = resolveAudioCoalesceKey(trimmed, module);
  return coalesceAudioRequest(key, () => playPhonicsUrlInner(trimmed, label, options));
}

async function playPhonicsUrlInner(
  trimmed: string,
  label: string,
  options: PhonicsPlayUrlOptions,
): Promise<PhonicsPlayResult> {
  const now = Date.now();
  const token = ++ownershipToken;
  const playbackTraceId = beginPlaybackTrace({
    owner: "Phonics",
    requestedUrl: trimmed,
    phrase: label,
    autoFlush: false,
  });
  const qualitySessionId = recordPlaybackQualityRequested({
    owner: "PhonicsPlayer",
    assetRequested: label,
    assetResolved: label,
    assetUrl: trimmed,
    extra: { coalesceKey: resolveAudioCoalesceKey(trimmed, "phonics") },
  });

  const previous = activeElement;
  activeElement = null;
  if (previous) {
    tracePlaybackStopAll("Phonics", "new_play_interrupt");
    tracePlaybackDestroy(getPlaybackTraceId(previous), "Phonics", "new_play_interrupt", previous);
    teardownElement(previous);
    log("phonics_interrupt", { label });
    recordPhonicsInterruption(label);
    recordQueueInterruption();
    emitAudioPlaybackEvent("audio_interrupted", {
      source: "phonics",
      phrase: label,
      interruptedBy: "phonics_new_play",
    });
  }

  lastUrl = trimmed;
  lastStartAt = now;

  // Always a CLEAN instance — never a primed/cached element.
  const el = createSafeAudio(trimmed, { label });
  if (!el) {
    options.cleanup?.();
    const error = trimmed.includes("storage.googleapis.com") || !trimmed
      ? "phonics_url_blocked"
      : "phonics_empty_url";
    const failId = trackAudioRequest({ module: "phonics", audioIdentity: label });
    trackAudioPlayFailed(failId, error, "STATIC_GCS");
    recordPhonicsPlayFailed(label, error, { url: trimmed.slice(0, 200) });
    recordPhonicsCircuitOutcome(false, error);
    recordPlaybackQualityFailed(qualitySessionId, { reason: error });
    return { ok: false, error };
  }
  configureMobileAudioElement(el);
  el.preload = "auto";
  el.muted = false;
  if (el.volume <= 0) el.volume = 1;
  if (options.playbackRate && options.playbackRate !== 1) {
    el.playbackRate = options.playbackRate;
  }
  activeElement = el;
  playbackTraceAttach(playbackTraceId, el, "Phonics");
  setPlaying(true, label);
  log("phonics_play", { label, token });
  recordPhonicsPlayStart(label);
  emitAudioPlaybackEvent("audio_started", { source: "phonics", phrase: label, layer: "static" });
  const reliabilityId = trackAudioRequest({
    module: label.includes("blend") || label.includes("cvc") ? "blending" : "phonics",
    audioIdentity: label,
    sourceLayer: trimmed.startsWith("blob:") ? "LOCAL_CACHE" : "STATIC_GCS",
  });
  phonicsPlaybackFsm.beginRequest(reliabilityId);

  let settled = false;
  const settle = (result: PhonicsPlayResult): PhonicsPlayResult => {
    if (settled) return result;
    settled = true;
    options.cleanup?.();
    const stillOwner = token === ownershipToken;
    if (result.ok) {
      recordPlaybackQualityCompleted(qualitySessionId, {
        stopReason: result.error ?? "phonics_complete",
      });
    } else {
      recordPlaybackQualityFailed(qualitySessionId, {
        reason: result.error ?? "phonics_failed",
      });
    }
    if (playbackTraceId) {
      flushPlaybackTrace(
        playbackTraceId,
        result.ok ? "phonics_complete" : result.error ?? "phonics_failed",
      );
    }
    // Always force-clean this single-use instance — guarantees a wedged/zombie
    // clip is silenced rather than playing on in the background.
    tracePlaybackDestroy(getPlaybackTraceId(el), "Phonics", "settle", el);
    teardownElement(el);
    if (stillOwner) {
      if (activeElement === el) activeElement = null;
      setPlaying(false, null);
    }
    if (result.ok) {
      recordPhonicsPlaySuccess(label, { url: trimmed.slice(0, 200) });
      recordHotCachePlay(label);
      trackAudioPlayStarted(reliabilityId, mapToAudioSourceLayer("static", { srcType: "static" }));
      finishAudioRequest(reliabilityId);
      phonicsPlaybackFsm.markCompleted(reliabilityId);
    } else {
      recordPhonicsPlayFailed(label, result.error, { url: trimmed.slice(0, 200) });
      trackAudioPlayFailed(reliabilityId, result.error, "STATIC_GCS");
      phonicsPlaybackFsm.markFailed(reliabilityId, result.error);
    }
    recordPhonicsCircuitOutcome(result.ok, result.ok ? undefined : result.error);
    return result;
  };

  try {
    el.currentTime = 0;
    playbackTracePlayCalled(playbackTraceId, "Phonics", el);
    await playWithAudibleStartGuarantee({
      audio: el,
      layer: `phonics:${label}`,
      play: async () => {
        await el.play();
      },
      unlockGesture: () => audioManager.unlockFromUserGesture(),
    });
    playbackTracePlaySettled(playbackTraceId, "Phonics", true, el);
    const onFirstProgress = () => {
      recordPlaybackQualityStarted(qualitySessionId, {
        firstSampleTs: performance.now(),
        durationSec: Number.isFinite(el.duration) ? el.duration : undefined,
      });
      el.removeEventListener("playing", onFirstProgress);
      el.removeEventListener("timeupdate", onFirstProgress);
    };
    el.addEventListener("playing", onFirstProgress);
    el.addEventListener("timeupdate", onFirstProgress);
    const onMeta = () => {
      if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
        recordPlaybackQualityLoaded(qualitySessionId, { durationSec: el.duration });
        el.removeEventListener("loadedmetadata", onMeta);
      }
    };
    el.addEventListener("loadedmetadata", onMeta);
    recordPhonicsStartLatency(Date.now() - now);
  } catch (err) {
    playbackTracePlaySettled(playbackTraceId, "Phonics", false, el, err);
    recordPlaybackQualityFailed(qualitySessionId, {
      reason: err instanceof Error ? err.message : String(err),
    });
    if (token !== ownershipToken) {
      recordStaleAudioPrevented();
      log("phonics_stale_start", { label });
      return settle({ ok: false, error: "phonics_superseded" });
    }
    const gesture = isNotAllowedPlayError(err);
    log("phonics_start_failed", {
      label,
      error: err instanceof Error ? err.message : String(err),
      gesture,
    });
    if (gesture) {
      recordPhonicsGestureBlocked(label);
    }
    emitAudioPlaybackEvent("audio_failed", {
      source: "phonics",
      phrase: label,
      error: gesture ? "phonics_gesture_required" : "phonics_play_failed",
    });
    return settle({
      ok: false,
      error: gesture ? "phonics_gesture_required" : "phonics_play_failed",
    });
  }

  if (token !== ownershipToken) {
    recordStaleAudioPrevented();
    log("phonics_stale_after_start", { label });
    return settle({ ok: false, error: "phonics_superseded" });
  }

  const ended = await waitForClipEnd(el, token, options.isCancelled);
  if (ended.ok) {
    emitAudioPlaybackEvent("audio_completed", { source: "phonics", phrase: label });
  }
  if (ended.ok || ended.error === "phonics_superseded" || ended.error === "phonics_cancelled") {
    return settle(ended);
  }
  log("phonics_clip_failed", { label, error: ended.error });
  if (ended.error === "phonics_zombie_timeout") {
    recordPhonicsZombieCleanup(label);
  }
  return settle(ended);
}
