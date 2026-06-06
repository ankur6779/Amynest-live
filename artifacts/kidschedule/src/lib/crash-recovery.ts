/**
 * Tiered automatic crash recovery:
 * A) remount failed subtree
 * B) navigate to safe route
 * C) hard reload (rate-limited via auto-recovery)
 */

import {
  resetAutoRecoveryCounters,
  shouldAttemptAutoRecovery,
  tryAutoRecovery,
} from "@/lib/auto-recovery";
import { handleRecoveryReload } from "@/lib/clear-cache-reload";
import { markCacheRecoveryPending } from "@/lib/boot-recovery";

export type RecoveryStage = "remount" | "navigate" | "reload" | "manual";

const REMOUNT_KEY = "amynest:crash-remount-attempts";
const NAV_KEY = "amynest:crash-nav-attempts";
const WINDOW_MS = 120_000;

function readCount(key: string): number {
  if (typeof sessionStorage === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { ts: number; count: number };
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

export function resetCrashRecoveryCounters(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(REMOUNT_KEY);
    sessionStorage.removeItem(NAV_KEY);
  } catch {
    /* ignore */
  }
  resetAutoRecoveryCounters();
}

export function planCrashRecovery(component?: string): RecoveryStage {
  if (readCount(REMOUNT_KEY) < 2) return "remount";
  if (readCount(NAV_KEY) < 1) return "navigate";
  if (shouldAttemptAutoRecovery(new Error(component ?? "crash"))) return "reload";
  return "manual";
}

export function recordRecoveryAttempt(stage: RecoveryStage): void {
  if (stage === "remount") bumpCount(REMOUNT_KEY);
  if (stage === "navigate") bumpCount(NAV_KEY);
}

export function navigateToSafeRoute(): void {
  if (typeof window === "undefined") return;
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const target = `${base}/dashboard`.replace(/\/{2,}/g, "/");
  if (window.location.pathname === target || window.location.pathname.endsWith("/dashboard")) {
    void executeHardReload();
    return;
  }
  window.location.assign(target);
}

export async function executeHardReload(): Promise<void> {
  markCacheRecoveryPending();
  await handleRecoveryReload();
}

export function tryAutoReload(reason: string): boolean {
  return tryAutoRecovery(reason);
}
