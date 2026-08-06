/**
 * Decision History — append-only stable attention timeline.
 * Architecture Freeze v1.0 · Sprint A5.
 *
 * Records StableDecisionResult only. Never raw AmyDecision.
 * Never records UNCHANGED / refresh / reload.
 */

import type { AmyDecisionConfidence } from "../types";
import type {
  AmyStabilityReasonCode,
  AmyStabilityState,
  StableDecisionResult,
} from "../stability/types";

/** Document / record schema version. */
export const AMY_DECISION_HISTORY_VERSION = "amy_decision_history.v1" as const;

/** Storage key for local adapter. */
export const AMY_DECISION_HISTORY_STORAGE_KEY =
  "amynest.v2.amy.decision.history" as const;

/**
 * Outcome recorded for a history entry.
 * Mirrors recordable Stability states only (never UNCHANGED).
 */
export type DecisionHistoryOutcomeState =
  | "NEW"
  | "REPLACED"
  | "EXPIRED"
  | "INVALIDATED";

export type DecisionHistoryExperienceRef = Readonly<{
  experienceId: string;
}>;

/**
 * Immutable append-only history record.
 * Never mutated after creation (except document-level tip link clone).
 */
export type DecisionHistoryRecord = Readonly<{
  historyId: string;
  decisionId: string;
  stabilityToken: string;
  decisionVersion: string;
  policyId: string;
  policyVersion: string;
  contextVersion: string;
  primaryExperience: DecisionHistoryExperienceRef;
  secondaryExperience: DecisionHistoryExperienceRef | null;
  passiveExperience: DecisionHistoryExperienceRef | null;
  reasonCodes: ReadonlyArray<string>;
  stabilityReasonCodes: ReadonlyArray<AmyStabilityReasonCode>;
  confidence: AmyDecisionConfidence;
  recordedAt: string;
  outcomeState: DecisionHistoryOutcomeState;
  previousHistoryId: string | null;
  /** Set when a later record supersedes this tip (document rebuild clone). */
  replacedByHistoryId: string | null;
  /**
   * Machine-only immutable integrity hash.
   * Validation · corruption detection · future sync. Never UI.
   */
  historyHash: string;
}>;

export type DecisionHistoryDocument = Readonly<{
  schemaVersion: typeof AMY_DECISION_HISTORY_VERSION | string;
  records: ReadonlyArray<DecisionHistoryRecord>;
  currentHistoryId: string | null;
  updatedAt: string;
}>;

/**
 * Developer-only fast tip pointer — no UI.
 * Prefer over scanning records when only the current tip is needed.
 */
export type CurrentHistoryPointer = Readonly<{
  historyId: string;
  decisionId: string;
  stabilityToken: string;
  outcomeState: DecisionHistoryOutcomeState;
  recordedAt: string;
  historyHash: string;
  documentUpdatedAt: string;
}>;

export type RecordDecisionHistorySkipReason =
  | "UNCHANGED"
  | "DUPLICATE_TOKEN"
  | "INVALID_STABLE"
  | "NOT_RECORDABLE_STATE";

export type RecordDecisionHistoryResult = Readonly<{
  recorded: boolean;
  skipReason: RecordDecisionHistorySkipReason | null;
  record: DecisionHistoryRecord | null;
  document: DecisionHistoryDocument;
  previousDocument: DecisionHistoryDocument | null;
}>;

export type RecordDecisionHistoryOptions = Readonly<{
  now?: Date;
}>;

export type DecisionHistoryValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type DecisionHistoryValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<DecisionHistoryValidationIssue>;
}>;

export type DecisionHistoryDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;

export type RecordableStabilityState = Exclude<AmyStabilityState, "UNCHANGED">;

export type { StableDecisionResult };
