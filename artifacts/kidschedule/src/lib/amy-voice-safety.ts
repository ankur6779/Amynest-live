/**
 * Global speak safety: request versioning, latest-wins execution, play-token guard.
 * Used by useAmyVoice + amy-voice-pipeline to prevent race-condition playback.
 */

import { createRunLatest } from "@/lib/run-latest";

let currentRequestId = 0;
let activePlayToken: symbol | null = null;

const speakRunner = createRunLatest();

export function bumpSpeakRequestId(): number {
  currentRequestId += 1;
  activePlayToken = null;
  return currentRequestId;
}

export function getSpeakRequestId(): number {
  return currentRequestId;
}

export function isSpeakRequestCurrent(requestId: number): boolean {
  return requestId === currentRequestId;
}

export function beginSpeakPlayToken(): symbol {
  const token = Symbol("web_amy_voice_play");
  activePlayToken = token;
  return token;
}

export function isSpeakPlayTokenActive(token: symbol): boolean {
  return activePlayToken === token;
}

export function cancelAllSpeakRequests(): number {
  return bumpSpeakRequestId();
}

export type PlaybackState = "idle" | "loading" | "playing";

let playbackState: PlaybackState = "idle";

export function getPlaybackState(): PlaybackState {
  return playbackState;
}

export function setPlaybackState(next: PlaybackState): void {
  playbackState = next;
}

/** Latest-wins — old taps are discarded instead of queued behind stale work. */
export function withSpeakMutex<T>(fn: () => Promise<T>): Promise<T> {
  return speakRunner.runLatest(async () => {
    if (playbackState === "playing") {
      cancelAllSpeakRequests();
    }
    setPlaybackState("loading");
    try {
      const result = await fn();
      return result;
    } catch (err) {
      if ((err as { code?: string })?.code !== "tts_superseded") {
        setPlaybackState("idle");
      }
      throw err;
    }
  });
}

export function isSpeakPipelineBusy(): boolean {
  return speakRunner.isRunning();
}

export function getSpeakQueueWaitMs(): number {
  return speakRunner.getPendingQueueWaitMs();
}

export function abortSignalWithTimeout(
  timeoutMs: number,
  parent?: AbortSignal | null,
): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const clear = () => {
    clearTimeout(timer);
    if (parent) parent.removeEventListener("abort", onAbort);
  };
  return { signal: controller.signal, clear };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
