/**
 * Global speak safety utilities — request ownership + shared helpers.
 * Playback lifecycle is owned by amy-voice-controller.ts.
 */

export {
  createSpeakRequest,
  isCurrentSpeakRequest,
  invalidateSpeakRequests,
  bumpSpeakRequestId,
  getSpeakRequestId,
  isSpeakRequestCurrent,
  cancelAllSpeakRequests,
  runWithControlledAudioStop,
} from "@/lib/amy-voice-ownership";

export type { AmyVoiceStatus as PlaybackState } from "@/lib/amy-voice-controller";

import { amyVoiceController } from "@/lib/amy-voice-controller";

/** @deprecated Use amyVoiceController.getSnapshot().status */
export function getPlaybackState() {
  return amyVoiceController.getSnapshot().status;
}

/** @deprecated Controller owns state transitions — no external callers */
export function setPlaybackState(_next: "idle" | "loading" | "playing"): void {
  if (import.meta.env.DEV) {
    console.warn(
      "[amy-voice-safety] setPlaybackState is deprecated — use amyVoiceController.pause()",
    );
  }
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
