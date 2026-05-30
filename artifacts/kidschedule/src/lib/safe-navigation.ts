/**
 * Navigation guards for PWA stress — debounce, dedup, replace rules, cycle prevention.
 */
import { useCallback } from "react";
import { useLocation } from "wouter";
import { logNavError, logNavEvent } from "@/lib/navigation-log";
import {
  getParentRoute,
  isSameRoute,
  isTabRootRoute,
  normalizeRoutePath,
  shouldReplaceNavigation,
  wouldCreateCycle,
  type NavMethod,
} from "@/lib/navigation-stack";
import {
  getSanitizedPreviousRoute,
  recordSanitizedTransition,
} from "@/lib/route-history-manager";

const DEFAULT_DEBOUNCE_MS = 100;
const navInFlight = new Map<string, number>();

export type AppNavigateOptions = {
  replace?: boolean;
  /** Force push even when replace heuristics would apply */
  push?: boolean;
  source?: string;
};

type NavigateFn = (
  to: string,
  options?: { replace?: boolean; state?: unknown },
) => void;

/** Returns false if the same route was triggered within `debounceMs`. */
export function shouldAllowNav(
  routeKey: string,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): boolean {
  if (typeof window === "undefined") return true;
  const now = Date.now();
  const last = navInFlight.get(routeKey) ?? 0;
  if (now - last < debounceMs) return false;
  navInFlight.set(routeKey, now);
  return true;
}

export function runSafeNavAction(
  routeKey: string,
  action: () => void,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): void {
  if (!shouldAllowNav(routeKey, debounceMs)) return;
  try {
    action();
  } catch (err) {
    logNavError("safe-nav-action", err, { routeKey });
  }
}

/** Safe href for wouter Link — never pass undefined. */
export function safeHref(href: string | null | undefined, fallback = "/dashboard"): string {
  if (typeof href === "string" && href.startsWith("/")) return normalizeRoutePath(href);
  return fallback;
}

export function resolveNavMethod(
  from: string,
  to: string,
  options?: AppNavigateOptions,
): NavMethod {
  if (options?.push) return "push";
  if (options?.replace || shouldReplaceNavigation(from, to)) return "replace";
  if (wouldCreateCycle(from, to)) return "replace";
  return "push";
}

export function appNavigate(
  navigate: NavigateFn,
  from: string,
  to: string,
  options?: AppNavigateOptions,
): boolean {
  const target = normalizeRoutePath(to);
  const current = normalizeRoutePath(from);

  if (isSameRoute(current, target)) {
    logNavEvent("nav-skip-duplicate", { from: current, to: target, source: options?.source });
    return false;
  }

  const method = resolveNavMethod(current, target, options);
  const replace = method === "replace";

  logNavEvent(replace ? "nav-replace" : "nav-push", {
    from: current,
    to: target,
    source: options?.source,
  });

  recordSanitizedTransition(current, target, replace ? "replace" : "push");
  navigate(target, { replace });
  return true;
}

/**
 * Stack-based back navigation — does not call browser history APIs.
 * Prefers parent routes (hub modules → Parent Hub), then in-memory stack.
 */
export function smartBack(
  navigate: NavigateFn,
  current: string,
  source = "smart-back",
): void {
  const currentNorm = normalizeRoutePath(current);
  const previous = getSanitizedPreviousRoute();

  logNavEvent("nav-back", { from: currentNorm, previous, source });

  const parent = getParentRoute(currentNorm);
  if (parent) {
    appNavigate(navigate, currentNorm, parent, { replace: true, source });
    return;
  }

  if (
    previous &&
    !isSameRoute(previous, currentNorm) &&
    !wouldCreateCycle(currentNorm, previous)
  ) {
    appNavigate(navigate, currentNorm, previous, { replace: true, source });
    return;
  }

  if (isTabRootRoute(currentNorm)) {
    if (!isSameRoute(currentNorm, "/dashboard")) {
      appNavigate(navigate, currentNorm, "/dashboard", { replace: true, source });
      return;
    }
    logNavEvent("nav-back-at-root", { route: currentNorm, source });
    return;
  }

  appNavigate(navigate, currentNorm, "/dashboard", { replace: true, source });
}

export function useAppNavigate() {
  const [location, navigate] = useLocation();

  const go = useCallback(
    (to: string, options?: AppNavigateOptions) => {
      runSafeNavAction(`${location}->${to}`, () => {
        appNavigate(navigate, location, to, options);
      });
    },
    [location, navigate],
  );

  const back = useCallback(
    (source?: string) => {
      runSafeNavAction(`back:${location}`, () => {
        smartBack(navigate, location, source);
      });
    },
    [location, navigate],
  );

  return { location, navigate: go, back };
}
