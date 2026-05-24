import { HUB_CONTENT_QUOTAS } from "@workspace/parent-hub-journey";

/** Parent Hub tiles: free users may open each tile this many times (lifetime). */
export const MAX_FREE_HUB_TILE_OPENS = 2;

/** Shared Speech Coach session pool — any section interaction counts once. */
export const SPEECH_COACH_SESSION_FEATURE = "hub_speech_session";

/** Nutrition AI sub-features stay at one lifetime use. */
const SINGLE_OPEN_FEATURES = new Set([
  "nutrition_week_plan",
  "nutrition_family_ai",
]);

/** Lifetime free-open cap for a tracked Parent Hub / feature id. */
export function getMaxFreeOpens(featureId: string): number {
  if (featureId === SPEECH_COACH_SESSION_FEATURE) {
    return HUB_CONTENT_QUOTAS.speechCoachSessions;
  }
  if (SINGLE_OPEN_FEATURES.has(featureId)) return 1;
  if (featureId.startsWith("hub_speech_")) {
    return HUB_CONTENT_QUOTAS.speechCoachSessions;
  }
  if (featureId.startsWith("hub_")) return MAX_FREE_HUB_TILE_OPENS;
  return 1;
}

export function isFeatureQuotaExhausted(useCount: number, featureId: string): boolean {
  return useCount >= getMaxFreeOpens(featureId);
}
