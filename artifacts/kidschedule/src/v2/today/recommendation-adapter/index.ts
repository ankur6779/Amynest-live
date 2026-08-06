/**
 * Today Recommendation Adapter (Sprint A9.2).
 * Brain produces recommendations. Today decides whether to consume.
 * Never renders. Never owns UI.
 */

export {
  AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
  type GetTodayRecommendationInput,
  type GetTodayRecommendationOptions,
  type LegacyRecommendationCompareEntry,
  type LegacyRecommendationCompareResult,
  type LegacyRecommendationCompareStatus,
  type LegacyRecommendationSurface,
  type TodayRecommendation,
  type TodayRecommendationConfidence,
  type TodayRecommendationHealth,
  type TodayRecommendationState,
  type TodayRecommendationValidationIssue,
  type TodayRecommendationValidationResult,
  type TodaySlotRecommendation,
} from "./types";

export { getTodayRecommendation } from "./recommend";
export { validateTodayRecommendation } from "./validate";
export { compareLegacyRecommendation } from "./compare";
export { getRecommendationHealth } from "./health";
export {
  clearTodayRecommendationAdapterStateForTests,
  getRecommendationSnapshot,
} from "./health-state";
export { isAmyTodayRecommendationAdapterEnabled } from "./flags";
