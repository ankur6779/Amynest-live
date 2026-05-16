import { forceClearAllCaches } from "@/lib/force-clear-caches";

const RECOVERY_FLAG_KEY = "amynest:cache-recovery-pending";

type AmyNestRecoveryWindow = Window & {
  __amynestNeedsCacheRecovery?: boolean;
};

/** True when index.html boot script or the error UI requested a cache purge. */
export function shouldRunBootCacheRecovery(): boolean {
  if (typeof window === "undefined") return false;

  const win = window as AmyNestRecoveryWindow;
  if (win.__amynestNeedsCacheRecovery === true) return true;

  try {
    if (sessionStorage.getItem(RECOVERY_FLAG_KEY) === "1") return true;
  } catch {
    /* ignore */
  }

  return false;
}

/** Mark that the next load should purge caches (e.g. user saw the error screen). */
export function markCacheRecoveryPending(): void {
  try {
    sessionStorage.setItem(RECOVERY_FLAG_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearCacheRecoveryPending(): void {
  try {
    sessionStorage.removeItem(RECOVERY_FLAG_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * One-time cache + SW reset before React boots. Prevents a stale index.html
 * or broken SW from blocking the home page.
 */
export async function runBootCacheRecoveryIfNeeded(): Promise<void> {
  if (!shouldRunBootCacheRecovery()) return;
  await forceClearAllCaches();
  clearCacheRecoveryPending();
  const win = window as AmyNestRecoveryWindow;
  win.__amynestNeedsCacheRecovery = false;
}
