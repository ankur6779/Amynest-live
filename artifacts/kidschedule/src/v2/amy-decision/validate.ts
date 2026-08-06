import {
  AMY_DECISION_VERSION,
  AMY_EXPERIENCE,
  MVP_SPEECH_WEDGE_POLICY,
  type AmyExperienceId,
} from "./policy";
import { AMY_REASON_CODES, type AmyReasonCode } from "./reason-codes";
import type {
  AmyDecision,
  AmyDecisionValidationIssue,
  AmyDecisionValidationResult,
} from "./types";

const EXPERIENCE_SET = new Set<string>(Object.values(AMY_EXPERIENCE));
const REASON_SET = new Set<string>(AMY_REASON_CODES);

function issue(path: string, message: string): AmyDecisionValidationIssue {
  return { path, message };
}

function isExperienceId(id: unknown): id is AmyExperienceId {
  return typeof id === "string" && EXPERIENCE_SET.has(id);
}

/** Structural + policy validation — no UI rules. */
export function validateAmyDecision(
  decision: unknown,
): AmyDecisionValidationResult {
  const issues: AmyDecisionValidationIssue[] = [];
  if (!decision || typeof decision !== "object") {
    return {
      ok: false,
      issues: [issue("", "AmyDecision must be an object")],
    };
  }
  const d = decision as Partial<AmyDecision>;

  if (d.decisionVersion !== AMY_DECISION_VERSION) {
    issues.push(issue("decisionVersion", `expected ${AMY_DECISION_VERSION}`));
  }
  if (typeof d.policyVersion !== "string" || !d.policyVersion) {
    issues.push(issue("policyVersion", "required string"));
  }
  if (typeof d.policyId !== "string" || !d.policyId) {
    issues.push(issue("policyId", "required string"));
  }
  if (typeof d.decisionId !== "string" || !d.decisionId.startsWith("dec_")) {
    issues.push(issue("decisionId", "must be dec_* string"));
  }
  if (typeof d.contextVersion !== "string") {
    issues.push(issue("contextVersion", "must be string"));
  }
  if (typeof d.generatedAt !== "string") {
    issues.push(issue("generatedAt", "must be string"));
  }
  if (!["HIGH", "MEDIUM", "LOW", "UNKNOWN"].includes(d.confidence as string)) {
    issues.push(issue("confidence", "invalid"));
  }
  if (d.state !== "computed") {
    issues.push(issue("state", "expected computed"));
  }
  if (!Array.isArray(d.reasonCodes) || d.reasonCodes.length === 0) {
    issues.push(issue("reasonCodes", "must be non-empty array"));
  } else {
    for (const code of d.reasonCodes) {
      if (!REASON_SET.has(code as AmyReasonCode)) {
        issues.push(issue("reasonCodes", `unknown code ${String(code)}`));
      }
    }
  }

  if (!d.primaryExperience || !isExperienceId(d.primaryExperience.experienceId)) {
    issues.push(issue("primaryExperience", "invalid experienceId"));
  } else if (
    !MVP_SPEECH_WEDGE_POLICY.heroPriority.includes(d.primaryExperience.experienceId) &&
    d.policyId === MVP_SPEECH_WEDGE_POLICY.policyId
  ) {
    issues.push(issue("primaryExperience", "not in active policy heroPriority"));
  }

  if (
    d.secondaryExperience != null &&
    !isExperienceId(d.secondaryExperience.experienceId)
  ) {
    issues.push(issue("secondaryExperience", "invalid experienceId"));
  }
  if (
    d.passiveExperience != null &&
    !isExperienceId(d.passiveExperience.experienceId)
  ) {
    issues.push(issue("passiveExperience", "invalid experienceId"));
  }

  for (const key of [
    "recommendedToolIds",
    "recommendedFeatureIds",
    "recommendedRouteIds",
  ] as const) {
    if (!Array.isArray(d[key])) {
      issues.push(issue(key, "must be array"));
    }
  }

  // Forbidden UI / shell leakage
  for (const key of ["label", "title", "href", "component", "heroCard"]) {
    if (key in (d as object)) {
      issues.push(issue(key, "forbidden UI field"));
    }
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
