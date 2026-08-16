/**
 * P1 leave-path containment — living production must not open a second product.
 * Presentation / routing only. Engines, entitlements, and FA-02 are untouched.
 *
 * Living universe ON  → hide catalogue nav + redirect leftover product URLs.
 * Legacy / mixed      → preserve existing routes (rollback + tests).
 */
import { isAmynestLivingUniverseEnabled } from "@/lib/amynest-living-universe";

/** More / drawer hrefs that open a leftover catalogue or dashboard. */
export const LIVING_NAV_CONTAINED_HREFS = [
  "/games",
  "/study",
  "/insights",
  "/progress",
  "/kids-control-center",
] as const;

export type LivingNavContainedHref = (typeof LIVING_NAV_CONTAINED_HREFS)[number];

/**
 * Direct-URL containment. Routes stay registered for rollback.
 * Grow leave destinations (/phonics, /abacus, /spelling, …) are NOT listed —
 * those keep their living shells.
 */
export const LIVING_DIRECT_URL_CONTAINMENT: Record<string, string> = {
  "/games": "/dashboard",
  "/rewards": "/dashboard",
  "/insights": "/dashboard",
  "/progress": "/dashboard",
  "/kids-control-center": "/dashboard",
  "/worksheet": "/parenting-hub",
  "/teacher-os": "/parenting-hub",
  "/speech-coach/live": "/speech-coach",
  "/speech-coach/live-session": "/speech-coach",
  "/speech-coach/talk": "/speech-coach",
  "/parenting-hub/speech-coach/live": "/speech-coach",
};

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
