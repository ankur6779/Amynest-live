/**
 * stabilizeAmyDecision — pure Stability Engine.
 * Never creates decisions. Only keep vs replace.
 */

import { freezeDeep } from "../freeze";
import type { AmyDecision } from "../types";
import { validateAmyDecision } from "../validate";
import { compareStabilityAxes } from "./compare-axes";
import { computeStabilityFingerprint } from "./fingerprint";
import { computeStabilityTokenForDecision } from "./token";
import type {
  AmyStabilityReasonCode,
  StabilizeAmyDecisionInput,
  StabilizeAmyDecisionOptions,
  StabilityAxisComparison,
  StableDecisionResult,
} from "./types";

function detectReasonCodes(
  previous: AmyDecision | null | undefined,
  current: AmyDecision,
  axes: StabilityAxisComparison | null,
): AmyStabilityReasonCode[] {
  const codes: AmyStabilityReasonCode[] = [];
  if (!previous) {
    codes.push("NO_PREVIOUS");
    return codes;
  }
  if (!axes) return codes;

  if (axes.fingerprintMissing) codes.push("FINGERPRINT_MISSING");
  else if (axes.fingerprintSame) codes.push("FINGERPRINT_UNCHANGED");
  else codes.push("FINGERPRINT_CHANGED");

  if (!axes.policyVersionSame) codes.push("POLICY_UPDATED");
  if (!axes.primarySame) codes.push("PRIMARY_CHANGED");
  if (!axes.secondarySame) codes.push("SECONDARY_CHANGED");
  if (!axes.passiveSame) codes.push("PASSIVE_CHANGED");
  if (!axes.outcomeSame) codes.push("OUTCOME_CHANGED");
  if (axes.allAxesSame) codes.push("AXES_UNCHANGED");

  const prevReasons = new Set(previous.reasonCodes);
  const curReasons = new Set(current.reasonCodes);

  if (!prevReasons.has("MISSION_COMPLETE") && curReasons.has("MISSION_COMPLETE")) {
    codes.push("MISSION_COMPLETED");
  }
  if (
    prevReasons.has("MISSION_COMPLETE") &&
    curReasons.has("MISSION_INCOMPLETE")
  ) {
    codes.push("MISSION_RESET");
  }
  if (!prevReasons.has("COACH_ACTIVE") && curReasons.has("COACH_ACTIVE")) {
    codes.push("COACH_STARTED");
  }
  if (
    (prevReasons.has("COACH_ACTIVE") || prevReasons.has("COACH_PREPARED")) &&
    curReasons.has("COACH_NONE")
  ) {
    codes.push("COACH_COMPLETED");
  }
  if (!prevReasons.has("COACH_PAUSED") && curReasons.has("COACH_PAUSED")) {
    codes.push("COACH_PAUSED");
  }
  if (!prevReasons.has("COACH_PREPARED") && curReasons.has("COACH_PREPARED")) {
    codes.push("COACH_PREPARED");
  }
  if (
    prevReasons.has("NO_CHALLENGE") !== curReasons.has("NO_CHALLENGE") ||
    prevReasons.has("CHALLENGE_PRESENT") !== curReasons.has("CHALLENGE_PRESENT")
  ) {
    codes.push("CHALLENGE_CHANGED");
  }
  if (
    prevReasons.has("SPEECH_CONCERN") !== curReasons.has("SPEECH_CONCERN") ||
    prevReasons.has("SPEECH_PRIORITY") !== curReasons.has("SPEECH_PRIORITY")
  ) {
    codes.push("SPEECH_STATUS_CHANGED");
  }
  if (
    prevReasons.has("PREMIUM_UNLOCKED") !== curReasons.has("PREMIUM_UNLOCKED") ||
    prevReasons.has("PREMIUM_ELIGIBLE") !== curReasons.has("PREMIUM_ELIGIBLE") ||
    prevReasons.has("PREMIUM_LOCKED") !== curReasons.has("PREMIUM_LOCKED")
  ) {
    codes.push("PREMIUM_CAPABILITY_CHANGED");
  }
  if (
    curReasons.has("UNKNOWN_CAPABILITY") &&
    !prevReasons.has("UNKNOWN_CAPABILITY")
  ) {
    codes.push("UNKNOWN_CAPABILITY_SHIFT");
  }
  if (
    !axes.fingerprintSame &&
    previous.contextVersion !== current.contextVersion &&
    !codes.some((c) =>
      [
        "MISSION_COMPLETED",
        "MISSION_RESET",
        "COACH_STARTED",
        "COACH_COMPLETED",
        "COACH_PAUSED",
        "COACH_PREPARED",
        "CHALLENGE_CHANGED",
        "SPEECH_STATUS_CHANGED",
        "PREMIUM_CAPABILITY_CHANGED",
        "POLICY_UPDATED",
      ].includes(c),
    )
  ) {
    codes.push("AGE_CHANGED");
  }

  return codes;
}

