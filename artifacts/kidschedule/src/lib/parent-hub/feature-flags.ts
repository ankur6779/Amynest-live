import { resolvePortfolioLivingFlag } from "@/lib/amynest-living-universe";

/**
 * Parent Hub Rooms V1 — Pack 1 Room Shell.
 * Portfolio lock (FA-02): VITE_FF_AMYNEST_LIVING_UNIVERSE controls production coherence.
 * Per-module VITE_FF_PARENT_HUB_ROOMS_V1=0 only honored in mixed/dev mode.
 */

export function isParentHubRoomsV1Enabled(): boolean {
  return resolvePortfolioLivingFlag(import.meta.env.VITE_FF_PARENT_HUB_ROOMS_V1);
}
