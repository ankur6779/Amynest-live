import { verifyHistoryHash } from "./history-hash";
import { AMY_DECISION_HISTORY_VERSION } from "./types";
import type {
  DecisionHistoryDocument,
  DecisionHistoryRecord,
  DecisionHistoryValidationResult,
} from "./types";

const OUTCOMES = new Set(["NEW", "REPLACED", "EXPIRED", "INVALIDATED"]);

function validateRecord(
  record: unknown,
  path: string,
): DecisionHistoryValidationResult["issues"][number][] {
  const issues: { path: string; message: string }[] = [];
  if (!record || typeof record !== "object") {
    return [{ path, message: "record must be an object" }];
  }
  const r = record as Partial<DecisionHistoryRecord>;
  if (typeof r.historyId !== "string" || !r.historyId.startsWith("hist_")) {
    issues.push({ path: `${path}.historyId`, message: "required hist_* id" });
  }
  if (typeof r.decisionId !== "string" || !r.decisionId) {
    issues.push({ path: `${path}.decisionId`, message: "required" });
  }
  if (typeof r.stabilityToken !== "string" || !r.stabilityToken.startsWith("stabtok_")) {
    issues.push({ path: `${path}.stabilityToken`, message: "required stabtok_*" });
  }
  if (typeof r.decisionVersion !== "string") {
    issues.push({ path: `${path}.decisionVersion`, message: "required" });
  }
  if (typeof r.policyId !== "string") {
    issues.push({ path: `${path}.policyId`, message: "required" });
  }
  if (typeof r.policyVersion !== "string") {
    issues.push({ path: `${path}.policyVersion`, message: "required" });
  }
  if (typeof r.contextVersion !== "string") {
    issues.push({ path: `${path}.contextVersion`, message: "required" });
  }
  if (!r.primaryExperience || typeof r.primaryExperience.experienceId !== "string") {
    issues.push({ path: `${path}.primaryExperience`, message: "required" });
  }
  if (!Array.isArray(r.reasonCodes)) {
    issues.push({ path: `${path}.reasonCodes`, message: "required array" });
  }
  if (!Array.isArray(r.stabilityReasonCodes)) {
    issues.push({ path: `${path}.stabilityReasonCodes`, message: "required array" });
  }
  if (typeof r.confidence !== "string") {
    issues.push({ path: `${path}.confidence`, message: "required" });
  }
  if (typeof r.recordedAt !== "string") {
    issues.push({ path: `${path}.recordedAt`, message: "required" });
  }
  if (!OUTCOMES.has(r.outcomeState as string)) {
    issues.push({ path: `${path}.outcomeState`, message: "invalid outcome" });
  }
  if (r.previousHistoryId != null && typeof r.previousHistoryId !== "string") {
    issues.push({ path: `${path}.previousHistoryId`, message: "string or null" });
  }
  if (r.replacedByHistoryId != null && typeof r.replacedByHistoryId !== "string") {
    issues.push({ path: `${path}.replacedByHistoryId`, message: "string or null" });
  }
  if (typeof r.historyHash !== "string" || !r.historyHash.startsWith("histhash_")) {
    issues.push({ path: `${path}.historyHash`, message: "required histhash_*" });
  } else if (!verifyHistoryHash(r as DecisionHistoryRecord)) {
    issues.push({
      path: `${path}.historyHash`,
      message: "integrity hash mismatch (corruption)",
    });
  }
  return issues;
}

/**
 * Validate DecisionHistoryDocument or a single record.
 * Includes historyHash integrity checks.
 */
export function validateDecisionHistory(
  value: unknown,
): DecisionHistoryValidationResult {
  const issues: { path: string; message: string }[] = [];
  if (!value || typeof value !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ path: "", message: "must be an object" }]),
    });
  }

  // Single record?
  if ("historyId" in value && !("records" in value)) {
    const recordIssues = validateRecord(value, "record");
    return Object.freeze({
      ok: recordIssues.length === 0,
      issues: Object.freeze(recordIssues),
    });
  }

  const doc = value as Partial<DecisionHistoryDocument>;
  if (typeof doc.schemaVersion !== "string") {
    issues.push({ path: "schemaVersion", message: "required" });
  }
  if (!Array.isArray(doc.records)) {
    issues.push({ path: "records", message: "required array" });
  } else {
    const ids = new Set<string>();
    for (let i = 0; i < doc.records.length; i++) {
      const r = doc.records[i];
      issues.push(...validateRecord(r, `records[${i}]`));
      if (r && typeof r === "object" && typeof (r as DecisionHistoryRecord).historyId === "string") {
        const id = (r as DecisionHistoryRecord).historyId;
        if (ids.has(id)) {
          issues.push({ path: `records[${i}].historyId`, message: "duplicate historyId" });
        }
        ids.add(id);
      }
    }
    if (
      doc.currentHistoryId != null &&
      typeof doc.currentHistoryId === "string" &&
      !ids.has(doc.currentHistoryId)
    ) {
      issues.push({
        path: "currentHistoryId",
        message: "must reference an existing record",
      });
    }
  }
  if (doc.currentHistoryId != null && typeof doc.currentHistoryId !== "string") {
    issues.push({ path: "currentHistoryId", message: "string or null" });
  }
  if (typeof doc.updatedAt !== "string") {
    issues.push({ path: "updatedAt", message: "required" });
  }

  // Soft check known schema
  if (
    typeof doc.schemaVersion === "string" &&
    doc.schemaVersion !== AMY_DECISION_HISTORY_VERSION &&
    !doc.schemaVersion.startsWith("amy_decision_history.")
  ) {
    issues.push({ path: "schemaVersion", message: "unknown schema family" });
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
