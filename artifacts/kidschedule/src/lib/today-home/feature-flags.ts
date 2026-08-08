import { resolvePortfolioLivingFlag } from "@/lib/amynest-living-universe";

/**
 * Today Home V1 — Phase 2 manufacturing flag.
 * Portfolio lock (FA-02): VITE_FF_AMYNEST_LIVING_UNIVERSE controls production coherence.
 * Per-module VITE_FF_TODAY_HOME_V1=0 only honored in mixed/dev mode.
 */

export function isTodayHomeV1Enabled(): boolean {
  return resolvePortfolioLivingFlag(import.meta.env.VITE_FF_TODAY_HOME_V1);
}
