/**
 * Decision Cooldown — recommendation eligibility only.
 * Architecture Freeze v1.0 · Sprint A6.
 *
 * Never creates decisions. Never changes History / Context / Memory.
 * Never selects Hero. Never decides visibility.
 */

import type { DecisionHistoryDocument } from "../history/types";
import type { StableDecisionResult } from "../stability/types";

export const AMY_DECISION_COOLDOWN_VERSION =
  "amy_decision_cooldown.v1" as const;

export const AMY_DECISION_COOLDOWN_STORAGE_KEY =
  "amynest.v2.amy.decision.cooldown" as const;

export type DecisionCooldownState =
  | "NONE"
  | "ACTIVE"
  | "EXPIRED"
  | "PERMANENT";

export type DecisionCooldownPolicy =
  | "UNTIL_END_OF_DAY"
  | "UNTIL_TOMORROW"
  | "UNTIL_CHALLENGE_CHANGES"
  | "UNTIL_MISSION_CHANGES"
  | "UNTIL_COACH_COMPLETES"
  | "PERMANENT_HIDE";

/** Machine-readable cooldown reasons — no UI / AI copy. */
export type DecisionCooldownReason =
  | "NO_COOLDOWN"
  | "DISMISSED"
  | "DUPLICATE_DISMISSAL"
  | "TIME_ELAPSED"
  | "CHALLENGE_CHANGED"
  | "MISSION_CHANGED"
  | "COACH_COMPLETED"
  | "PERMANENT_HIDE"
  | "EXPLICIT_EXPIRE"
  | "EXPLICIT_CLEAR"
  | "POLICY_ACTIVE";

/**
 * Facts used only for policy evaluation.
 * Derived by callers from AmyContext — Cooldown never reads Memory.
 */
export type DecisionCooldownFacts = Readonly<{
  /** Local calendar day YYYY-MM-DD. */
  localDateKey: string;
  /** Challenge identity (e.g. worryId). */
  challengeKey: string | null;
  /** Mission identity (e.g. missionId|dateKey|completedAt). */
  missionKey: string | null;
  /** Coach lifecycle status. */
  coachStatus: string | null;
}>;

/** Stored per-experience cooldown entry (durable). */
export type DecisionCooldownEntry = Readonly<{
  experienceId: string;
  cooldownPolicy: DecisionCooldownPolicy;
  startedAt: string;
  expiresAt: string | null;
  dismissCount: number;
  boundChallengeKey: string | null;
  boundMissionKey: string | null;
  boundCoachStatus: string | null;
  cooldownReason: DecisionCooldownReason;
  cooldownVersion: typeof AMY_DECISION_COOLDOWN_VERSION | string;
}>;

export type DecisionCooldownDocument = Readonly<{
  schemaVersion: typeof AMY_DECISION_COOLDOWN_VERSION | string;
  entries: ReadonlyArray<DecisionCooldownEntry>;
  updatedAt: string;
}>;

/** Pure evaluation output — eligibility report only. */
export type DecisionCooldownResult = Readonly<{
  experienceId: string;
  cooldownState: DecisionCooldownState;
  cooldownPolicy: DecisionCooldownPolicy | null;
  startedAt: string | null;
  expiresAt: string | null;
  dismissCount: number;
  eligibleAgain: boolean;
  cooldownReason: DecisionCooldownReason;
  cooldownVersion: typeof AMY_DECISION_COOLDOWN_VERSION;
}>;

export type EvaluateDecisionCooldownInput = Readonly<{
  stable: StableDecisionResult;
  history: DecisionHistoryDocument | null;
  store: DecisionCooldownDocument;
  facts: DecisionCooldownFacts;
}>;

export type EvaluateDecisionCooldownOptions = Readonly<{
  now?: Date;
  /** Defaults to stable.decision.primaryExperience.experienceId */
  experienceId?: string;
}>;

export type RecordCooldownDismissalInput = Readonly<{
  experienceId: string;
  policy: DecisionCooldownPolicy;
  facts: DecisionCooldownFacts;
  store: DecisionCooldownDocument;
  reason?: DecisionCooldownReason;
}>;

export type RecordCooldownDismissalOptions = Readonly<{
  now?: Date;
}>;

export type RecordCooldownDismissalResult = Readonly<{
  entry: DecisionCooldownEntry;
  store: DecisionCooldownDocument;
  result: DecisionCooldownResult;
  duplicate: boolean;
}>;

export type DecisionCooldownValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type DecisionCooldownValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<DecisionCooldownValidationIssue>;
}>;

export type DecisionCooldownDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;

export type { DecisionHistoryDocument, StableDecisionResult };
