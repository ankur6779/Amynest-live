/**
 * AmyNest startup orchestrator — React must mount before any async boot work.
 *
 * Phase 1: react_render      (sync createRoot — never awaited by later phases)
 * Phase 2: app_shell_ready   (App mounted)
 * Phase 3: background_init   (cache, PWA version, native shell, API base)
 * Phase 4: optional_services (push, audio telemetry, …)
 */

import { migrateLegacyDeployVersionStorage } from "@/lib/deploy-version";
import { queueClientLog } from "@/lib/client-logs";
import { patchBootDiagnostics } from "@/lib/boot-store";
import { postStartupBeacon } from "@/lib/startup-telemetry-beacon";

export type StartupPhase =
  | "idle"
  | "initializing"
  | "react_render"
  | "react_rendered"
  | "app_shell_ready"
  | "background_init"
  | "background_complete"
  | "optional_services"
  | "app_core_ready"
  | "ready"
  | "deploy_reload_scheduled";

export type StartupState = {
  phase: StartupPhase;
  reactRendered: boolean;
  appCoreReady: boolean;
  appShellReady: boolean;
  cacheSyncComplete: boolean;
  cacheSyncError: string | null;
  versionCheckComplete: boolean;
  versionMismatch: boolean;
  deployReloadScheduled: boolean;
  serviceWorkerReady: boolean;
  backgroundInitComplete: boolean;
  optionalServicesComplete: boolean;
  lastProgressAt: number;
  startedAt: number;
  appVersion: string;
  previousVersion: string | null;
  platform: string;
  browser: string;
  route: string;
  timeline: Array<{ phase: string; at: number; ms: number }>;
  activeWaits: Array<{ waiter: string; waitingFor: string; since: number }>;
  lastDeadlock: { chain: string[]; at: number } | null;
};

export type StartupTelemetryEvent =
  | "startup_phase_entered"
  | "startup_phase_completed"
  | "startup_timeout"
  | "startup_deadlock_detected"
  | "startup_recovery_used"
  | "boot_timeout";

const STARTUP_STORAGE_KEY = "__amynest_startup_v1";
const DEFAULT_TIMEOUT_MS = 8_000;
const APPCORE_WAIT_TIMEOUT_MS = 25_000;

const APP_VERSION =
  (typeof document !== "undefined"
    ? document.querySelector('meta[name="amynest-deploy"]')?.getAttribute("content")
    : null) ?? "unknown";

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "web";
}

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua)) return "edge";
  if (/chrome/i.test(ua)) return "chrome";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "safari";
  if (/firefox/i.test(ua)) return "firefox";
  return "other";
}

function initialState(): StartupState {
  const now = Date.now();
  return {
    phase: "idle",
    reactRendered: false,
    appCoreReady: false,
    appShellReady: false,
    cacheSyncComplete: false,
    cacheSyncError: null,
    versionCheckComplete: false,
    versionMismatch: false,
    deployReloadScheduled: false,
    serviceWorkerReady: false,
    backgroundInitComplete: false,
    optionalServicesComplete: false,
    lastProgressAt: now,
    startedAt: now,
    appVersion: APP_VERSION,
    previousVersion: null,
    platform: detectPlatform(),
    browser: detectBrowser(),
    route: typeof window !== "undefined" ? window.location.pathname : "",
    timeline: [],
    activeWaits: [],
    lastDeadlock: null,
  };
}

let state = initialState();
const waitEdges: Array<{ from: string; to: string }> = [];

function touchProgress(): void {
  state = { ...state, lastProgressAt: Date.now() };
  publishStartupState();
}

function persistStartupState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STARTUP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function publishStartupState(): void {
  if (typeof window === "undefined") return;
  const win = window as Window & { __amynestStartupState?: StartupState };
  win.__amynestStartupState = { ...state };
  persistStartupState();
}

export function getStartupState(): StartupState {
  return { ...state };
}

export function resetStartupStateForTests(): void {
  state = initialState();
  waitEdges.length = 0;
  publishStartupState();
}

/** Call once before Phase 1 (sync). */
export function initStartupOrchestrator(): void {
  migrateLegacyDeployVersionStorage();
  state = initialState();
  state = { ...state, phase: "initializing" };
  touchProgress();
  try {
    const prev = sessionStorage.getItem("amynest:deploy-version");
    state = { ...state, previousVersion: prev };
  } catch {
    /* ignore */
  }
  enterStartupPhase("react_render");
}

function appendTimeline(phase: string): void {
  const at = Date.now();
  const ms = at - state.startedAt;
  state = {
    ...state,
    timeline: [...state.timeline, { phase, at, ms }].slice(-40),
  };
}

export function enterStartupPhase(phase: StartupPhase): void {
  state = { ...state, phase };
  touchProgress();
  appendTimeline(`enter:${phase}`);
  trackStartupEvent("startup_phase_entered", { phase });
  try {
    window.__amynestMark?.(`startup-${phase}`);
  } catch {
    /* ignore */
  }
}

