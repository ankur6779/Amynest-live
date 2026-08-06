import { compareStabilityAxes } from "./compare-axes";
import { computeStabilityFingerprint } from "./fingerprint";
import type {
  DecisionReplacementExplanation,
  StabilizeAmyDecisionInput,
  StabilizeAmyDecisionOptions,
} from "./types";
import { stabilizeAmyDecision } from "./stabilize";

/**
 * Machine-readable explanation of keep vs replace.
 * Developer / QA only — not for AI or users.
 */
export function explainDecisionReplacement(
  input: StabilizeAmyDecisionInput,
  options: StabilizeAmyDecisionOptions = {},
): DecisionReplacementExplanation {
  const stable = stabilizeAmyDecision(input, options);
  const previous = input.previousDecision ?? null;
  const current = input.currentDecision;
  const fp = computeStabilityFingerprint(input.context);

  const axes =
    previous != null
      ? compareStabilityAxes({
          previousDecision: previous,
          currentDecision: current,
          currentFingerprint: fp,
          previousStabilityFingerprint: options.previousStabilityFingerprint,
        })
      : null;

  return Object.freeze({
    replaced:
      stable.stabilityState === "REPLACED" ||
      stable.stabilityState === "EXPIRED" ||
      stable.stabilityState === "INVALIDATED" ||
      stable.stabilityState === "NEW",
    changeReason: stable.changeReason,
    stabilityReasonCodes: stable.stabilityReasonCodes,
    previousDecisionId: stable.previousDecisionId,
    currentDecisionId: stable.currentDecisionId,
    previousPrimary: previous?.primaryExperience.experienceId ?? null,
    currentPrimary: stable.decision.primaryExperience.experienceId,
    fingerprintChanged: axes ? !axes.fingerprintSame : true,
    outcomeChanged: axes ? !axes.outcomeSame : true,
    policyChanged: axes ? !axes.policyVersionSame : false,
    primaryChanged: axes ? !axes.primarySame : true,
    secondaryChanged: axes ? !axes.secondarySame : true,
    passiveChanged: axes ? !axes.passiveSame : true,
    allAxesSame: axes?.allAxesSame ?? false,
    stabilityToken: stable.stabilityToken,
    detailCodes: stable.stabilityReasonCodes,
  });
}
