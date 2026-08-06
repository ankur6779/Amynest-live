import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Today Recommendation Adapter kill switch — default OFF. */
export function isAmyTodayRecommendationAdapterEnabled(): boolean {
  return isV2FlagEnabled("amy_today_recommendation_adapter_v2");
}
