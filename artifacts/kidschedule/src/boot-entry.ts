/**
 * App entry loaded from index.html AFTER inline cache-recovery runs.
 * Must stay a separate module (not inlined into <head>) so recovery can purge
 * stale /assets/*.js HTTP cache before the React bundle graph loads.
 */
declare global {
  interface Window {
    __amynestNeedsCacheRecovery?: boolean;
    __amynestMark?: (phase: string) => void;
    __amynestTryAutoRecovery?: (kind: string, msg: string) => boolean;
    __amynestShowCrashOverlay?: (payload: unknown) => void;
    __amynestQuickReload?: () => void;
    __amynestDiagOnly?: boolean;
  }
}

const BOOT_KEY = "__amynest_boot_v1";

function recordBootReject(msg: string): void {
  try {
    const r = JSON.parse(localStorage.getItem(BOOT_KEY) || "null") as {
      ts?: number;
      lastReject?: { msg: string; t: number };
    } | null;
    if (!r) return;
    r.lastReject = { msg, t: Date.now() - (r.ts ?? Date.now()) };
    localStorage.setItem(BOOT_KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

function showBootFailure(msg: string): void {
  if (window.__amynestTryAutoRecovery?.("boot-import", msg)) return;
  window.__amynestShowCrashOverlay?.({
    kind: "boot-import",
    message: msg,
  });
}

if (/[?&]diag=1/.test(location.search || "")) {
  window.__amynestDiagOnly = true;
  window.__amynestMark?.("diag-only");
} else if (window.__amynestNeedsCacheRecovery) {
  /* cache-recovery script above is reloading — do not import the bundle */
} else {
  window.__amynestMark?.("bundle-loading");
  import("./main.tsx").catch((err: unknown) => {
    const msg = String(
      (err instanceof Error ? err.message : err) || "Main module failed to load",
    );
    recordBootReject(msg);
    if (window.__amynestQuickReload) {
      window.__amynestQuickReload();
      return;
    }
    showBootFailure(msg);
  });
}

export {};
