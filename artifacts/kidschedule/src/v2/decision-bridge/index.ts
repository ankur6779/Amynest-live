/**
 * Decision Bridge (Sprint A8.2).
 * Resolves Brain Decision + Budget against Registry Adapter snapshots.
 * Never executes. Never mutates Brain or Registries.
 */

export {
  AMY_DECISION_BRIDGE_VERSION,
  type DecisionBridgeHealth,
  type DecisionBridgeProvenance,
  type DecisionResolutionExplanation,
  type DecisionResolutionTrace,
  type DecisionResolutionTraceOutcome,
  type DecisionResolutionTraceSlot,
  type DecisionResolutionTraceStep,
  type DecisionResolutionTraceStepKind,
  type MissingReference,
  type MissingReferenceKind,
  type MissingReferenceReason,
  type ResolveDecisionInput,
  type ResolveDecisionOptions,
  type ResolvedDecision,
  type ResolvedDecisionDiffEntry,
  type ResolvedDecisionValidationIssue,
  type ResolvedDecisionValidationResult,
  type ResolvedSlot,
} from "./types";

export { resolveDecision } from "./resolve";
export { validateResolvedDecision } from "./validate";
export { compareResolvedDecisions } from "./compare";
export { explainDecisionResolution } from "./explain";
export { getBridgeHealth } from "./health";
export {
  clearResolvedDecisionSnapshotForTests,
  getMissingReferences,
  getResolvedDecisionSnapshot,
  rememberResolvedDecisionSnapshot,
} from "./helpers";
export { isAmyDecisionBridgeEnabled } from "./flags";