export function completeStartupPhase(phase: StartupPhase): void {
  appendTimeline(`complete:${phase}`);
  trackStartupEvent("startup_phase_completed", { phase });
  touchProgress();
}

export function patchStartupState(patch: Partial<StartupState>): void {
  state = { ...state, ...patch };
  touchProgress();
}

/** Register a wait edge; detect bootstrap ↔ AppCore circular waits. */
export function registerStartupWait(waiter: string, waitingFor: string): void {
  waitEdges.push({ from: waiter, to: waitingFor });
  state = {
    ...state,
    activeWaits: [
      ...state.activeWaits,
      { waiter, waitingFor, since: Date.now() },
    ].slice(-12),
  };
  publishStartupState();

  const chain = findWaitCycle(waiter, waitingFor);
  if (chain.length > 0) {
    state = {
      ...state,
      lastDeadlock: { chain, at: Date.now() },
    };
    publishStartupState();
    trackStartupEvent("startup_deadlock_detected", {
      waiter,
      waitingFor,
      chain: chain.join(" → "),
    });
    console.error("[amynest:startup] Deadlock detected:", chain.join(" → "));
  }
}

export function clearStartupWait(waiter: string): void {
  waitEdges.splice(
    0,
    waitEdges.length,
    ...waitEdges.filter((e) => e.from !== waiter),
  );
  state = {
    ...state,
    activeWaits: state.activeWaits.filter((w) => w.waiter !== waiter),
  };
  publishStartupState();
}

function findWaitCycle(waiter: string, waitingFor: string): string[] {
  const forbidden = new Set([
    "bootstrap:pre_render",
    "phase1:react_mount",
  ]);
  if (forbidden.has(waiter) && waitingFor === "app_core") {
    return [waiter, waitingFor, "bootstrap_blocked"];
  }

  const adj = new Map<string, string[]>();
  for (const { from, to } of waitEdges) {
    const list = adj.get(from) ?? [];
    list.push(to);
    adj.set(from, list);
  }

  const visited = new Set<string>();
  const stack: string[] = [waitingFor];
  while (stack.length) {
    const node = stack.pop()!;
    if (node === waiter) {
      return [waiter, waitingFor, node];
    }
    if (visited.has(node)) continue;
    visited.add(node);
    for (const next of adj.get(node) ?? []) {
      stack.push(next);
    }
  }
  return [];
}

export function trackStartupEvent(
  event: StartupTelemetryEvent,
  extra?: Record<string, string | number | boolean>,
): void {
  const meta = {
    event,
    phase: state.phase,
    app_version: state.appVersion,
    previous_version: state.previousVersion ?? "",
    platform: state.platform,
    browser: state.browser,
    react_rendered: state.reactRendered,
    app_core_ready: state.appCoreReady,
    ...extra,
  };

  postStartupBeacon({
    event,
    phase: state.phase,
    app_version: state.appVersion,
    previous_version: state.previousVersion ?? undefined,
    platform: state.platform,
    browser: state.browser,
    route: state.route,
    react_rendered: state.reactRendered,
    app_core_ready: state.appCoreReady,
    meta: extra,
  });

  queueClientLog({
    type: "info",
    message: event,
    context: "startup",
    route: state.route,
    meta,
  });
}

export async function waitWithTimeout<T>(options: {
  label: string;
  waitingFor: string;
  timeoutMs?: number;
  fn: () => Promise<T>;
  fallback: T;
  onTimeout?: () => void;
}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  registerStartupWait(options.label, options.waitingFor);
  const started = Date.now();

  try {
    const result = await Promise.race([
      options.fn(),
      new Promise<T>((resolve) => {
        setTimeout(() => {
          trackStartupEvent("startup_timeout", {
            label: options.label,
            waiting_for: options.waitingFor,
            timeout_ms: timeoutMs,
          });
          options.onTimeout?.();
          resolve(options.fallback);
        }, timeoutMs);
      }),
    ]);
    return result;
  } finally {
    clearStartupWait(options.label);
    patchBootDiagnostics({
      lastError: null,
    });
    void started;
  }
}

/** Phase 1 complete — React commit signalled from main.tsx. */
export function markReactRendered(): void {
  state = {
    ...state,
    reactRendered: true,
    phase: "react_rendered",
  };
  touchProgress();
  completeStartupPhase("react_render");
  enterStartupPhase("react_rendered");
  patchBootDiagnostics({ route: typeof window !== "undefined" ? window.location.pathname : "" });
}

/** Phase 2 — App.tsx mounted. */
export function markAppShellReady(): void {
  state = { ...state, appShellReady: true, phase: "app_shell_ready" };
  touchProgress();
  completeStartupPhase("app_shell_ready");
  enterStartupPhase("app_shell_ready");
}

