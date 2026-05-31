/**
 * Audible-start gate diagnostics — why readyState=4 still fails audio_start_timeout.
 * Logs on failure paths (always console.warn) and when PLAYBACK_TRACE / AUDIBLE_START_DIAG=1.
 *
 * readyState=4 (HAVE_ENOUGH_DATA) means buffered, NOT that playback started.
 */

import { isAudioPlaybackRecoveryMode } from "@/lib/audio-playback-recovery";
import { isPlaybackTraceEnabled } from "@/lib/playback-trace";

export const AUDIBLE_START_TIMEOUT_MS = 800;
export const LOADING_STUCK_MS = 1000;

const READY_STATE_LABELS: Record<number, string> = {
  0: "HAVE_NOTHING",
  1: "HAVE_METADATA",
  2: "HAVE_CURRENT_DATA",
  3: "HAVE_FUTURE_DATA",
  4: "HAVE_ENOUGH_DATA",
};

export type AudibleElementSnapshot = {
  readyState: number;
  readyStateLabel: string;
  networkState: number;
  paused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  ended: boolean;
  mediaErrorCode: number | null;
  srcTail: string;
};

export type AudibleStartTimestamps = {
  playCalledAt?: number;
  playResolvedAt?: number;
  audibleCheckStartAt?: number;
  audibleCheckEndAt?: number;
  loadingProgressStartAt?: number;
  loadingProgressEndAt?: number;
};

export function isAudibleStartDiagEnabled(): boolean {
  if (isPlaybackTraceEnabled()) return true;
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("AUDIBLE_START_DIAG") === "1";
  } catch {
    return false;
  }
}

export function snapshotAudibleElement(
  audio: HTMLAudioElement | null | undefined,
): AudibleElementSnapshot | null {
  if (!audio) return null;
  const rs = audio.readyState;
  return {
    readyState: rs,
    readyStateLabel: READY_STATE_LABELS[rs] ?? `unknown_${rs}`,
    networkState: audio.networkState,
    paused: audio.paused,
    currentTime: audio.currentTime,
    duration: audio.duration,
    volume: audio.volume,
    muted: audio.muted,
    playbackRate: audio.playbackRate,
    ended: audio.ended,
    mediaErrorCode: audio.error?.code ?? null,
    srcTail: (audio.src ?? "").slice(-120),
  };
}

/** Human-readable classification for timeout / gate failure. */
export function classifyAudibleStartFailure(
  audio: HTMLAudioElement,
  gate: string,
): string {
  const snap = snapshotAudibleElement(audio);
  if (!snap) return `${gate}: no element`;

  if (snap.mediaErrorCode != null) {
    return `${gate}: MediaError code=${snap.mediaErrorCode}`;
  }
  if (snap.ended) {
    return `${gate}: element already ended before gate passed`;
  }
  if (snap.paused && snap.currentTime === 0 && snap.readyState >= 4) {
    return (
      `${gate}: MEDIA_FULLY_LOADED_BUT_STILL_PAUSED — play() may have resolved but ` +
      `"playing" never fired within ${AUDIBLE_START_TIMEOUT_MS}ms; readyState=4 does not mean audible`
    );
  }
  if (snap.paused && snap.currentTime === 0) {
    return `${gate}: paused with currentTime=0 (no playback clock advance)`;
  }
  if (snap.paused && snap.currentTime > 0) {
    return `${gate}: paused but currentTime>0 (playback clock moved then paused)`;
  }
  if (!snap.paused && snap.currentTime === 0) {
    return `${gate}: unpaused but currentTime still 0 (playing event / clock lag)`;
  }
  if (snap.muted || snap.volume <= 0) {
    return `${gate}: output path silent (muted=${snap.muted} volume=${snap.volume})`;
  }
  if (!Number.isFinite(snap.duration) || snap.duration <= 0) {
    return `${gate}: invalid duration (${snap.duration})`;
  }
  return `${gate}: gate conditions not met within timeout (see snapshot)`;
}

export function logAudibleStartGate(
  gate: string,
  phase: "enter" | "exit" | "skip" | "fail",
  audio: HTMLAudioElement | null | undefined,
  extra?: Record<string, unknown> & { timestamps?: AudibleStartTimestamps },
): void {
  const always = phase === "fail";
  if (!always && !isAudibleStartDiagEnabled()) return;

  const snap = snapshotAudibleElement(audio);
  const ts = extra?.timestamps ?? {};
  const { timestamps: _t, ...rest } = extra ?? {};

  const payload = {
    gate,
    phase,
    recoveryMode: isAudioPlaybackRecoveryMode(),
    ...snap,
    playCalledAt: ts.playCalledAt,
    playResolvedAt: ts.playResolvedAt,
    audibleCheckStartAt: ts.audibleCheckStartAt,
    audibleCheckEndAt: ts.audibleCheckEndAt,
    loadingProgressStartAt: ts.loadingProgressStartAt,
    loadingProgressEndAt: ts.loadingProgressEndAt,
    msSincePlayResolved:
      ts.playResolvedAt != null && ts.audibleCheckEndAt != null
        ? Math.round(ts.audibleCheckEndAt - ts.playResolvedAt)
        : undefined,
    ...rest,
  };

  if (phase === "fail") {
    const reason =
      audio && rest.errorMessage === "audio_start_timeout"
        ? classifyAudibleStartFailure(audio, gate)
        : undefined;
    console.warn("[AUDIBLE_START_DIAG] FAIL", { ...payload, classification: reason });
    try {
      (window as unknown as { __AUDIBLE_START_LAST_FAIL__?: unknown }).__AUDIBLE_START_LAST_FAIL__ =
        payload;
    } catch {
      /* ignore */
    }
  } else {
    console.warn("[AUDIBLE_START_DIAG]", payload);
  }
}
