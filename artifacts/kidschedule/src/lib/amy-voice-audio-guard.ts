/**
 * Controller-level audio safety guard — no silent playback failures.
 * Every failed speak attempt must fallback to emergency audio or surface retry UI.
 */

import { forceOpenTtsApiCircuit, resetTtsApiCircuit } from "@/lib/amy-voice-circuit";
import { isAdminStreamingDisabled } from "@/lib/admin-audio-ops";
import {
  forceEmergencyPlayback,
  playNaturalSpeechSynthesis,
  playPhonicsPlaceholderTone,
} from "@/lib/emergency-audio";
import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";

export const GUARD_FAILURE_THRESHOLD = 3;
export const GUARD_STREAMING_DISABLE_MS = 60_000;
export const GUARD_API_DISABLE_MS = 60_000;
export const CONTROLLER_EMERGENCY_PHRASE = "Sorry, audio could not be played.";

/** No layer is treated as intentionally silent — forced TTS covers text_visual. */
const SILENT_LAYERS = new Set<AmyVoiceLayer>();

let guardFailureCount = 0;
let streamingDisabledUntil = 0;

export function isStreamingTemporarilyDisabled(): boolean {
  return isAdminStreamingDisabled() || Date.now() < streamingDisabledUntil;
}

export function temporarilyDisableStreaming(ms = GUARD_STREAMING_DISABLE_MS): void {
  streamingDisabledUntil = Date.now() + ms;
}

export function temporarilyDisableApiLayer(ms = GUARD_API_DISABLE_MS): void {
  forceOpenTtsApiCircuit(ms);
}

export function trackGuardFailure(): void {
  guardFailureCount += 1;
  if (guardFailureCount >= GUARD_FAILURE_THRESHOLD) {
    temporarilyDisableStreaming();
    temporarilyDisableApiLayer();
  }
}

export function resetGuardFailures(): void {
  guardFailureCount = 0;
  streamingDisabledUntil = 0;
  resetTtsApiCircuit();
}

/** Fresh user speak — clear guard circuit so live TTS can run after prior failures. */
export function resetGuardForUserSpeak(): void {
  resetGuardFailures();
}

export function getGuardFailureCount(): number {
  return guardFailureCount;
}

export function isSilentSpeakLayer(layer?: AmyVoiceLayer): boolean {
  return layer != null && SILENT_LAYERS.has(layer);
}

/** Control-flow errors — do not trigger emergency/toast. */
export function shouldBypassAudioGuard(error: string): boolean {
  return (
    error === "tts_stale" ||
    error === "tts_empty_text" ||
    error === "tts_cancelled" ||
    error === "tts_superseded" ||
    error === "playback_blocked_tap_again"
  );
}

/** Instant local fallback — forced synthesis/tone with no validation. No network. */
export async function playControllerEmergencyAudio(
  text = CONTROLLER_EMERGENCY_PHRASE,
): Promise<
  | { success: true; layer: "emergency_local" }
  | { success: false; error: string; layer: "emergency_local" }
> {
  const forced = await forceEmergencyPlayback(text);
  if (forced.success) {
    return { success: true, layer: "emergency_local" };
  }

  const spoke = await playNaturalSpeechSynthesis(CONTROLLER_EMERGENCY_PHRASE);
  if (spoke) {
    return { success: true, layer: "emergency_local" };
  }

  const tone = await playPhonicsPlaceholderTone(0);
  if (tone) {
    return { success: true, layer: "emergency_local" };
  }

  return { success: false, error: "emergency_failed", layer: "emergency_local" };
}

export type PlaybackFailureFeedback = {
  message: string;
  error: string;
  retry: () => Promise<unknown>;
};
