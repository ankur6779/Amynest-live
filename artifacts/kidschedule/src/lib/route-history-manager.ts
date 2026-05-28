/**
 * Sanitized in-memory route history — deduped, bounded, no ghost/transient frames.
 */
import {
  getPreviousRoute,
  getRecentRoutes,
  normalizeRoutePath,
  recordRouteTransition,
  resetNavigationStackForTests,
  type NavMethod,
} from "@/lib/navigation-stack";
import { logNavEvent } from "@/lib/navigation-log";

export const MAX_ROUTE_HISTORY = 8;

/** Routes that should not appear in back-stack memory (auth gates, prompts). */
const TRANSIENT_ROUTE_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/verify-email",
  "/auth/",
  "/notify-prompt",
  "/onboarding",
];

export function isTransientRoute(path: string): boolean {
  const normalized = normalizeRoutePath(path);
  return TRANSIENT_ROUTE_PREFIXES.some(
    (prefix) =>
      normalized === prefix ||
      normalized.startsWith(`${prefix}/`) ||
      normalized.startsWith(prefix),
  );
}

function dedupeConsecutive(routes: string[]): string[] {
  const out: string[] = [];
  for (const route of routes) {
    const norm = normalizeRoutePath(route);
    if (out[out.length - 1] === norm) continue;
    out.push(norm);
  }
  return out;
}

/** Remove transient screens and cap length (does not mutate browser history). */
export function sanitizeRouteHistory(
  routes: readonly string[],
  maxSize = MAX_ROUTE_HISTORY,
): string[] {
  const filtered = routes
    .map(normalizeRoutePath)
    .filter((r) => r && !isTransientRoute(r));
  const deduped = dedupeConsecutive(filtered);
  if (deduped.length <= maxSize) return deduped;
  return deduped.slice(-maxSize);
}

export function recordSanitizedTransition(
  from: string,
  to: string,
  method: NavMethod,
): void {
  if (isTransientRoute(from) && isTransientRoute(to)) {
    logNavEvent("route-history-skip-transient", { from, to, method });
    return;
  }
  recordRouteTransition(from, to, method);
  logNavEvent("route-history-snapshot", {
    stack: sanitizeRouteHistory(getRecentRoutes()),
    method,
  });
}

export function getSanitizedPreviousRoute(): string | null {
  const stack = sanitizeRouteHistory(getRecentRoutes());
  if (stack.length < 2) return null;
  return stack[stack.length - 2] ?? null;
}

export function getSanitizedRecentRoutes(): readonly string[] {
  return sanitizeRouteHistory(getRecentRoutes());
}

export function resetRouteHistoryForTests(): void {
  resetNavigationStackForTests();
}

/** Re-export for callers that need raw stack access. */
export { getPreviousRoute, getRecentRoutes };
