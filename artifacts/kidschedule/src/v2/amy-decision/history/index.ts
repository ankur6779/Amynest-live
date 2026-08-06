export {
  AMY_DECISION_HISTORY_STORAGE_KEY,
  AMY_DECISION_HISTORY_VERSION,
  type CurrentHistoryPointer,
  type DecisionHistoryDiffEntry,
  type DecisionHistoryDocument,
  type DecisionHistoryExperienceRef,
  type DecisionHistoryOutcomeState,
  type DecisionHistoryRecord,
  type DecisionHistoryValidationIssue,
  type DecisionHistoryValidationResult,
  type RecordDecisionHistoryOptions,
  type RecordDecisionHistoryResult,
  type RecordDecisionHistorySkipReason,
  type RecordableStabilityState,
} from "./types";

export { createEmptyDecisionHistoryDocument } from "./empty";
export { computeHistoryId } from "./history-id";
export {
  computeHistoryHash,
  sealHistoryRecord,
  verifyHistoryHash,
} from "./history-hash";
export { currentHistoryPointer } from "./pointer";
export { recordDecisionHistory } from "./record";
export { validateDecisionHistory } from "./validate";
export { compareHistory } from "./compare";
export {
  findCurrentHistory,
  findHistoryByDecision,
  findHistoryById,
} from "./find";
export { upgradeHistoryDocument } from "./upgrade";
export {
  appendDecisionHistory,
  clearDecisionHistory,
  exportDecisionHistory,
  getCurrentDecisionHistory,
  getCurrentHistoryPointer,
  getDecisionHistory,
} from "./api";
export {
  createLocalHistoryAdapter,
  createMemoryHistoryAdapter,
  getDefaultHistoryAdapter,
  setDefaultHistoryAdapterForTests,
  type DecisionHistoryStorageAdapter,
} from "./store";
export { isAmyDecisionHistoryEnabled } from "./flags";
