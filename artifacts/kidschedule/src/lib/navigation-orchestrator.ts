/**
 * Single navigation authority for the AmyNest SPA (wouter + browser history).
 * Queues actions until the navigator is registered and bootstrap completes.
 */
import { logNavEvent, logNavError } from "@/lib/navigation-log";
import {
  isSameRoute,
  isTabRootRoute,
  markTabRootEntry,
  normalizeRoutePath,
  shouldReplaceNavigation,
  wouldCreateCycle,
} from "@/lib/navigation-stack";
import {
  getSanitizedPreviousRoute,
  recordSanitizedTransition,
} from "@/lib/route-history-manager";
import { smartBack } from "@/lib/safe-navigation";

export type NavTrigger =
  | "notification"
  | "deep-link"
  | "auth"
  | "user"
  | "auto-redirect"
  | "bootstrap"
  | "back"
  | "system";

export type OrchestratorNavigateOptions = {
  replace?: boolean;
  push?: boolean;
  source?: string;
  trigger?: NavTrigger;
};

type NavigateFn = (
  to: string,
  options?: { replace?: boolean; state?: unknown },
) => void;

type QueuedAction = {
  kind: "navigate" | "replace" | "reset" | "back";
  to?: string;
  from?: string;
  options?: OrchestratorNavigateOptions;
};

const DEFAULT_DEBOUNCE_MS = 300;
const navInFlight = new Map<string, number>();

let registeredNavigate: NavigateFn | null = null;
let currentRoute = "/";
let navigatorReady = false;
let bootstrapComplete = false;
const pendingQueue: QueuedAction[] = [];

let listenerRegistrationCounts: Record<string, number> = {};

export function registerNavigationListener(source: string): void {
  listenerRegistrationCounts[source] =
    (listenerRegistrationCounts[source] ?? 0) + 1;
  logNavEvent("nav-listener-register", {
    source,
    count: listenerRegistrationCounts[source],
  });
}

export function unregisterNavigationListener(source: string): void {
  const n = (listenerRegistrationCounts[source] ?? 0) - 1;
  listenerRegistrationCounts[source] = Math.max(0, n);
  logNavEvent("nav-listener-unregister", {
    source,
    count: listenerRegistrationCounts[source],
  });
}

export function getNavigationListenerCounts(): Readonly<Record<string, number>> {
  return { ...listenerRegistrationCounts };
}

export function registerNavigationOrchestrator(
  navigate: NavigateFn,
  location: string,
): void {
  registeredNavigate = navigate;
  currentRoute = normalizeRoutePath(location);
  navigatorReady = true;
  logNavEvent("nav-orchestrator-ready", { route: currentRoute });
  flushNavigationQueue();
}

export function unregisterNavigationOrchestrator(): void {
  registeredNavigate = null;
  navigatorReady = false;
}

export function syncOrchestratorLocation(location: string): void {
  currentRoute = normalizeRoutePath(location);
}

export function setNavigationBootstrapComplete(complete = true): void {
  bootstrapComplete = complete;
  logNavEvent("nav-bootstrap-complete", { complete });
  if (complete) flushNavigationQueue();
}

export function isNavigationBootstrapComplete(): boolean {
  return bootstrapComplete;
}

function shouldAllowNav(
  routeKey: string,
  debounceMs = DEFAULT_DEBOUNCE_MS,
): boolean {
  if (typeof window === "undefined") return true;
  const now = Date.now();
  const last = navInFlight.get(routeKey) ?? 0;
  if (now - last < debounceMs) return false;
  navInFlight.set(routeKey, now);
  return true;
}

function flushNavigationQueue(): void {
  if (!navigatorReady || !bootstrapComplete || !registeredNavigate) return;
  while (pendingQueue.length > 0) {
    const action = pendingQueue.shift()!;
    switch (action.kind) {
      case "navigate":
        if (action.to != null && action.from != null) {
          executeNavigate(action.from, action.to, action.options);
        }
        break;
      case "replace":
        if (action.to != null && action.from != null) {
          executeNavigate(action.from, action.to, {
            ...action.options,
            replace: true,
          });
        }
        break;
      case "reset":
        if (action.to != null) {
          executeReset(action.to, action.options);
        }
        break;
      case "back":
        if (action.from != null) {
          executeBack(action.from, action.options?.source);
        }
        break;
    }
  }
}

function enqueue(action: QueuedAction): void {
  pendingQueue.push(action);
  logNavEvent("nav-queued", {
    kind: action.kind,
    to: action.to,
    queueDepth: pendingQueue.length,
  });
  flushNavigationQueue();
}

