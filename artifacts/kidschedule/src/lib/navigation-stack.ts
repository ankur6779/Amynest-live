/**
 * In-memory navigation stack for deduplication, cycle detection, and smart back.
 * Complements browser history — does not replace popstate / wouter routing.
 */
import { logNavEvent } from "@/lib/navigation-log";

export type NavMethod = "push" | "replace" | "pop" | "back" | "redirect";

const ROUTE_ALIASES: Record<string, string> = {
  "/parenting-hub/speech-coach/live": "/speech-coach",
  "/parenting-hub/speech-coach": "/speech-coach",
  "/parenting-hub/talking-amy": "/talking-amy",
  "/speech-coach/live": "/speech-coach",
  "/learning-zone/smart-math-tricks": "/smart-math-tricks",
};

/** Bottom-tab roots — entering via tab should replace, not stack. */
export const TAB_ROOT_ROUTES = new Set([
  "/dashboard",
  "/routines",
  "/amy-coach",
  "/parenting-hub",
]);

/** Parent Hub modules — open with replace when launched from the hub. */
export const HUB_MODULE_PREFIXES = [
  "/speech-coach",
  "/speech-coach-v2",
  "/talking-amy",
  "/phonics",
  "/audio-lessons",
  "/study",
  "/life-skills",
  "/school-morning-flow",
  "/smart-math-tricks",
  "/abacus",
  "/spelling",
  "/olympiad",
  "/event-prep",
  "/amy-ai-tutor",
];

const PARENT_ROUTE: Record<string, string> = {
  "/speech-coach": "/parenting-hub",
  "/speech-coach/live-session": "/speech-coach",
  "/speech-coach-v2": "/parenting-hub",
  "/speech-coach-v2/session": "/speech-coach-v2",
  "/talking-amy": "/parenting-hub",
  "/phonics/test/play": "/phonics",
  "/phonics/test": "/phonics",
  "/phonics": "/parenting-hub",
  "/audio-lessons": "/parenting-hub",
  "/study": "/parenting-hub",
  "/life-skills": "/parenting-hub",
  "/school-morning-flow": "/parenting-hub",
  "/smart-math-tricks": "/parenting-hub",
  "/abacus": "/parenting-hub",
  "/spelling": "/parenting-hub",
  "/olympiad": "/parenting-hub",
  "/event-prep": "/parenting-hub",
  "/amy-ai-tutor": "/parenting-hub",
  "/assistant": "/parenting-hub",
  "/amy-coach/progress": "/amy-coach",
  // Discovery Worlds: a sound world → its hub → Parent Hub.
  "/discovery-worlds": "/parenting-hub",
  "/animal-world": "/parenting-hub",
  "/games": "/dashboard",
  "/feedback": "/dashboard",
  "/children": "/dashboard",
  "/behavior": "/dashboard",
  "/recipes": "/dashboard",
  "/nutrition": "/dashboard",
  "/progress": "/dashboard",
  "/insights": "/dashboard",
  "/rewards": "/dashboard",
  "/parent-growth": "/parenting-hub",
  "/kids-control-center": "/parenting-hub",
  "/routines/generate": "/routines",
};

const NESTED_PARENT_PREFIXES: Array<{ prefix: string; parent: string }> = [
  { prefix: "/routines/", parent: "/routines" },
  { prefix: "/children/", parent: "/children" },
  // Individual discovery worlds (e.g. /worlds/instruments) → Discovery Worlds hub.
  { prefix: "/worlds/", parent: "/discovery-worlds" },
];

const MAX_STACK = 8;
const recentRoutes: string[] = [];
let popstateSkipDepth = 0;

