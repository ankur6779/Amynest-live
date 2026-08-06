export { default as TodayPage, TODAY_SECTION_IDS } from "./TodayPage";
export { buildTodayGreeting } from "./content/greeting";
export { buildTodayMessage } from "./content/message";
export {
  buildMissionWhyLine,
  buildTodayFocusBanner,
  worryDisplayLabel,
} from "./content/focus";
export { getTodaySpeechMission } from "./mission/speech-mission";
export {
  clearMissionCompletion,
  isMissionCompletedToday,
  markMissionCompleted,
} from "./mission/completion";

/** Today Brain Adapter — shadow read only (A9.1). Never drives UI. */
export {
  AMY_TODAY_BRAIN_ADAPTER_VERSION,
  clearTodayBrainAdapterStateForTests,
  compareTodayLegacy,
  getLastTodayBrainSnapshot,
  getTodayBrainHealth,
  getTodayBrainSnapshot,
  isAmyTodayBrainAdapterEnabled,
  validateTodayBrain,
  type LegacyTodaySurface,
  type TodayBrainHealth,
  type TodayBrainShadowReadInput,
  type TodayBrainSnapshot,
  type TodayLegacyCompareResult,
} from "./brain-adapter";

/** Today Recommendation Adapter — normalize only (A9.2). Never drives UI. */
export {
  AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION,
  clearTodayRecommendationAdapterStateForTests,
  compareLegacyRecommendation,
  getRecommendationHealth,
  getRecommendationSnapshot,
  getTodayRecommendation,
  isAmyTodayRecommendationAdapterEnabled,
  validateTodayRecommendation,
  type GetTodayRecommendationInput,
  type LegacyRecommendationSurface,
  type TodayRecommendation,
  type TodayRecommendationHealth,
  type TodayRecommendationState,
} from "./recommendation-adapter";

/** Today Recommendation Resolver — card ids only (A9.3). Never renders. */
export {
  AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
  AMY_TODAY_RENDER_VERSION,
  TODAY_EXISTING_CARD_IDS,
  clearTodayRecommendationResolverStateForTests,
  compareRenderableRecommendation,
  getRenderableRecommendation,
  getResolverHealth,
  isAmyTodayRecommendationResolverEnabled,
  resolveTodayRecommendation,
  validateRenderableRecommendation,
  type TodayRenderableRecommendation,
  type TodayResolverHealth,
} from "./recommendation-resolver";

/** Today Hero Activation Gate — Mission only (A9.4). */
export {
  AMY_TODAY_HERO_ACTIVATION_VERSION,
  clearTodayHeroActivationStateForTests,
  evaluateTodayHeroActivation,
  forceLegacyHero,
  getTodayActivationHealth,
  getTodayHeroSource,
  isAmyTodayBrainHeroEnabled,
  isBrainHeroActive,
  type TodayActivationHealth,
  type TodayHeroActivationResult,
  type TodayHeroSource,
} from "./hero-activation";
