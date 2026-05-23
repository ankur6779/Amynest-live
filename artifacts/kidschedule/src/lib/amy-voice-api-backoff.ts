/**
 * Client-side exponential backoff when TTS API is unhealthy (1s → 2s → 4s → 8s).
 */

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 8_000;

let currentBackoffMs = INITIAL_BACKOFF_MS;
let backoffUntil = 0;

export function getApiBackoffRemainingMs(now = Date.now()): number {
  return Math.max(0, backoffUntil - now);
}

export function isApiBackoffActive(now = Date.now()): boolean {
  return now < backoffUntil;
}

export function recordApiBackoffFailure(now = Date.now()): void {
  backoffUntil = now + currentBackoffMs;
  currentBackoffMs = Math.min(currentBackoffMs * 2, MAX_BACKOFF_MS);
}

export function resetApiBackoff(): void {
  currentBackoffMs = INITIAL_BACKOFF_MS;
  backoffUntil = 0;
}

export async function waitForApiBackoff(): Promise<void> {
  const remaining = getApiBackoffRemainingMs();
  if (remaining <= 0) return;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, remaining);
  });
}

/** Test-only reset. */
export function resetApiBackoffForTests(): void {
  resetApiBackoff();
}
