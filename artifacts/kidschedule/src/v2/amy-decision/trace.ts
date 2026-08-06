/**
 * Developer-only Decision Trace.
 * Machine-readable · Never user-facing · Never for AI consumption.
 */

import type { AmyExperienceId } from "./policy";
import type { AmyReasonCode } from "./reason-codes";

export type AmyDecisionTraceStep = Readonly<{
  stepId: string;
  principle: string;
  selected: string | null;
  rejected: ReadonlyArray<string>;
  reasonCodes: ReadonlyArray<AmyReasonCode>;
  weight: number;
}>;

export type AmyDecisionTrace = Readonly<{
  kind: "amy_decision_trace.v1";
  policyId: string;
  policyVersion: string;
  contextVersion: string;
  decisionId: string;
  steps: ReadonlyArray<AmyDecisionTraceStep>;
  slotResolution: Readonly<{
    primary: AmyExperienceId;
    secondary: AmyExperienceId | null;
    passive: AmyExperienceId | null;
  }>;
  unknownCapabilities: ReadonlyArray<string>;
}>;
