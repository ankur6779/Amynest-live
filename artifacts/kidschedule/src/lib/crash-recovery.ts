/**
 * Tiered automatic crash recovery:
 * A) remount failed subtree
 * B) navigate to safe route
 * C) hard reload (rate-limited)
 *
 * All automatic recovery paths share a single session counter so
 * Crash → Recovery → Recovery fails → retry cannot continue indefinitely.
 */

import {
  resetAutoRecoveryCounters,
  shouldAttemptAutoRecovery,
  tryAutoRecovery,
} from "@/lib/auto-recovery";
import { handleRecoveryReload } from "@/lib/clear-cache-reload";
import { markCacheRecoveryPending } from "@/lib/boot-recovery";
import {
  canAttemptAutoRecovery,
  MAX_RECOVERY_ATTEMPTS,
  recordGlobalRecoveryAttempt,
  resetGlobalRecoveryCounters,
} from "@/lib/recovery-limit";

export type RecoveryStage = "remount" | "navigate" | "reload" | "manual";

export { MAX_RECOVERY_ATTEMPTS, canAttemptAutoRecovery };

const REMOUNT_KEY = "amynest:crash-remount-attempts";
const NAV_KEY = "amynest:crash-nav-attempts";
const WINDOW_MS = 120_000;

type CountEntry = { ts: number; count: number };

function readCount(key: string): number {
  if (typeof sessionStorage === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as CountEntry;
    if (Date.now() - parsed.ts > WINDOW_MS) return 0;
    return parsed.count;
  } catch {
    return 0;
  }
}

function bumpCount(key: string): number {
  if (typeof sessionStorage === "undefined") return 0;
  const next = readCount(key) + 1;
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), count: next }));
  } catch {
    /* ignore */
  }
  return next;
}

export { getGlobalRecoveryAttemptCount, hasExceededRecoveryLimit } from "@/lib/recovery-limit";

export function resetCrashRecoveryCounters(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(REMOUNT_KEY);
    sessionStorage.removeItem(NAV_KEY);
  } catch {
    /* ignore */
  }
  resetGlobalRecoveryCounters();
  resetAutoRecoveryCounters();
}

export function planCrashRecovery(component?: string): RecoveryStage {
  if (!canAttemptAutoRecovery()) return "manual";
  if (readCount(REMOUNT_KEY) < 2) return "remount";
  if (!canAttemptAutoRecovery()) return "manual";
  if (readCount(NAV_KEY) < 1) return "navigate";
  if (!canAttemptAutoRecovery()) return "manual";
  if (shouldAttemptAutoRecovery(new Error(component ?? "crash"))) return "reload";
  return "manual";
}

export function recordRecoveryAttempt(stage: RecoveryStage): void {
  if (stage === "manual") return;
  recordGlobalRecoveryAttempt();
  if (stage === "remount") bumpCount(REMOUNT_KEY);
  if (stage === "navigate") bumpCount(NAV_KEY);
}

function isOnSafeRoute(): boolean {
  if (typeof window === "undefined") return false;
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const target = `${base}/dashboard`.replace(/\/{2,}/g, "/");
  return (
    window.location.pathname === target ||
    window.location.pathname.endsWith("/dashboard")
  );
}

/**
 * Navigate to /dashboard. When already there, reload only if under the
 * recovery limit — prevents Dashboard-crash → reload → Dashboard-crash loops.
 * Returns false when no automatic action was taken (caller shows manual UI).
 */
export function navigateToSafeRoute(): boolean {
  if (typeof window === "undefined") return false;
  if (!canAttemptAutoRecovery()) return false;

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const target = `${base}/dashboard`.replace(/\/{2,}/g, "/");

  recordGlobalRecoveryAttempt();

  if (isOnSafeRoute()) {
    void executeHardReload();
    return true;
  }

  window.location.assign(target);
  return true;
}

export async function executeHardReload(): Promise<void> {
  if (!canAttemptAutoRecovery()) return;
  markCacheRecoveryPending();
  await handleRecoveryReload();
}

export function tryAutoReload(reason: string): boolean {
  if (!canAttemptAutoRecovery()) return false;
  return tryAutoRecovery(reason);
}