/** AppCore lazy chunk mounted (splash gate only — never blocks Phase 1). */
export function markAppCoreReady(): void {
  const win = window as Window & { __amynestAppCoreReady?: boolean };
  win.__amynestAppCoreReady = true;
  state = { ...state, appCoreReady: true };
  touchProgress();
  completeStartupPhase("app_core_ready");
}

/**
 * Optional: wait for AppCore with timeout. Safe only AFTER react_rendered.
 * Never call from pre-render bootstrap paths.
 */
export async function waitForAppCoreReady(options?: {
  label?: string;
  timeoutMs?: number;
}): Promise<boolean> {
  if (state.reactRendered !== true) {
    const waiter = options?.label ?? "wait_for_app_core";
    registerStartupWait(waiter, "app_core");
    state = {
      ...state,
      lastDeadlock: {
        chain: [waiter, "app_core", "react_not_rendered"],
        at: Date.now(),
      },
    };
    publishStartupState();
    trackStartupEvent("startup_deadlock_detected", {
      reason: "wait_before_react_render",
    });
    return false;
  }

  const win = window as Window & { __amynestAppCoreReady?: boolean };
  if (win.__amynestAppCoreReady) return true;

  return waitWithTimeout({
    label: options?.label ?? "wait_for_app_core",
    waitingFor: "app_core",
    timeoutMs: options?.timeoutMs ?? APPCORE_WAIT_TIMEOUT_MS,
    fn: () =>
      new Promise<boolean>((resolve) => {
        const started = Date.now();
        const tick = () => {
          if (win.__amynestAppCoreReady) {
            clearInterval(id);
            resolve(true);
            return;
          }
          if (Date.now() - started >= (options?.timeoutMs ?? APPCORE_WAIT_TIMEOUT_MS)) {
            clearInterval(id);
            resolve(false);
          }
        };
        const id = setInterval(tick, 100);
        tick();
      }),
    fallback: false,
  });
}

export function markBackgroundInitComplete(): void {
  state = {
    ...state,
    backgroundInitComplete: true,
    phase: "background_complete",
  };
  touchProgress();
  completeStartupPhase("background_init");
}

export function markOptionalServicesComplete(): void {
  state = {
    ...state,
    optionalServicesComplete: true,
    phase: "ready",
  };
  touchProgress();
  completeStartupPhase("optional_services");
  enterStartupPhase("ready");
}

export function markDeployReloadScheduled(from: string, to: string): void {
  state = {
    ...state,
    deployReloadScheduled: true,
    versionMismatch: true,
    phase: "deploy_reload_scheduled",
  };
  touchProgress();
  trackStartupEvent("startup_recovery_used", {
    reason: "deploy_version_mismatch",
    from,
    to,
  });
}

export function markCacheSyncComplete(error?: string | null): void {
  state = {
    ...state,
    cacheSyncComplete: true,
    cacheSyncError: error ?? null,
    versionCheckComplete: true,
  };
  touchProgress();
}

export function markServiceWorkerReady(): void {
  state = { ...state, serviceWorkerReady: true };
  touchProgress();
}

/** Infer boot-timeout root cause for crash overlay / diag. */
export function inferBootTimeoutRootCause(): {
  rootCause: string;
  recoveryPath: string;
  phases: string[];
} {
  const phases =
    typeof window !== "undefined" && typeof window.__amynestDiag === "function"
      ? ((window.__amynestDiag() as { phases?: string[] } | null)?.phases ?? [])
      : [];

  if (state.reactRendered) {
    return {
      rootCause: "watchdog_false_positive",
      recoveryPath: "ignore",
      phases,
    };
  }
  if (phases.indexOf("bundle-loaded") === -1) {
    return {
      rootCause:
        phases.indexOf("bundle-loading") !== -1
          ? "main_bundle_still_loading"
          : "main_bundle_not_executed",
      recoveryPath: "cache_clear_reload",
      phases,
    };
  }
  if (state.deployReloadScheduled) {
    return {
      rootCause: "deploy_reload_in_progress",
      recoveryPath: "wait_reload",
      phases,
    };
  }
  if (state.lastDeadlock) {
    return {
      rootCause: `startup_deadlock:${state.lastDeadlock.chain.join(">")}`,
      recoveryPath: "cache_clear_reload",
      phases,
    };
  }
  if (state.activeWaits.length > 0) {
    const w = state.activeWaits[state.activeWaits.length - 1];
    return {
      rootCause: `blocked_on:${w.waiter}->${w.waitingFor}`,
      recoveryPath: "cache_clear_reload",
      phases,
    };
  }
  return {
    rootCause: "react_mount_never_committed",
    recoveryPath: "cache_clear_reload",
    phases,
  };
}

declare global {
  interface Window {
    __amynestStartupState?: StartupState;
    __amynestBootWatchdogExtended?: boolean;
    __amynestInferBootTimeoutRootCause?: () => ReturnType<typeof inferBootTimeoutRootCause>;
  }
}

if (typeof window !== "undefined") {
  const win = window as Window;
  win.__amynestInferBootTimeoutRootCause = inferBootTimeoutRootCause;
}
