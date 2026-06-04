/**
 * Warm lazy route chunks before navigation — cuts "Loading AmyNest…" time on
 * Android WebView / Capacitor where JS parse is slower than desktop Safari.
 */

type ChunkLoader = () => Promise<unknown>;

const EXACT_ROUTE_LOADERS: Record<string, ChunkLoader> = {
  "/dashboard": () => import("@/pages/dashboard"),
  "/parenting-hub": () => import("@/pages/parenting-hub"),
  "/amy-coach": () => import("@/pages/ai-coach"),
  "/nutrition": () => import("@/pages/nutrition"),
  "/assistant": () => import("@/pages/assistant"),
  "/amy-ai-tutor": () => import("@/pages/amy-ai-tutor"),
  "/learn-with-amy": () => import("@/pages/amy-learning-tutor"),
  "/games": () => import("@/pages/games"),
  "/answer-to-kids-how": () => import("@/pages/answer-to-kids-how"),
  "/progress": () => import("@/pages/progress"),
  "/insights": () => import("@/pages/insights"),
  "/rewards": () => import("@/pages/rewards"),
  "/behavior": () => import("@/pages/behavior/index"),
  "/recipes": () => import("@/pages/recipes"),
  "/children": () => import("@/pages/children/index"),
  "/parent-profile": () => import("@/pages/parent-profile"),
  "/pricing": () => import("@/pages/pricing"),
  "/subscription-trial": () => import("@/pages/subscription-trial"),
  "/referrals": () => import("@/pages/referrals"),
  "/feedback": () => import("@/pages/feedback"),
  "/study": () => import("@/pages/study"),
  "/phonics": () => import("@/pages/phonics"),
  "/life-skills": () => import("@/pages/life-skills"),
  "/smart-math-tricks": () => import("@/pages/smart-math-tricks"),
  "/abacus": () => import("@/pages/abacus"),
  "/spelling": () => import("@/pages/spelling"),
  "/olympiad": () => import("@/pages/olympiad"),
  "/kids-control-center": () => import("@/pages/kids-control-center"),
  "/notification-settings": () => import("@/pages/notification-settings"),
};

const PREFIX_ROUTE_LOADERS: Array<{ prefix: string; load: ChunkLoader }> = [
  { prefix: "/routines", load: () => import("@/pages/routines/index") },
  { prefix: "/speech-coach", load: () => import("@/pages/speech-coach/index") },
  { prefix: "/children", load: () => import("@/pages/children/index") },
  {
    prefix: "/answer-to-kids-how/read",
    load: () => import("@/pages/answer-to-kids-how-reader"),
  },
];

const prefetched = new Set<string>();

export function normalizeRoutePath(pathname: string): string {
  const raw = pathname.split(/[?#]/)[0]?.trim() || "/";
  if (raw.length > 1 && raw.endsWith("/")) return raw.slice(0, -1);
  return raw;
}

export function resolveRouteChunkLoader(pathname: string): ChunkLoader | null {
  const path = normalizeRoutePath(pathname);
  const exact = EXACT_ROUTE_LOADERS[path];
  if (exact) return exact;

  for (const { prefix, load } of PREFIX_ROUTE_LOADERS) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return load;
  }

  return null;
}

/** Fire-and-forget dynamic import for a route path (no-op if unknown or already warm). */
export function prefetchRouteChunk(pathname: string): void {
  const path = normalizeRoutePath(pathname);
  const loader = resolveRouteChunkLoader(path);
  if (!loader || prefetched.has(path)) return;

  prefetched.add(path);
  void loader().catch(() => {
    prefetched.delete(path);
  });
}

const CAPACITOR_HOT_ROUTES = [
  "/dashboard",
  "/parenting-hub",
  "/amy-coach",
  "/routines",
  "/nutrition",
  "/assistant",
  "/games",
] as const;

function scheduleIdle(task: () => void, timeoutMs: number): void {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(task, { timeout: timeoutMs });
    return;
  }
  window.setTimeout(task, 120);
}

/** Stagger hot-route preloads so Android WebView is not blocked by parallel parses. */
export function prefetchCapacitorHotRoutes(): void {
  let index = 0;

  const next = () => {
    const route = CAPACITOR_HOT_ROUTES[index];
    if (!route) return;
    prefetchRouteChunk(route);
    index += 1;
    if (index < CAPACITOR_HOT_ROUTES.length) {
      scheduleIdle(next, 2500);
    }
  };

  scheduleIdle(next, 2000);
}
