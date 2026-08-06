import { AMY_ATTENTION_BUDGET_VERSION } from "./types";
import type {
  AttentionBudgetResult,
  AttentionBudgetValidationResult,
} from "./types";

const STATES = new Set(["VALID", "PARTIAL", "EMPTY"]);

/**
 * Validate AttentionBudgetResult — no UI rules.
 * Enforces max one hero / secondary / passive and no duplicate experienceIds across slots.
 */
export function validateAttentionBudget(
  value: unknown,
): AttentionBudgetValidationResult {
  const issues: { path: string; message: string }[] = [];
  if (!value || typeof value !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ path: "", message: "must be an object" }]),
    });
  }
  const r = value as Partial<AttentionBudgetResult>;

  if (!STATES.has(r.budgetState as string)) {
    issues.push({ path: "budgetState", message: "invalid state" });
  }
  if (r.budgetVersion !== AMY_ATTENTION_BUDGET_VERSION) {
    issues.push({ path: "budgetVersion", message: "unexpected version" });
  }
  if (typeof r.generatedAt !== "string") {
    issues.push({ path: "generatedAt", message: "required" });
  }
  if (!Array.isArray(r.allocationReasonCodes)) {
    issues.push({ path: "allocationReasonCodes", message: "required array" });
  }
  if (!Array.isArray(r.suppressedExperiences)) {
    issues.push({ path: "suppressedExperiences", message: "required array" });
  }
  if (
    !r.allocationTrace ||
    typeof r.allocationTrace !== "object" ||
    (r.allocationTrace as { kind?: string }).kind !==
      "amy_attention_allocation_trace.v1" ||
    !Array.isArray((r.allocationTrace as { steps?: unknown }).steps)
  ) {
    issues.push({
      path: "allocationTrace",
      message: "required amy_attention_allocation_trace.v1",
    });
  }
  if (
    typeof r.attentionCoverage !== "number" ||
    r.attentionCoverage < 0 ||
    r.attentionCoverage > 1
  ) {
    issues.push({
      path: "attentionCoverage",
      message: "must be number in 0.0–1.0",
    });
  }

  const ids: string[] = [];
  if (r.heroExperience) {
    if (typeof r.heroExperience.experienceId !== "string") {
      issues.push({ path: "heroExperience.experienceId", message: "required" });
    } else {
      ids.push(r.heroExperience.experienceId);
    }
  }
  if (r.secondaryExperience) {
    if (typeof r.secondaryExperience.experienceId !== "string") {
      issues.push({
        path: "secondaryExperience.experienceId",
        message: "required",
      });
    } else {
      ids.push(r.secondaryExperience.experienceId);
    }
  }
  if (r.passiveExperience) {
    if (typeof r.passiveExperience.experienceId !== "string") {
      issues.push({
        path: "passiveExperience.experienceId",
        message: "required",
      });
    } else {
      ids.push(r.passiveExperience.experienceId);
    }
  }

  if (new Set(ids).size !== ids.length) {
    issues.push({
      path: "experiences",
      message: "duplicate experienceId across slots",
    });
  }

  // Max one of each slot is inherent in schema (singular fields).
  if (r.budgetState === "EMPTY") {
    if (r.heroExperience || r.secondaryExperience || r.passiveExperience) {
      issues.push({
        path: "budgetState",
        message: "EMPTY must have no allocated experiences",
      });
    }
  }
  if (r.budgetState === "VALID" && !r.heroExperience) {
    issues.push({
      path: "budgetState",
      message: "VALID requires heroExperience",
    });
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
