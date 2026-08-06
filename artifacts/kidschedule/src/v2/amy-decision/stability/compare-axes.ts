/**
 * Multi-axis Stability comparison (P0).
 * UNCHANGED requires every axis — never outcome alone.
 */

import type { AmyDecision } from "../types";
import { decisionOutcomeKey, outcomesEqual } from "./fingerprint";
import type { StabilityAxisComparison } from "./types";

export function compareStabilityAxes(args: {
  previousDecision: AmyDecision;
  currentDecision: AmyDecision;
  currentFingerprint: string;
  previousStabilityFingerprint?: string | null;
}): StabilityAxisComparison {
  const {
    previousDecision,
    currentDecision,
    currentFingerprint,
    previousStabilityFingerprint,
  } = args;

  const fingerprintMissing =
    typeof previousStabilityFingerprint !== "string" ||
    previousStabilityFingerprint.length === 0;

  const fingerprintSame =
    !fingerprintMissing && previousStabilityFingerprint === currentFingerprint;

  const policyVersionSame =
    previousDecision.policyVersion === currentDecision.policyVersion &&
    previousDecision.policyId === currentDecision.policyId;

  const primarySame =
    previousDecision.primaryExperience.experienceId ===
    currentDecision.primaryExperience.experienceId;

  const secondarySame =
    (previousDecision.secondaryExperience?.experienceId ?? null) ===
    (currentDecision.secondaryExperience?.experienceId ?? null);

  const passiveSame =
    (previousDecision.passiveExperience?.experienceId ?? null) ===
    (currentDecision.passiveExperience?.experienceId ?? null);

  const outcomeSame = outcomesEqual(
    decisionOutcomeKey(previousDecision),
    decisionOutcomeKey(currentDecision),
  );

  const allAxesSame =
    fingerprintSame &&
    policyVersionSame &&
    primarySame &&
    secondarySame &&
    passiveSame &&
    outcomeSame;

  return Object.freeze({
    fingerprintSame,
    policyVersionSame,
    primarySame,
    secondarySame,
    passiveSame,
    outcomeSame,
    allAxesSame,
    fingerprintMissing,
  });
}
