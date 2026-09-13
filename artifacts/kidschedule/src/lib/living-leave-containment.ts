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
export const LIVING_NAV_CONTAINED_HREFS = [
  "/kids-control-center",
  "/worksheet",
  "/teacher-os",
] as const;

export type LivingNavContainedHref = (typeof LIVING_NAV_CONTAINED_HREFS)[number];

/**
 * Direct-URL aliases only. Every entry must be a superseded/canonical path,
 * never a working product page sent to Home.
 *
 * Grow leave destinations (/phonics, /abacus, /spelling, …) keep their shells.
 * Speech Coach live/talk are first-party interiors of `/speech-coach` and
 * stay reachable in living — they are not leftover catalogue products.
 *
 * Hidden from the parent product in every universe flag.
 * Direct URLs alias to Rooms — not Home.
 */
export const HIDDEN_MODULE_REDIRECTS: Record<string, string> = {
  "/teacher-os": "/parenting-hub",
  "/worksheet": "/parenting-hub",
};

/**
 * Living-only aliases. Hidden modules are listed here too so existing
 * containment tests can treat them as documented redirects.
 */
export const LIVING_DIRECT_URL_CONTAINMENT: Record<string, string> = {
  ...HIDDEN_MODULE_REDIRECTS,
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
  const normalized = path.split("?")[0] ?? path;
  const hidden = HIDDEN_MODULE_REDIRECTS[normalized];
  if (hidden) return hidden;
  if (!isAmynestLivingUniverseEnabled()) return null;
  return LIVING_DIRECT_URL_CONTAINMENT[normalized] ?? null;
}

/** Legacy bottom tab + FAB — living drawer is the navigation authority. */
export function shouldShowLegacyMobileTabBar(showDashboardChrome: boolean): boolean {
  return showDashboardChrome && !isAmynestLivingUniverseEnabled();
}

export function filterLivingNavCatalogueItems<T extends { href: string }>(
  items: readonly T[],
): T[] {
  const withoutHidden = items.filter((item) => {
    const path = item.href.split("?")[0]?.split("#")[0] ?? item.href;
    return path !== "/worksheet" && path !== "/teacher-os";
  });
  if (!isAmynestLivingUniverseEnabled()) return [...withoutHidden];
  return withoutHidden.filter((item) => !isLivingNavContainedHref(item.href));
}
