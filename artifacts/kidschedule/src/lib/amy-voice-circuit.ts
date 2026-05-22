/** TTS API circuit breaker — skip live API for 30s after failures. */

const TTS_API_CIRCUIT_MS = 30_000;
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
  ttsApiCircuitUntil = Date.now() + TTS_API_CIRCUIT_MS;
}

export function recordTtsApiSuccess(): void {
  consecutiveTtsFailures = 0;
  ttsApiCircuitUntil = 0;
}

export function shouldSkipLiveTtsApi(): boolean {
  return isAmyVoiceOffline() || isTtsApiCircuitOpen();
}

export function getTtsApiCircuitRemainingMs(): number {
  return Math.max(0, ttsApiCircuitUntil - Date.now());
}
