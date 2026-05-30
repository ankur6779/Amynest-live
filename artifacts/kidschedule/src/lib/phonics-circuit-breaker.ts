/**
 * Phonics playback circuit breaker — opens after repeated failures to stop
 * prefetch/warmup storms and force direct streaming playback.
 */

import { recordPhonicsTelemetry } from "@/lib/phonics-telemetry";

const CONSECUTIVE_FAILURE_THRESHOLD = 3;

let consecutiveFailures = 0;
let circuitOpen = false;

export function isPhonicsCircuitOpen(): boolean {
  return circuitOpen;
}

export function shouldPhonicsPrefetch(): boolean {
  return !circuitOpen;
}

export function shouldPhonicsUseCache(): boolean {
  return !circuitOpen;
}

/** Count only real playback failures — not cancel/supersede. */
export function recordPhonicsCircuitOutcome(
  ok: boolean,
  reason?: string,
): void {
  if (ok) {
    consecutiveFailures = 0;
    if (circuitOpen) {
      circuitOpen = false;
    }
    return;
  }

  const benign =
    reason === "phonics_cancelled" ||
    reason === "phonics_superseded" ||
    reason === "phonics_debounce_skip";
  if (benign) return;

  consecutiveFailures += 1;
  if (!circuitOpen && consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
    circuitOpen = true;
    recordPhonicsTelemetry("phonics_circuit_open", { consecutiveFailures });
  }
}

export function getPhonicsCircuitState(): {
  open: boolean;
  consecutiveFailures: number;
} {
  return { open: circuitOpen, consecutiveFailures };
}

/** Test-only reset */
export function resetPhonicsCircuitBreakerForTests(): void {
  consecutiveFailures = 0;
  circuitOpen = false;
}
