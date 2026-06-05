/**
 * Production-safe audio diagnostics — always logs via console.error (never throws).
 */

import { snapshotAudibleElement } from "@/lib/audible-start-diagnostic";
import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import { getUnlockAudioContextState, isAudioUnlocked } from "@/lib/tts-guard";

export type AudioDebugPayload = {
  audioContextState?: string;
  userGestureDetected?: boolean;
  fileUrl?: string;
  playbackMethod?: string;
  error?: string;
  [key: string]: unknown;
};

/** Structured production log — surfaces in client error pipeline + DevTools. */
export function logAudioDebug(
  playbackMethod: string,
  detail: AudioDebugPayload = {},
  audio?: HTMLAudioElement | null,
): void {
  const element = audio ? snapshotAudibleElement(audio) : null;
  console.error("[AUDIO DEBUG]", {
    audioContextState: getUnlockAudioContextState(),
    userGestureDetected: isAudioUnlocked(),
    androidAudioClient: isAndroidAmyNestAudioClient(),
    playbackMethod,
    ...detail,
    ...(element ? { element } : {}),
  });
}