function pickPrimaryChangeReason(
  codes: AmyStabilityReasonCode[],
  state: StableDecisionResult["stabilityState"],
): AmyStabilityReasonCode {
  if (state === "NEW") return "NO_PREVIOUS";
  if (state === "EXPIRED") return "EXPIRED";
  if (state === "INVALIDATED") return "DECISION_INVALID";
  if (state === "UNCHANGED") {
    if (codes.includes("AXES_UNCHANGED")) return "AXES_UNCHANGED";
    if (codes.includes("FINGERPRINT_UNCHANGED")) return "FINGERPRINT_UNCHANGED";
    return "NONE";
  }
  const priority: AmyStabilityReasonCode[] = [
    "POLICY_UPDATED",
    "MISSION_COMPLETED",
    "MISSION_RESET",
    "COACH_STARTED",
    "COACH_COMPLETED",
    "COACH_PAUSED",
    "COACH_PREPARED",
    "CHALLENGE_CHANGED",
    "AGE_CHANGED",
    "SPEECH_STATUS_CHANGED",
    "PREMIUM_CAPABILITY_CHANGED",
    "PRIMARY_CHANGED",
    "SECONDARY_CHANGED",
    "PASSIVE_CHANGED",
    "OUTCOME_CHANGED",
    "FINGERPRINT_CHANGED",
    "FINGERPRINT_MISSING",
    "UNKNOWN_CAPABILITY_SHIFT",
  ];
  for (const code of priority) {
    if (codes.includes(code)) return code;
  }
  return "OUTCOME_CHANGED";
}

function buildResult(args: {
  decision: AmyDecision;
  state: StableDecisionResult["stabilityState"];
  codes: AmyStabilityReasonCode[];
  previousDecisionId: string | null;
  currentDecisionId: string;
  evaluatedAt: string;
  fingerprint: string;
  stabilityToken: string;
}): StableDecisionResult {
  const changeReason = pickPrimaryChangeReason(args.codes, args.state);
  const reasonCodes =
    args.codes.length > 0 ? args.codes : ([changeReason] as AmyStabilityReasonCode[]);
  return freezeDeep({
    decision: args.decision,
    stabilityState: args.state,
    changeReason,
    stabilityReasonCodes: Object.freeze([...reasonCodes]),
    previousDecisionId: args.previousDecisionId,
    currentDecisionId: args.currentDecisionId,
    policyVersion: args.decision.policyVersion,
    evaluatedAt: args.evaluatedAt,
    stabilityFingerprint: args.fingerprint,
    stabilityToken: args.stabilityToken,
  });
}

/**
 * Decide whether Amy should keep the previous Decision or adopt the current one.
 * Does not call createAmyDecision — candidate must be supplied.
 *
 * UNCHANGED requires all axes:
 * fingerprint · policyVersion · primary · secondary · passive · outcome
 */
