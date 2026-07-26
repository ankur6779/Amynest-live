/**
 * Cert fixture startup forensics — enabled via ?startupTrace=1 or localStorage amynest_startup_trace=1
 */

export type CertStartupCheckpoint =
  | "browserLaunch"
  | "pageGoto"
  | "moduleEval"
  | "cssImported"
  | "i18nImported"
  | "reactRootCreated"
  | "strictModeWrapped"
  | "certAppRender"
  | "mazeHostMounted"
  | "mazeGameMounted"
  | "gameShellMounted"
  | "mazeGridFirstRender"
  | "roundInitialized"
  | "firstInteraction"
  | "firstMoveAccepted";

export type CertStartupEntry = {
  name: CertStartupCheckpoint | string;
  t: number;
  msSinceOrigin: number;
  durationMs?: number;
  detail?: string;
  stack?: string;
};

export type CertStartupState = {
  origin: number;
  lastCheckpoint: CertStartupEntry | null;
  checkpoints: CertStartupEntry[];
  lastError: { message: string; stack?: string; t: number } | null;
};

const MAX = 200;

export function isCertStartupTraceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage?.getItem("amynest_startup_trace") === "1") return true;
  } catch {
    /* ignore */
  }
  return new URLSearchParams(window.location.search).get("startupTrace") === "1";
}

function state(): CertStartupState {
  const w = window as Window & { __certStartup?: CertStartupState };
  if (!w.__certStartup) {
    w.__certStartup = {
      origin: performance.timeOrigin,
      lastCheckpoint: null,
      checkpoints: [],
      lastError: null,
    };
  }
  return w.__certStartup;
}

function captureStack(): string | undefined {
  try {
    return new Error("cert-startup-trace").stack;
  } catch {
    return undefined;
  }
}

export function certStartupMark(
  name: CertStartupCheckpoint | string,
  detail?: string,
  durationMs?: number,
): void {
  if (!isCertStartupTraceEnabled()) return;
  const s = state();
  const t = Date.now();
  const entry: CertStartupEntry = {
    name,
    t,
    msSinceOrigin: Math.round((t - s.origin) * 100) / 100,
    durationMs,
    detail,
    stack: captureStack(),
  };
  if (s.checkpoints.length >= MAX) s.checkpoints.shift();
  s.checkpoints.push(entry);
  s.lastCheckpoint = entry;
}

export function certStartupInstallErrorHooks(): void {
  if (!isCertStartupTraceEnabled() || typeof window === "undefined") return;
  window.addEventListener("error", (e) => {
    const s = state();
    s.lastError = {
      message: e.message,
      stack: e.error?.stack,
      t: Date.now(),
    };
  });
  window.addEventListener("unhandledrejection", (e) => {
    const s = state();
    const reason = e.reason as Error | undefined;
    s.lastError = {
      message: reason?.message ?? String(e.reason),
      stack: reason?.stack,
      t: Date.now(),
    };
  });
}

export function certStartupExport(): CertStartupState {
  const s = state();
  return {
    ...s,
    checkpoints: [...s.checkpoints],
  };
}

export function certStartupFirstMissing(
  expected: CertStartupCheckpoint[],
): CertStartupCheckpoint | null {
  const reached = new Set(state().checkpoints.map((c) => c.name));
  for (const e of expected) {
    if (!reached.has(e)) return e;
  }
  return null;
}

declare global {
  interface Window {
    __certStartup?: CertStartupState;
    __certStartupMark?: typeof certStartupMark;
    __certStartupExport?: typeof certStartupExport;
  }
}

if (typeof window !== "undefined" && isCertStartupTraceEnabled()) {
  window.__certStartupMark = certStartupMark;
  window.__certStartupExport = certStartupExport;
  certStartupInstallErrorHooks();
}
