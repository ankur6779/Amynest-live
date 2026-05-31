/**
 * Strict audio playback state machine — P0 reliability gate.
 * Every request must resolve to PLAYING or FAILED (never infinite LOADING).
 */

import { isAudioPlaybackRecoveryMode } from "@/lib/audio-playback-recovery";

export type AudioPlaybackFsmState =
  | "IDLE"
  | "LOADING"
  | "READY"
  | "PLAYING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED";

const VALID_TRANSITIONS: Record<AudioPlaybackFsmState, ReadonlySet<AudioPlaybackFsmState>> = {
  IDLE: new Set(["LOADING", "READY", "PLAYING"]),
  LOADING: new Set(["READY", "PLAYING", "FAILED", "IDLE"]),
  READY: new Set(["PLAYING", "FAILED", "IDLE"]),
  PLAYING: new Set(["PAUSED", "COMPLETED", "FAILED", "IDLE", "LOADING"]),
  PAUSED: new Set(["PLAYING", "IDLE", "FAILED"]),
  COMPLETED: new Set(["IDLE", "LOADING"]),
  FAILED: new Set(["IDLE", "LOADING"]),
};

export type AudioPlaybackFsmSnapshot = {
  state: AudioPlaybackFsmState;
  requestId: string | null;
  hasSource: boolean;
  error: string | null;
  updatedAt: number;
};

export class AudioPlaybackStateMachine {
  private state: AudioPlaybackFsmState = "IDLE";
  private requestId: string | null = null;
  private hasSource = false;
  private error: string | null = null;
  private updatedAt = Date.now();
  private loadingWatchdog: ReturnType<typeof setTimeout> | null = null;
  private onWatchdogFire: ((requestId: string) => void) | null = null;

  constructor(watchdogMs = 3_000) {
    this.watchdogMs = watchdogMs;
  }

  private watchdogMs: number;

  getSnapshot(): AudioPlaybackFsmSnapshot {
    return {
      state: this.state,
      requestId: this.requestId,
      hasSource: this.hasSource,
      error: this.error,
      updatedAt: this.updatedAt,
    };
  }

  setWatchdogHandler(handler: (requestId: string) => void): void {
    this.onWatchdogFire = handler;
  }

  private clearWatchdog(): void {
    if (this.loadingWatchdog != null) {
      clearTimeout(this.loadingWatchdog);
      this.loadingWatchdog = null;
    }
  }

  private armWatchdog(): void {
    if (isAudioPlaybackRecoveryMode()) return;
    this.clearWatchdog();
    const rid = this.requestId;
    if (!rid || this.state !== "LOADING") return;
    this.loadingWatchdog = setTimeout(() => {
      if (this.requestId === rid && this.state === "LOADING") {
        this.transition("FAILED", { error: "audio_start_timeout", requestId: rid });
        this.onWatchdogFire?.(rid);
      }
    }, this.watchdogMs);
  }

  private transition(
    next: AudioPlaybackFsmState,
    opts?: { requestId?: string | null; hasSource?: boolean; error?: string | null },
  ): void {
    const allowed = VALID_TRANSITIONS[this.state];
    if (!allowed.has(next)) {
      if (import.meta.env.DEV) {
        console.warn("[AudioFsm] invalid transition", {
          from: this.state,
          to: next,
          requestId: this.requestId,
        });
      }
      return;
    }

    if (next === "READY" && opts?.hasSource !== true) {
      if (import.meta.env.DEV) {
        console.warn("[AudioFsm] READY rejected — no source bound");
      }
      return;
    }

    if (next === "PLAYING" && !this.hasSource && opts?.hasSource !== true) {
      if (import.meta.env.DEV) {
        console.warn("[AudioFsm] PLAYING rejected — no source");
      }
      return;
    }

    this.state = next;
    if (opts?.requestId !== undefined) this.requestId = opts.requestId;
    if (opts?.hasSource !== undefined) this.hasSource = opts.hasSource;
    if (opts?.error !== undefined) this.error = opts.error;
    this.updatedAt = Date.now();

    if (next === "LOADING") {
      this.armWatchdog();
    } else {
      this.clearWatchdog();
    }
  }

  beginRequest(requestId: string): void {
    this.transition("LOADING", { requestId, hasSource: false, error: null });
  }

  markSourceReady(requestId: string): void {
    if (this.requestId !== requestId) return;
    this.transition("READY", { requestId, hasSource: true, error: null });
  }

  markPlaying(requestId: string): void {
    if (this.requestId !== requestId) return;
    this.hasSource = true;
    this.transition("PLAYING", { requestId, hasSource: true, error: null });
  }

  markPaused(requestId: string): void {
    if (this.requestId !== requestId) return;
    this.transition("PAUSED", { requestId });
  }

  markCompleted(requestId: string): void {
    if (this.requestId !== requestId) return;
    this.transition("COMPLETED", { requestId, error: null });
    this.transition("IDLE", { requestId: null, hasSource: false, error: null });
  }

  markFailed(requestId: string, error: string): void {
    if (this.requestId !== requestId) return;
    this.transition("FAILED", { requestId, error });
  }

  reset(): void {
    this.clearWatchdog();
    this.state = "IDLE";
    this.requestId = null;
    this.hasSource = false;
    this.error = null;
    this.updatedAt = Date.now();
  }

  isLoading(): boolean {
    return this.state === "LOADING";
  }

  isTerminal(): boolean {
    return this.state === "COMPLETED" || this.state === "FAILED" || this.state === "IDLE";
  }
}

/** Shared FSM for Amy voice controller (TTS / coach / parent hub / lessons). */
export const amyVoicePlaybackFsm = new AudioPlaybackStateMachine(3_000);

/** Shared FSM for phonics player channel. */
export const phonicsPlaybackFsm = new AudioPlaybackStateMachine(3_000);
