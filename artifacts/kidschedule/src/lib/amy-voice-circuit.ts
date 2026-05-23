/** TTS API circuit breaker — adaptive duration from recent failure rate. */

import { getAdaptiveApiCircuitMs } from "@/lib/amy-voice-adaptive";

let ttsApiCircuitUntil = 0;
let consecutiveTtsFailures = 0;

/** Failures needed before skipping live TTS (avoids one deploy blip killing audio). */
const TTS_CIRCUIT_FAILURE_THRESHOLD = 3;

const TRANSIENT_ERROR_RE =
  /502|503|504|fetch failed|failed to fetch|network|econnrefused|enotfound|timeout|api_circuit|generate_failed_5/i;

export function isTransientTtsApiError(error?: string | null): boolean {
  const msg = (error ?? "").trim();
  if (!msg) return false;
  return TRANSIENT_ERROR_RE.test(msg);
}

export function isAmyVoiceOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
}

export function isTtsApiCircuitOpen(): boolean {
  if (Date.now() >= ttsApiCircuitUntil) return false;
  return true;
}

export function recordTtsApiFailure(error?: string): void {
  if (isTransientTtsApiError(error)) {
    consecutiveTtsFailures += 1;
  } else {
    consecutiveTtsFailures += 2;
  }
  if (consecutiveTtsFailures < TTS_CIRCUIT_FAILURE_THRESHOLD) return;
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
