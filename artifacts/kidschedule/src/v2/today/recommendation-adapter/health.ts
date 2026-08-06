import { getHealthCounters } from "./health-state";
import {
  AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
  type TodayRecommendationHealth,
} from "./types";

export function getRecommendationHealth(): TodayRecommendationHealth {
  const c = getHealthCounters();
  return Object.freeze({
    brainReads: c.brainReads,
    legacyFallbacks: c.legacyFallbacks,
    validationFailures: c.validationFailures,
    recommendationState: c.recommendationState,
    adapterVersion: AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
  });
}
