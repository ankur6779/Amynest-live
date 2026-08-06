import { validateAmyDecision } from "../validate";
import type {
  DecisionStabilityValidationResult,
  StableDecisionResult,
} from "./types";

const STATES = new Set([
  "NEW",
  "UNCHANGED",
  "REPLACED",
  "INVALIDATED",
  "EXPIRED",
]);

/**
 * Validate StableDecisionResult shape — no UI rules.
 */
export function validateDecisionStability(
  result: unknown,
): DecisionStabilityValidationResult {
  const issues: { path: string; message: string }[] = [];
  if (!result || typeof result !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ path: "", message: "result must be an object" }]),
    });
  }
  const r = result as Partial<StableDecisionResult>;

  if (!STATES.has(r.stabilityState as string)) {
    issues.push({ path: "stabilityState", message: "invalid state" });
  }
  if (typeof r.changeReason !== "string" || !r.changeReason) {
    issues.push({ path: "changeReason", message: "required" });
  }
  if (!Array.isArray(r.stabilityReasonCodes) || r.stabilityReasonCodes.length === 0) {
    issues.push({
      path: "stabilityReasonCodes",
      message: "required non-empty array",
    });
  }
  if (typeof r.currentDecisionId !== "string") {
    issues.push({ path: "currentDecisionId", message: "required" });
  }
  if (r.previousDecisionId != null && typeof r.previousDecisionId !== "string") {
    issues.push({ path: "previousDecisionId", message: "must be string or null" });
  }
  if (typeof r.policyVersion !== "string") {
    issues.push({ path: "policyVersion", message: "required" });
  }
  if (typeof r.evaluatedAt !== "string") {
    issues.push({ path: "evaluatedAt", message: "required" });
  }
  if (typeof r.stabilityFingerprint !== "string" || !r.stabilityFingerprint) {
    issues.push({ path: "stabilityFingerprint", message: "required" });
  }
  if (typeof r.stabilityToken !== "string" || !r.stabilityToken.startsWith("stabtok_")) {
    issues.push({ path: "stabilityToken", message: "required stabtok_* token" });
  }
  if (!r.decision) {
    issues.push({ path: "decision", message: "required" });
  } else {
    const dec = validateAmyDecision(r.decision);
    if (!dec.ok) {
      for (const i of dec.issues) {
        issues.push({ path: `decision.${i.path}`, message: i.message });
      }
    }
  }

  if (r.stabilityState === "UNCHANGED" && r.previousDecisionId != null) {
    if (r.currentDecisionId !== r.previousDecisionId) {
      issues.push({
        path: "currentDecisionId",
        message: "UNCHANGED must keep previous decisionId",
      });
    }
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