/** Strip query/hash and map legacy alias paths to a single canonical route. */
export function normalizeRoutePath(path: string | null | undefined): string {
  if (!path || typeof path !== "string") return "/";
  const base = path.split(/[?#]/)[0] || "/";
  const trimmed = base.replace(/\/+$/, "") || "/";
  return ROUTE_ALIASES[trimmed] ?? trimmed;
}

export function isSameRoute(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return normalizeRoutePath(a) === normalizeRoutePath(b);
}

export function matchesRoutePrefix(path: string, prefix: string): boolean {
  const normalized = normalizeRoutePath(path);
  return normalized === prefix || normalized.startsWith(`${prefix}/`);
}

export function isHubModuleRoute(path: string): boolean {
  const normalized = normalizeRoutePath(path);
  return HUB_MODULE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function isTabRootRoute(path: string): boolean {
  return TAB_ROOT_ROUTES.has(normalizeRoutePath(path));
}

export function getParentRoute(path: string): string | null {
  const normalized = normalizeRoutePath(path);
  if (PARENT_ROUTE[normalized]) return PARENT_ROUTE[normalized]!;
  for (const { prefix, parent } of NESTED_PARENT_PREFIXES) {
    if (normalized.startsWith(prefix)) return parent;
  }
  for (const prefix of HUB_MODULE_PREFIXES) {
    if (normalized.startsWith(`${prefix}/`)) {
      return PARENT_ROUTE[prefix] ?? "/parenting-hub";
    }
  }
  return null;
}

export function shouldReplaceNavigation(from: string, to: string): boolean {
  const fromNorm = normalizeRoutePath(from);
  const toNorm = normalizeRoutePath(to);
  if (isSameRoute(fromNorm, toNorm)) return true;
  // Returning to a parent route (e.g. live session → Speech Coach index).
  const parent = getParentRoute(fromNorm);
  if (parent && isSameRoute(parent, toNorm)) return true;
  // Returning to hub from a module — replace so back never loops through the module again.
  if (isHubModuleRoute(fromNorm) && toNorm === "/parenting-hub") return true;
  // Tab bar switches should not stack history frames.
  if (isTabRootRoute(fromNorm) && isTabRootRoute(toNorm)) return true;
  return false;
}

/** Detect A → B → A → B oscillation using the last few routes. */
export function wouldCreateCycle(
  from: string,
  to: string,
  history: readonly string[] = recentRoutes,
): boolean {
  const fromNorm = normalizeRoutePath(from);
  const toNorm = normalizeRoutePath(to);
  if (isSameRoute(fromNorm, toNorm)) return true;

  // Walking back one frame along the recorded stack is intentional, not a loop.
  // Skip when `from` already appears earlier (hub ↔ module re-entry).
  const stackLen = history.length;
  const fromCount = history.filter((r) => isSameRoute(r, fromNorm)).length;
  if (
    stackLen >= 2 &&
    fromCount === 1 &&
    isSameRoute(history[stackLen - 2], toNorm) &&
    isSameRoute(history[stackLen - 1], fromNorm)
  ) {
    return false;
  }

  const tail = history.slice(-3).map(normalizeRoutePath);
  if (tail.length >= 2) {
    const [a, b] = tail.slice(-2);
    if (a === toNorm && b === fromNorm) return true;
  }
  if (tail.length >= 3) {
    const [a, b, c] = tail.slice(-3);
    if (a === toNorm && c === fromNorm && b !== toNorm) return true;
  }
  return false;
}

export function getRecentRoutes(): readonly string[] {
  return recentRoutes;
}

export function recordRouteTransition(
  from: string,
  to: string,
  method: NavMethod,
): void {
  const fromNorm = normalizeRoutePath(from);
  const toNorm = normalizeRoutePath(to);
  if (isSameRoute(fromNorm, toNorm) && method !== "pop") return;

  if (method === "pop" || method === "back") {
    while (recentRoutes.length > 0 && recentRoutes[recentRoutes.length - 1] === toNorm) {
      recentRoutes.pop();
    }
    if (recentRoutes[recentRoutes.length - 1] !== toNorm) {
      recentRoutes.push(toNorm);
    }
  } else if (method === "replace" || method === "redirect") {
    if (recentRoutes.length === 0) {
      recentRoutes.push(toNorm);
    } else {
      recentRoutes[recentRoutes.length - 1] = toNorm;
      while (
        recentRoutes.length >= 2 &&
        recentRoutes[recentRoutes.length - 1] === recentRoutes[recentRoutes.length - 2]
      ) {
        recentRoutes.pop();
      }
    }
  } else {
    if (recentRoutes[recentRoutes.length - 1] !== fromNorm && recentRoutes.length === 0) {
      recentRoutes.push(fromNorm);
    }
    if (recentRoutes[recentRoutes.length - 1] !== toNorm) {
      recentRoutes.push(toNorm);
    }
  }

  while (recentRoutes.length > MAX_STACK) {
    recentRoutes.shift();
  }

  logNavEvent("stack-transition", {
    from: fromNorm,
    to: toNorm,
    method,
    stack: [...recentRoutes],
  });
}

/** Tab root entry collapses stack to a single root frame. */
export function markTabRootEntry(path: string): void {
  const normalized = normalizeRoutePath(path);
  recentRoutes.length = 0;
  recentRoutes.push(normalized);
  logNavEvent("stack-root-reset", { root: normalized });
}

export function getPreviousRoute(): string | null {
  if (recentRoutes.length < 2) return null;
  return recentRoutes[recentRoutes.length - 2] ?? null;
}

export function shouldSkipPopstateRoute(path: string): boolean {
  if (popstateSkipDepth > 0) return false;
  const normalized = normalizeRoutePath(path);
  const prev = getPreviousRoute();
  const current = recentRoutes[recentRoutes.length - 1];
  if (!prev || !current) return false;
  if (normalized !== prev) return false;
  if (wouldCreateCycle(current, normalized, recentRoutes.slice(0, -1))) {
    return true;
  }
  return recentRoutes.filter((r) => r === normalized).length >= 2;
}

export function beginPopstateSkip(): void {
  popstateSkipDepth += 1;
}

export function endPopstateSkip(): void {
  popstateSkipDepth = Math.max(0, popstateSkipDepth - 1);
}

/** Test-only reset */
export function resetNavigationStackForTests(): void {
  recentRoutes.length = 0;
  popstateSkipDepth = 0;
}
