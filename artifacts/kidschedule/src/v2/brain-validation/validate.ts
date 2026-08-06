/**
 * validateBrainPipeline — shape / integrity checks only.
 * Never executes Brain. Never changes Legacy.
 */

import { validateResolvedDecision } from "@/v2/decision-bridge";
import {
  AMY_BRAIN_SHADOW_VERSION,
  AMY_BRAIN_VALIDATION_VERSION,
  type BrainPipelineValidationResult,
  type BrainValidationReport,
  type RunBrainValidationInput,
} from "./types";

/**
 * Validate that a ResolvedDecision (+ optional report) is structurally sound
 * for shadow comparison. Does not run the Brain pipeline.
 */
export function validateBrainPipeline(
  input: RunBrainValidationInput | { report: BrainValidationReport },
): BrainPipelineValidationResult {
  const issues: { path: string; message: string }[] = [];

  if ("report" in input && input.report) {
    const r = input.report;
    if (r.brainVersion !== AMY_BRAIN_SHADOW_VERSION) {
      issues.push({ path: "report.brainVersion", message: "unexpected version" });
    }
    if (r.validationVersion !== AMY_BRAIN_VALIDATION_VERSION) {
      issues.push({
        path: "report.validationVersion",
        message: "unexpected version",
      });
    }
    if (typeof r.validationId !== "string" || !r.validationId) {
      issues.push({ path: "report.validationId", message: "required" });
    }
    if (!r.comparison || !Array.isArray(r.comparison.entries)) {
      issues.push({ path: "report.comparison", message: "required" });
    }
    if (
      r.status !== "MATCH" &&
      r.status !== "PARTIAL_MATCH" &&
      r.status !== "MISMATCH" &&
      r.status !== "UNKNOWN"
    ) {
      issues.push({ path: "report.status", message: "invalid status" });
    }
    if (!Array.isArray(r.warnings)) {
      issues.push({ path: "report.warnings", message: "required array" });
    }
    if (!Array.isArray(r.recommendations)) {
      issues.push({ path: "report.recommendations", message: "required array" });
    }
    return Object.freeze({
      ok: issues.length === 0,
      issues: Object.freeze(issues),
    });
  }

  const runInput = input as RunBrainValidationInput;
  if (!runInput.legacy || typeof runInput.legacy !== "object") {
    issues.push({ path: "legacy", message: "required" });
  } else {
    if (typeof runInput.legacy.legacyId !== "string" || !runInput.legacy.legacyId) {
      issues.push({ path: "legacy.legacyId", message: "required" });
    }
    if (!runInput.legacy.primary) {
      issues.push({ path: "legacy.primary", message: "required" });
    }
  }

  if (!runInput.resolved) {
    issues.push({ path: "resolved", message: "required" });
  } else {
    const bridge = validateResolvedDecision(runInput.resolved);
    if (!bridge.ok) {
      for (const issue of bridge.issues) {
        issues.push({
          path: `resolved.${issue.path}`,
          message: issue.message,
        });
      }
    }
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
