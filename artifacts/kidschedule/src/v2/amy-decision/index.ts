export {
  AMY_ACTION,
  AMY_CTA,
  AMY_DECISION_POLICY_VERSION,
  AMY_DECISION_VERSION,
  AMY_EXPERIENCE,
  AMY_EXPERIENCE_REFS,
  AMY_HERO_PRIORITY_ORDER,
  AMY_JOURNEY,
  MVP_SPEECH_WEDGE_POLICY,
  sortReasonCodes,
  type AmyDecisionPolicy,
  type AmyExperienceId,
} from "./policy";

export { AMY_REASON, AMY_REASON_CODES, type AmyReasonCode } from "./reason-codes";

export type {
  AmyDecision,
  AmyDecisionConfidence,
  AmyDecisionDiffEntry,
  AmyDecisionExperienceRef,
  AmyDecisionState,
  AmyDecisionValidationIssue,
  AmyDecisionValidationResult,
  CreateAmyDecisionOptions,
  CreateAmyDecisionResult,
} from "./types";

export type { AmyDecisionTrace, AmyDecisionTraceStep } from "./trace";

export { createAmyDecision, createAmyDecisionWithTrace } from "./create";
export { validateAmyDecision } from "./validate";
export { validateAmyDecisionPolicy } from "./validate-policy";
export { compareAmyDecisions, diffDecisionReasons } from "./compare";
export { isAmyDecisionEngineEnabled } from "./flags";

/** Decision Stability Engine (Sprint A4) — keep vs replace only. */
export type {
  AmyStabilityChangeReason,
  AmyStabilityReasonCode,
  AmyStabilityState,
  DecisionReplacementExplanation,
  DecisionStabilityValidationResult,
  StabilizeAmyDecisionInput,
  StabilizeAmyDecisionOptions,
  StabilityAxisComparison,
  StableDecisionDiffEntry,
  StableDecisionResult,
} from "./stability";

export {
  compareStabilityAxes,
  compareStableDecisions,
  computeStabilityFingerprint,
  computeStabilityToken,
  computeStabilityTokenForDecision,
  decisionOutcomeKey,
  explainDecisionReplacement,
  isAmyDecisionStabilityEnabled,
  outcomesEqual,
  stabilizeAmyDecision,
  validateDecisionStability,
} from "./stability";

/** Decision History Engine (Sprint A5) — append-only stable timeline. */
export {
  AMY_DECISION_HISTORY_STORAGE_KEY,
  AMY_DECISION_HISTORY_VERSION,
  appendDecisionHistory,
  clearDecisionHistory,
  compareHistory,
  computeHistoryHash,
  createEmptyDecisionHistoryDocument,
  createLocalHistoryAdapter,
  createMemoryHistoryAdapter,
  currentHistoryPointer,
  exportDecisionHistory,
  findCurrentHistory,
  findHistoryByDecision,
  findHistoryById,
  getCurrentDecisionHistory,
  getCurrentHistoryPointer,
  getDecisionHistory,
  isAmyDecisionHistoryEnabled,
  recordDecisionHistory,
  sealHistoryRecord,
  setDefaultHistoryAdapterForTests,
  upgradeHistoryDocument,
  validateDecisionHistory,
  verifyHistoryHash,
  type CurrentHistoryPointer,
  type DecisionHistoryDiffEntry,
  type DecisionHistoryDocument,
  type DecisionHistoryOutcomeState,
  type DecisionHistoryRecord,
  type DecisionHistoryStorageAdapter,
  type DecisionHistoryValidationResult,
  type RecordDecisionHistoryResult,
} from "./history";

/** Decision Cooldown Engine (Sprint A6) — recommendation eligibility only. */
export {
  AMY_DECISION_COOLDOWN_STORAGE_KEY,
  AMY_DECISION_COOLDOWN_VERSION,
  clearCooldown,
  compareCooldownResults,
  cooldownFactsFromContext,
  createEmptyCooldownDocument,
  createLocalCooldownAdapter,
  createMemoryCooldownAdapter,
  evaluateDecisionCooldown,
  expireCooldown,
  getActiveCooldowns,
  getCooldownSnapshot,
  hasActiveCooldown,
  isAmyDecisionCooldownEnabled,
  localDateKeyFromDate,
  recordCooldownDismissal,
  setDefaultCooldownAdapterForTests,
  upgradeCooldownDocument,
  validateDecisionCooldown,
  type DecisionCooldownDocument,
  type DecisionCooldownEntry,
  type DecisionCooldownFacts,
  type DecisionCooldownPolicy,
  type DecisionCooldownResult,
  type DecisionCooldownState,
  type DecisionCooldownStorageAdapter,
  type DecisionCooldownValidationResult,
  type RecordCooldownDismissalResult,
} from "./cooldown";

/** Attention Budget Engine (Sprint A7) — allocation only, never persisted. */
export {
  AMY_ATTENTION_BUDGET_VERSION,
  allocateAttentionBudget,
  attentionCoverage,
  clearAttentionBudgetSnapshotForTests,
  compareAttentionBudgets,
  explainAttentionAllocation,
  getAttentionBudgetSnapshot,
  hasHero,
  hasPassive,
  hasSecondary,
  isAmyAttentionBudgetEnabled,
  rememberAttentionBudgetSnapshot,
  validateAttentionBudget,
  type AllocateAttentionBudgetInput,
  type AttentionAllocationExplanation,
  type AttentionAllocationTrace,
  type AttentionBudgetReasonCode,
  type AttentionBudgetRestrictions,
  type AttentionBudgetResult,
  type AttentionBudgetState,
  type AttentionBudgetValidationResult,
  type SuppressedExperience,
} from "./attention-budget";
