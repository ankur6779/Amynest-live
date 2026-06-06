/**
 * Shared automatic recovery budget — prevents infinite Crash → Recover → Retry loops.
 */

/** Hard cap on automatic recovery actions per rolling window. */
export const MAX_RECOVERY_ATTEMPTS = 3;

const GLOBAL_KEY = "amynest:global-recovery-attempts";
const WINDOW_MS = 120_000;

type CountEntry = { ts: number; count: number };

function readCount(): number {
  if (typeof sessionStorage === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(GLOBAL_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as CountEntry;
    if (Date.now() - parsed.ts > WINDOW_MS) return 0;
    return parsed.count;
  } catch {
    return 0;
  }
}

/** Total automatic recovery actions taken in the current window. */
export function getGlobalRecoveryAttemptCount(): number {
  return readCount();
}

/** Whether automatic recovery must stop and show manual UI only. */
export function hasExceededRecoveryLimit(): boolean {
  return getGlobalRecoveryAttemptCount() >= MAX_RECOVERY_ATTEMPTS;
}

/** Record one automatic recovery action (remount, navigate, reload). */
export function recordGlobalRecoveryAttempt(): number {
  if (typeof sessionStorage === "undefined") return 0;
  const next = readCount() + 1;
  try {
    sessionStorage.setItem(GLOBAL_KEY, JSON.stringify({ ts: Date.now(), count: next }));
  } catch {
    /* ignore */
  }
  return next;
}

/** Whether another automatic recovery step is allowed. */
export function canAttemptAutoRecovery(): boolean {
  return !hasExceededRecoveryLimit();
}

export function resetGlobalRecoveryCounters(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(GLOBAL_KEY);
  } catch {
    /* ignore */
  }
}
