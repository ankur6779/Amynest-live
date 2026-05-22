/** TTS API circuit breaker — adaptive duration from recent failure rate. */

import { getAdaptiveApiCircuitMs } from "@/lib/amy-voice-adaptive";

let ttsApiCircuitUntil = 0;
let consecutiveTtsFailures = 0;

export function isAmyVoiceOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
}

export function isTtsApiCircuitOpen(): boolean {
  if (Date.now() >= ttsApiCircuitUntil) return false;
  return true;
}

export function recordTtsApiFailure(): void {
  consecutiveTtsFailures += 1;
  ttsApiCircuitUntil = Date.now() + getAdaptiveApiCircuitMs();
}

export function recordTtsApiSuccess(): void {
  consecutiveTtsFailures = 0;
  ttsApiCircuitUntil = 0;
}

/** Fresh user speak — do not inherit a prior API failure window. */
export function resetTtsApiCircuit(): void {
  consecutiveTtsFailures = 0;
  ttsApiCircuitUntil = 0;
}

export function shouldSkipLiveTtsApi(): boolean {
  return isAmyVoiceOffline() || isTtsApiCircuitOpen();
}

export function getTtsApiCircuitRemainingMs(): number {
  return Math.max(0, ttsApiCircuitUntil - Date.now());
}
