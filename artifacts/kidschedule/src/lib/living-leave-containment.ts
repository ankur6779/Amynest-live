/**
 * P1 leave-path containment — living production must not open a second product
 * *by accident*. Valid modules keep their routes. Only documented aliases redirect.
 *
 * Living universe ON  → hide unfinished catalogue from More.
 * Direct URLs         → redirect only when the destination is an intentional alias.
 * Legacy / mixed      → preserve existing routes (rollback + tests).
 *
 * Never dump a valid module (`/games`, `/study`, `/progress`, `/insights`,
 * `/routines`, …) onto `/dashboard`. That pattern caused Games → Routine.
 */
import { isAmynestLivingUniverseEnabled } from "@/lib/amynest-living-universe";

/**
 * More / drawer hrefs that are unfinished waitlist surfaces — hide, do not dump.
 * Active modules (`/games`, `/study`, `/progress`, `/insights`) stay visible.
 */
export const LIVING_NAV_CONTAINED_HREFS = ["/kids-control-center"] as const;

export type LivingNavContainedHref = (typeof LIVING_NAV_CONTAINED_HREFS)[number];

/**
 * Direct-URL aliases only. Every entry must be a superseded/canonical path,
 * never a working product page sent to Home.
 *
 * - Speech live/talk → Speech Coach home (session shells, not separate products)
 * - /worksheet, /teacher-os → Rooms (Make / hub, not Home)
 */
export const LIVING_DIRECT_URL_CONTAINMENT: Record<string, string> = {
  "/worksheet": "/parenting-hub",
  "/teacher-os": "/parenting-hub",
  "/speech-coach/live": "/speech-coach",
  "/speech-coach/live-session": "/speech-coach",
  "/speech-coach/talk": "/speech-coach",
  "/parenting-hub/speech-coach/live": "/speech-coach",
};

/** Product pages that must never be generically redirected to Home. */
export const LIVING_ACTIVE_MODULE_HREFS = [
  "/games",
  "/routines",
  "/study",
  "/progress",
  "/insights",
  "/rewards",
  "/dashboard",
  "/parenting-hub",
  "/assistant",
  "/amy-coach",
  "/nutrition",
  "/speech-coach",
] as const;

/**
 * Pages that may be hidden from More (unfinished waitlist) but must still
 * render when opened by URL. Never dump these onto Home.
 */
export const LIVING_NEVER_DUMP_HREFS = [
  ...LIVING_ACTIVE_MODULE_HREFS,
  "/kids-control-center",
] as const;

export function isLivingNavContainedHref(href: string): boolean {
  const path = href.split("#")[0] ?? href;
  return (LIVING_NAV_CONTAINED_HREFS as readonly string[]).includes(path);
}

export function livingDirectUrlContainment(path: string): string | null {
  if (!isAmynestLivingUniverseEnabled()) return null;
  const normalized = path.split("?")[0] ?? path;
  return LIVING_DIRECT_URL_CONTAINMENT[normalized] ?? null;
}

/** Legacy bottom tab + FAB — living drawer is the navigation authority. */
export function shouldShowLegacyMobileTabBar(showDashboardChrome: boolean): boolean {
  return showDashboardChrome && !isAmynestLivingUniverseEnabled();
}

export function filterLivingNavCatalogueItems<T extends { href: string }>(
  items: readonly T[],
): T[] {
  if (!isAmynestLivingUniverseEnabled()) return [...items];
  return items.filter((item) => !isLivingNavContainedHref(item.href));
}
