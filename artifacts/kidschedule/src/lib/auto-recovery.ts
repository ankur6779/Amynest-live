import { markCacheRecoveryPending } from "@/lib/boot-recovery";
import { handleRecoveryReload } from "@/lib/clear-cache-reload";
import {
  canAttemptAutoRecovery as canAttemptGlobalRecovery,
  recordGlobalRecoveryAttempt,
} from "@/lib/recovery-limit";
import { isBenignRuntimeError } from "@/lib/runtime-crash-policy";

const RECOVERY_TS_KEY = "amynest:auto-recovery:ts";
const RECOVERY_COUNT_KEY = "amynest:auto-recovery:count";

/** Rolling window — prevents infinite reload loops. */
const RECOVERY_WINDOW_MS = 60_000;
const MAX_RECOVERIES_IN_WINDOW = 2;

let reloadInFlight = false;

/** @internal Vitest-only — simulates a fresh page load between recovery attempts. */
export function resetAutoRecoveryStateForTests(): void {
  reloadInFlight = false;
}

/** Whether this error should trigger a cache-clear + reload (not benign noise). */
export function shouldAttemptAutoRecovery(err?: unknown): boolean {
  if (typeof window === "undefined") return false;
  if (err != null && isBenignRuntimeError(err)) return false;
  return true;
}

/** Clear recovery counters — used when the user explicitly taps Reload. */
export function resetAutoRecoveryCounters(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(RECOVERY_TS_KEY);
    sessionStorage.removeItem(RECOVERY_COUNT_KEY);
  } catch {
    /* sessionStorage may be blocked */
  }
}

/**
 * Rate-limited cache purge + hard reload. Returns true when a reload was
 * started (or already in flight). Returns false when the limit is reached
 * so the UI can fall back to a manual Reload button.
 */
export function tryAutoRecovery(reason?: string): boolean {
  if (typeof window === "undefined") return false;
  if (!canAttemptGlobalRecovery()) return false;
  if (reloadInFlight) return true;

  const onboardingStep =
    (window as Window & { __amynestOnboardingStep?: string }).__amynestOnboardingStep ??
    null;
  console.warn("[amynest:auto-recovery] triggering cache reload", {
    reason: reason ?? "unknown",
    route: window.location.pathname,
    onboardingStep,
  });

  const now = Date.now();
  let lastTs = 0;
  let count = 0;
  try {
    lastTs = Number(sessionStorage.getItem(RECOVERY_TS_KEY) ?? "0");
    count = Number(sessionStorage.getItem(RECOVERY_COUNT_KEY) ?? "0");
  } catch {
    /* sessionStorage may be blocked */
  }

  if (lastTs && now - lastTs < RECOVERY_WINDOW_MS) {
    if (count >= MAX_RECOVERIES_IN_WINDOW) return false;
    count += 1;
  } else {
    count = 1;
  }

  try {
    sessionStorage.setItem(RECOVERY_TS_KEY, String(now));
    sessionStorage.setItem(RECOVERY_COUNT_KEY, String(count));
  } catch {
    /* ignore */
  }

  recordGlobalRecoveryAttempt();
  reloadInFlight = true;
  markCacheRecoveryPending();
  void handleRecoveryReload({ reason: reason ?? "auto_recovery" }).then((outcome) => {
    if (outcome !== "scheduled" && outcome !== "skipped_in_flight") {
      reloadInFlight = false;
    }
  });
  return true;
}
