/**
 * Amy Decision — attention intent only.
 * No UI · No navigation · No AI · Architecture Freeze v1.0 · Sprint A3.
 */

import type { AmyDecisionPolicy, AmyExperienceId, AMY_DECISION_VERSION } from "./policy";
import type { AmyReasonCode } from "./reason-codes";
import type { AmyDecisionTrace } from "./trace";

export type AmyDecisionConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

/** Lifecycle without Stability sprint — computed snapshot only. */
export type AmyDecisionState = "computed";

export type AmyDecisionExperienceRef = Readonly<{
  experienceId: AmyExperienceId;
}>;

export type AmyDecision = Readonly<{
  decisionId: string;
  decisionVersion: typeof AMY_DECISION_VERSION;
  /** Mirrors AmyDecisionPolicy.policyVersion */
  policyVersion: string;
  policyId: string;
  generatedAt: string;
  contextVersion: string;
  confidence: AmyDecisionConfidence;
  reasonCodes: ReadonlyArray<AmyReasonCode>;
  primaryExperience: AmyDecisionExperienceRef;
  secondaryExperience: AmyDecisionExperienceRef | null;
  passiveExperience: AmyDecisionExperienceRef | null;
  recommendedAction: string;
  recommendedJourney: string;
  recommendedCTA: string;
  recommendedToolIds: ReadonlyArray<string>;
  recommendedFeatureIds: ReadonlyArray<string>;
  recommendedRouteIds: ReadonlyArray<string>;
  state: AmyDecisionState;
}>;

export type CreateAmyDecisionOptions = Readonly<{
  /** Injected clock for deterministic generatedAt. */
  now?: Date;
  /** Policy to evaluate — defaults to MVP Speech wedge. */
  policy?: AmyDecisionPolicy;
}>;

export type CreateAmyDecisionResult = Readonly<{
  decision: AmyDecision;
  /** Present only when includeTrace — never for users/AI. */
  trace?: AmyDecisionTrace;
}>;

export type AmyDecisionValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type AmyDecisionValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<AmyDecisionValidationIssue>;
}>;

export type AmyDecisionDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;
