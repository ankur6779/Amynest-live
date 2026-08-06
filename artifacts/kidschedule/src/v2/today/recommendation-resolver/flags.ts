import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Today Recommendation Resolver kill switch — default OFF. */
export function isAmyTodayRecommendationResolverEnabled(): boolean {
  return isV2FlagEnabled("amy_today_recommendation_resolver_v2");
}
