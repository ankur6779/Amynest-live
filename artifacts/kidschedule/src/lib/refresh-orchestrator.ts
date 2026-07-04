import { forceClearAllCaches } from "@/lib/force-clear-caches";

/** Set before navigation — next load skips cache refresh to prevent loops. */
export const REFRESH_COMPLETE_KEY = "amynest:refresh-complete";
/** Set while a refresh cycle is running (survives until reload or timeout). */
export const REFRESH_IN_PROGRESS_KEY = "amynest:refresh-in-progress";

export const REFRESH_TIMEOUT_MS = 10_000;

export type RefreshOutcome =
  | "skipped_complete"
  | "skipped_in_flight"
  | "scheduled"
  | "timeout"
  | "failed";

export type RefreshOptions = {
  reason?: string;
  /** When true (default), skip if a refresh already completed this session. */
  honorCompleteFlag?: boolean;
  onTimeout?: () => void;
};

let moduleReloadInFlight = false;

function refreshLog(message: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.info(`[Refresh] ${message}`, detail);
    return;
  }
  console.info(`[Refresh] ${message}`);
}

export function hasCompletedRefreshCycle(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(REFRESH_COMPLETE_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearRefreshCompleteFlag(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(REFRESH_COMPLETE_KEY);
  } catch {
    /* sessionStorage may be blocked */
  }
}

export function markRefreshCompleteBeforeReload(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(REFRESH_COMPLETE_KEY, "1");
    sessionStorage.removeItem(REFRESH_IN_PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

function clearRefreshInProgressFlag(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(REFRESH_IN_PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

function markRefreshInProgress(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(REFRESH_IN_PROGRESS_KEY, "1");
  } catch {
    /* ignore */
  }
}

function isRefreshInProgress(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(REFRESH_IN_PROGRESS_KEY) === "1";
  } catch {
    return false;
  }
}

function navigateToCleanAppUrl(): void {
  const origin = window.location.origin;
  const base = (import.meta.env.BASE_URL as string).replace(/\/$/, "") || "";
  window.location.href = `${origin}${base}/`;
}

/** @internal Vitest-only */
export function resetRefreshOrchestratorForTests(): void {
  moduleReloadInFlight = false;
}

/**
 * One-shot cache purge + hard navigation. Uses sessionStorage guards so refresh
 * cannot run repeatedly across reloads (prevents infinite SW / deploy loops).
 */
export async function runRefreshCycle(
  options: RefreshOptions = {},
): Promise<RefreshOutcome> {
  const { reason = "unknown", honorCompleteFlag = true, onTimeout } = options;

  if (typeof window === "undefined") return "failed";

  if (honorCompleteFlag && hasCompletedRefreshCycle()) {
    refreshLog("Skipped — refresh already completed this session", { reason });
    clearRefreshCompleteFlag();
    return "skipped_complete";
  }

  if (moduleReloadInFlight || isRefreshInProgress()) {
    refreshLog("Skipped — refresh already in flight", { reason });
    return "skipped_in_flight";
  }

  moduleReloadInFlight = true;
  markRefreshInProgress();
  refreshLog("Started", { reason });

  let settled = false;
  let timeoutId: number | null = null;

  const finishTimeout = (): RefreshOutcome => {
    if (settled) return "timeout";
    settled = true;
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    moduleReloadInFlight = false;
    refreshLog("Timeout", { reason });
    markRefreshCompleteBeforeReload();
    onTimeout?.();
    return "timeout";
  };

  const refreshWork = async (): Promise<RefreshOutcome> => {
    refreshLog("Clearing cache", { reason });
    await forceClearAllCaches();

    refreshLog("Updating SW", { reason });
    markRefreshCompleteBeforeReload();

    refreshLog("Reloading", { reason });
    navigateToCleanAppUrl();
    refreshLog("Finished", { reason });
    return "scheduled";
  };

  try {
    const outcome = await Promise.race([
      refreshWork().then((result) => {
        if (settled) return result;
        settled = true;
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        return result;
      }),
      new Promise<RefreshOutcome>((resolve) => {
        timeoutId = window.setTimeout(() => resolve(finishTimeout()), REFRESH_TIMEOUT_MS);
      }),
    ]);
    return outcome;
  } catch (err) {
    if (!settled) {
      settled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      moduleReloadInFlight = false;
      clearRefreshInProgressFlag();
      refreshLog("Failed", {
        reason,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return "failed";
  }
}