function resolveMethod(
  from: string,
  to: string,
  options?: OrchestratorNavigateOptions,
): "push" | "replace" {
  if (options?.push) return "push";
  if (options?.replace || shouldReplaceNavigation(from, to)) return "replace";
  if (wouldCreateCycle(from, to)) return "replace";
  return "push";
}

function executeNavigate(
  from: string,
  to: string,
  options?: OrchestratorNavigateOptions,
): boolean {
  if (!registeredNavigate) return false;

  const target = normalizeRoutePath(to);
  const current = normalizeRoutePath(from);

  if (isSameRoute(current, target)) {
    logNavEvent("nav-skip-duplicate", {
      from: current,
      to: target,
      trigger: options?.trigger,
      source: options?.source,
    });
    return false;
  }

  const method = resolveMethod(current, target, options);
  const replace = method === "replace";

  logNavEvent(replace ? "nav-replace" : "nav-push", {
    from: current,
    to: target,
    trigger: options?.trigger ?? "user",
    source: options?.source,
    stack: getSanitizedPreviousRoute(),
  });

  recordSanitizedTransition(current, target, replace ? "replace" : "push");
  if (isTabRootRoute(target)) {
    markTabRootEntry(target);
  }

  registeredNavigate(target, { replace });
  currentRoute = target;
  return true;
}

function executeReset(to: string, options?: OrchestratorNavigateOptions): boolean {
  if (!registeredNavigate) return false;
  const target = normalizeRoutePath(to);
  logNavEvent("nav-reset", {
    to: target,
    trigger: options?.trigger,
    source: options?.source,
  });
  recordSanitizedTransition(currentRoute, target, "redirect");
  markTabRootEntry(target);
  registeredNavigate(target, { replace: true });
  currentRoute = target;
  return true;
}

function executeBack(from: string, source?: string): void {
  if (!registeredNavigate) return;
  try {
    smartBack(registeredNavigate, from, source ?? "orchestrator-back");
    if (typeof window !== "undefined") {
      currentRoute = normalizeRoutePath(window.location.pathname);
    }
  } catch (err) {
    logNavError("orchestrator-back", err, { from, source });
  }
}

export function safeNavigate(
  from: string,
  to: string,
  options?: OrchestratorNavigateOptions,
): boolean {
  const routeKey = `${normalizeRoutePath(from)}->${normalizeRoutePath(to)}`;
  if (!shouldAllowNav(routeKey)) return false;

  if (!navigatorReady || !bootstrapComplete) {
    enqueue({ kind: "navigate", from, to, options });
    return false;
  }

  return executeNavigate(from, to, options);
}

export function safeReplace(
  from: string,
  to: string,
  options?: OrchestratorNavigateOptions,
): boolean {
  return safeNavigate(from, to, { ...options, replace: true });
}

export function safeReset(
  to: string,
  options?: OrchestratorNavigateOptions,
): boolean {
  const target = normalizeRoutePath(to);
  const routeKey = `reset:${target}`;
  if (!shouldAllowNav(routeKey)) return false;

  if (!navigatorReady || !bootstrapComplete) {
    enqueue({ kind: "reset", to: target, options });
    return false;
  }

  return executeReset(target, options);
}

export function goBackSafe(
  from: string,
  source?: string,
  trigger: NavTrigger = "back",
): void {
  const routeKey = `back:${normalizeRoutePath(from)}`;
  if (!shouldAllowNav(routeKey)) return;

  if (!navigatorReady || !bootstrapComplete) {
    enqueue({
      kind: "back",
      from,
      options: { source, trigger },
    });
    return;
  }

  executeBack(from, source);
}

/**
 * Android hardware back — registered on window for MainActivity.evaluateJavascript.
 * Returns true when the SPA handled back (caller should not pop WebView history).
 */
export function installNativeHardwareBackHandler(): void {
  if (typeof window === "undefined") return;
  window.__amynestGoBack = (): boolean => {
    const from =
      typeof window !== "undefined"
        ? normalizeRoutePath(window.location.pathname)
        : currentRoute;
    const previous = getSanitizedPreviousRoute();
    if (
      isTabRootRoute(from) &&
      (previous == null || isSameRoute(previous, "/dashboard"))
    ) {
      logNavEvent("nav-back-at-root-native", { route: from });
      return false;
    }
    goBackSafe(from, "android-hardware-back", "system");
    return true;
  };
}

declare global {
  interface Window {
    /** Called from Android MainActivity on hardware back. */
    __amynestGoBack?: () => boolean;
  }
}

export function resetNavigationOrchestratorForTests(): void {
  registeredNavigate = null;
  navigatorReady = false;
  bootstrapComplete = false;
  currentRoute = "/";
  pendingQueue.length = 0;
  navInFlight.clear();
  listenerRegistrationCounts = {};
}
