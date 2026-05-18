/**
 * Navigation guards for PWA stress — debounce, double-click prevention, safe wouter paths.
 */
import { logNavError } from "@/lib/navigation-log";

const DEFAULT_DEBOUNCE_MS = 300;
const navInFlight = new Map<string, number>();

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
  if (typeof href === "string" && href.startsWith("/")) return href;
  return fallback;
}
