/**
 * Today Recommendation Resolver (Sprint A9.3).
 * Maps recommendations → existing Today card identities only.
 * Never renders. Never imports React. Never executes CTAs.
 */

export {
  AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
  AMY_TODAY_RENDER_VERSION,
  type RenderableRecommendationCompareEntry,
  type RenderableRecommendationCompareStatus,
  type RenderableRecommendationValidationIssue,
  type RenderableRecommendationValidationResult,
  type ResolveTodayRecommendationOptions,
  type TodayRenderableRecommendation,
  type TodayResolverHealth,
} from "./types";

export {
  EXPERIENCE_TO_TODAY_CARD,
  TODAY_EXISTING_CARD_IDS,
  TODAY_EXISTING_CTA_IDS,
} from "./cards";

export { resolveTodayRecommendation } from "./resolve";
export { validateRenderableRecommendation } from "./validate";
export { compareRenderableRecommendation } from "./compare";
export { getResolverHealth } from "./health";
export {
  clearTodayRecommendationResolverStateForTests,
  getRenderableRecommendation,
} from "./health-state";
export { isAmyTodayRecommendationResolverEnabled } from "./flags";
