/**
 * Decision Stability — keep vs replace only.
 * Does not create decisions. Architecture Freeze v1.0 · Sprint A4.
 */

import type { AmyDecision } from "../types";

export type AmyStabilityState =
  | "NEW"
  | "UNCHANGED"
  | "REPLACED"
  | "INVALIDATED"
  | "EXPIRED";

/**
 * Machine-readable stability reason codes — no UI, no AI, no human copy.
 * Primary `changeReason` is one of these; `stabilityReasonCodes` lists all that apply.
 */
export type AmyStabilityReasonCode =
  | "NO_PREVIOUS"
  | "MISSION_COMPLETED"
  | "MISSION_RESET"
  | "COACH_STARTED"
  | "COACH_COMPLETED"
  | "COACH_PAUSED"
  | "COACH_PREPARED"
  | "CHALLENGE_CHANGED"
  | "AGE_CHANGED"
  | "SPEECH_STATUS_CHANGED"
  | "PREMIUM_CAPABILITY_CHANGED"
  | "POLICY_UPDATED"
  | "PRIMARY_CHANGED"
  | "SECONDARY_CHANGED"
  | "PASSIVE_CHANGED"
  | "OUTCOME_CHANGED"
  | "FINGERPRINT_CHANGED"
  | "FINGERPRINT_UNCHANGED"
  | "FINGERPRINT_MISSING"
  | "AXES_UNCHANGED"
  | "DECISION_INVALID"
  | "EXPIRED"
  | "UNKNOWN_CAPABILITY_SHIFT"
  | "NONE";

/** @deprecated Prefer AmyStabilityReasonCode — kept as alias for changeReason field. */
export type AmyStabilityChangeReason = AmyStabilityReasonCode;

export type StableDecisionResult = Readonly<{
  decision: AmyDecision;
  stabilityState: AmyStabilityState;
  /** Primary machine reason for this evaluation. */
  changeReason: AmyStabilityReasonCode;
  /** All applicable machine reason codes for this evaluation. */
  stabilityReasonCodes: ReadonlyArray<AmyStabilityReasonCode>;
  previousDecisionId: string | null;
  currentDecisionId: string;
  policyVersion: string;
  evaluatedAt: string;
  /** Meaningful context fingerprint used for this evaluation. */
  stabilityFingerprint: string;
  /**
   * Machine-only stable identifier for later History.
   * Deterministic for a given (fingerprint, decision identity, slots, outcome).
   * Preserved across UNCHANGED evaluations when previousStabilityToken is supplied.
   */
  stabilityToken: string;
}>;

export type StabilizeAmyDecisionInput = Readonly<{
  /** Current resolved family facts. */
  context: import("@/v2/amy-context").AmyContext;
  /** Freshly computed candidate from createAmyDecision(context). */
  currentDecision: AmyDecision;
  /** Last stable decision, if any. */
  previousDecision?: AmyDecision | null;
}>;

export type StabilizeAmyDecisionOptions = Readonly<{
  now?: Date;
  /**
   * If set and previous decision is past this instant, state is EXPIRED
   * before re-binding to currentDecision.
   */
  previousExpiresAt?: string | null;
  /**
   * Fingerprint from the last StableDecisionResult.
   * Required for UNCHANGED — comparison always includes fingerprint.
   */
  previousStabilityFingerprint?: string | null;
  /**
   * Token from the last StableDecisionResult.
   * When axes are unchanged, this token is preserved for History continuity.
   */
  previousStabilityToken?: string | null;
}>;

/** Multi-axis comparison used for keep vs replace (P0). */
export type StabilityAxisComparison = Readonly<{
  fingerprintSame: boolean;
  policyVersionSame: boolean;
  primarySame: boolean;
  secondarySame: boolean;
  passiveSame: boolean;
  outcomeSame: boolean;
  /** True only when every required axis matches. */
  allAxesSame: boolean;
  fingerprintMissing: boolean;
}>;

export type DecisionStabilityValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<{ path: string; message: string }>;
}>;

export type StableDecisionDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;

export type DecisionReplacementExplanation = Readonly<{
  replaced: boolean;
  changeReason: AmyStabilityReasonCode;
  stabilityReasonCodes: ReadonlyArray<AmyStabilityReasonCode>;
  previousDecisionId: string | null;
  currentDecisionId: string;
  previousPrimary: string | null;
  currentPrimary: string;
  fingerprintChanged: boolean;
  outcomeChanged: boolean;
  policyChanged: boolean;
  primaryChanged: boolean;
  secondaryChanged: boolean;
  passiveChanged: boolean;
  allAxesSame: boolean;
  stabilityToken: string;
  detailCodes: ReadonlyArray<AmyStabilityReasonCode>;
}>;
