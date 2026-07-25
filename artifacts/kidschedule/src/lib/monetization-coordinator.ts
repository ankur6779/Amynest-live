/**
 * Ensures only one monetization surface is visible at a time.
 */

export type MonetizationSurface =
  | "value_sheet"
  | "value_bridge"
  | "premium_banner"
  | "winback"
  | "paywall"
  | "subscription_modal";

let activeSurface: MonetizationSurface | null = null;

export function getActiveMonetizationSurface(): MonetizationSurface | null {
  return activeSurface;
}

export function tryClaimMonetizationSurface(surface: MonetizationSurface): boolean {
  if (activeSurface !== null && activeSurface !== surface) return false;
  activeSurface = surface;
  return true;
}

export function releaseMonetizationSurface(surface: MonetizationSurface): void {
  if (activeSurface === surface) activeSurface = null;
}

export function isMonetizationSurfaceBlocked(requester: MonetizationSurface): boolean {
  return activeSurface !== null && activeSurface !== requester;
}
