import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Controlled Mission Hero activation — default OFF. Single-flag rollback. */
export function isAmyTodayBrainHeroEnabled(): boolean {
  return isV2FlagEnabled("amy_today_brain_hero_v2");
}
