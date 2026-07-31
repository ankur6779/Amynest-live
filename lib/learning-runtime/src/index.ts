export {
  LEARNING_RUNTIME_SCHEMA_VERSION,
  type DifficultyDecision,
  type HintsDecision,
  type NarrationLength,
  type CelebrationLevel,
  type RewardPriority,
  type ActivityKind,
  type NextActivity,
  type ReviewQueueItem,
  type RecommendationDecision,
  type DecisionEvidence,
  type LearningDecision,
  type RuntimeChildProfile,
  type RuntimeSkillEntry,
  type RuntimeKnowledgeSnapshot,
  type RuntimeAttentionSnapshot,
  type RuntimeDailyMissionSnapshot,
  type RuntimeSessionHistory,
  type RuntimeInputSnapshots,
  type ChildRuntimeState,
  type NormalizedSignal,
  type RuleCondition,
  type DecisionPatch,
  type RuntimeRule,
  type RuleContext,
} from "./types.js";

export { normalizeLearningEvent } from "./normalize.js";
export {
  createChildRuntimeState,
  applySignalToState,
  markRuleFired,
} from "./state.js";
export { resolvePath, evaluateCondition } from "./conditions.js";
export {
  evaluateRules,
  mergeDecisionPatches,
  type RuleFireResult,
} from "./rules.js";
export {
  evaluateRulesDetailed,
  type RuleSkipReason,
  type DetailedRuleEvaluation,
} from "./rule-evaluation.js";
export {
  RUNTIME_TRACE_SCHEMA_VERSION,
  buildKnowledgeDelta,
  compactMatchedRules,
  ruleDependencyIndex,
  type RuntimeTraceFrame,
  type RuntimeTracer,
} from "./trace.js";
export {
  DEFAULT_RUNTIME_RULES,
  DEFAULT_FEATURE_FLAGS,
} from "./rule-pack.js";
export { enrichDecisionPatch, finalizeDecision } from "./enrich.js";
export { toLearningDecisionEvent } from "./emit.js";
export {
  createLearningRuntime,
  type LearningRuntime,
  type LearningRuntimeOptions,
  type ProcessEventResult,
  type RuntimeMetricsSample,
  type RuntimeMetricsObserver,
} from "./runtime.js";
