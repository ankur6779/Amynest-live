export {
  ADAPTIVE_ENGINE_VERSION,
  type AdaptiveSnapshot,
  type AdaptiveEngineInput,
  type AdaptiveHistoryInput,
  type EngagementLevel,
  type EngagementProfile,
  type LearningPreferences,
  type RoutineHealth,
  type AdaptationAction,
  type AdaptationRecommendation,
  type ParentFeedbackSignal,
  type HistorySummary,
} from "./types.js";

export {
  AdaptiveEngine,
  getAdaptiveEngine,
  computeAdaptiveSnapshot,
} from "./engine.js";

export { buildLearningPreferences } from "./learning.js";
export { buildEngagementProfile } from "./engagement.js";
export {
  buildRoutineHealth,
  buildAdaptationRecommendations,
  routineHealthLabel,
} from "./routines.js";
export { accumulateFeedbackWeights } from "./feedback.js";
export { assertNoIdentifiers, sanitizeTypeTag } from "./privacy.js";
