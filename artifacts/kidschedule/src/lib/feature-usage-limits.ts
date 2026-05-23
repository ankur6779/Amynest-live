/** Parent Hub tiles: free users may open each tile this many times (lifetime). */
export const MAX_FREE_HUB_TILE_OPENS = 2;

/** Nutrition AI + speech-coach sub-sections stay at one lifetime use. */
const SINGLE_OPEN_FEATURES = new Set([
  "nutrition_week_plan",
  "nutrition_family_ai",
]);

function isSpeechCoachSubSection(featureId: string): boolean {
  return featureId.startsWith("hub_speech_") && featureId !== "hub_speech";
}

/** Lifetime free-open cap for a tracked Parent Hub / feature id. */
export function getMaxFreeOpens(featureId: string): number {
  if (SINGLE_OPEN_FEATURES.has(featureId)) return 1;
  if (isSpeechCoachSubSection(featureId)) return 1;
  if (featureId.startsWith("hub_")) return MAX_FREE_HUB_TILE_OPENS;
  return 1;
}

export function isFeatureQuotaExhausted(useCount: number, featureId: string): boolean {
  return useCount >= getMaxFreeOpens(featureId);
}