export function stabilizeAmyDecision(
  input: StabilizeAmyDecisionInput,
  options: StabilizeAmyDecisionOptions = {},
): StableDecisionResult {
  const now = options.now ?? new Date();
  const evaluatedAt = now.toISOString();
  const { context, currentDecision, previousDecision } = input;
  const fingerprint = computeStabilityFingerprint(context);

  const currentValid = validateAmyDecision(currentDecision);
  if (!currentValid.ok) {
    return buildResult({
      decision: currentDecision,
      state: "INVALIDATED",
      codes: ["DECISION_INVALID"],
      previousDecisionId: previousDecision?.decisionId ?? null,
      currentDecisionId: currentDecision.decisionId,
      evaluatedAt,
      fingerprint,
      stabilityToken: computeStabilityTokenForDecision(currentDecision, fingerprint),
    });
  }

  if (!previousDecision) {
    return buildResult({
      decision: currentDecision,
      state: "NEW",
      codes: ["NO_PREVIOUS"],
      previousDecisionId: null,
      currentDecisionId: currentDecision.decisionId,
      evaluatedAt,
      fingerprint,
      stabilityToken: computeStabilityTokenForDecision(currentDecision, fingerprint),
    });
  }

  const previousValid = validateAmyDecision(previousDecision);
  if (!previousValid.ok) {
    return buildResult({
      decision: currentDecision,
      state: "INVALIDATED",
      codes: ["DECISION_INVALID"],
      previousDecisionId: previousDecision.decisionId,
      currentDecisionId: currentDecision.decisionId,
      evaluatedAt,
      fingerprint,
      stabilityToken: computeStabilityTokenForDecision(currentDecision, fingerprint),
    });
  }

  const expiresAt = options.previousExpiresAt;
  if (expiresAt && Date.parse(expiresAt) <= now.getTime()) {
    return buildResult({
      decision: currentDecision,
      state: "EXPIRED",
      codes: ["EXPIRED"],
      previousDecisionId: previousDecision.decisionId,
      currentDecisionId: currentDecision.decisionId,
      evaluatedAt,
      fingerprint,
      stabilityToken: computeStabilityTokenForDecision(currentDecision, fingerprint),
    });
  }

  const axes = compareStabilityAxes({
    previousDecision,
    currentDecision,
    currentFingerprint: fingerprint,
    previousStabilityFingerprint: options.previousStabilityFingerprint,
  });

  const codes = detectReasonCodes(previousDecision, currentDecision, axes);

  // Policy axis alone forces replace when policyVersion/policyId differ.
  if (!axes.policyVersionSame) {
    if (!codes.includes("POLICY_UPDATED")) codes.push("POLICY_UPDATED");
    return buildResult({
      decision: currentDecision,
      state: "REPLACED",
      codes,
      previousDecisionId: previousDecision.decisionId,
      currentDecisionId: currentDecision.decisionId,
      evaluatedAt,
      fingerprint,
      stabilityToken: computeStabilityTokenForDecision(currentDecision, fingerprint),
    });
  }

  // Keep only when every required axis matches (never outcome alone).
  if (axes.allAxesSame) {
    const preservedToken =
      typeof options.previousStabilityToken === "string" &&
      options.previousStabilityToken.length > 0
        ? options.previousStabilityToken
        : computeStabilityTokenForDecision(previousDecision, fingerprint);

    return buildResult({
      decision: previousDecision,
      state: "UNCHANGED",
      codes,
      previousDecisionId: previousDecision.decisionId,
      currentDecisionId: previousDecision.decisionId,
      evaluatedAt,
      fingerprint,
      stabilityToken: preservedToken,
    });
  }

  return buildResult({
    decision: currentDecision,
    state: "REPLACED",
    codes,
    previousDecisionId: previousDecision.decisionId,
    currentDecisionId: currentDecision.decisionId,
    evaluatedAt,
    fingerprint,
    stabilityToken: computeStabilityTokenForDecision(currentDecision, fingerprint),
  });
}
