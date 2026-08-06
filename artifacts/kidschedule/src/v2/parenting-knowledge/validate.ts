/**
 * validateKnowledge — shape / ID contract checks for KnowledgeDefinition.
 * Pure. No Brain. No AI. No ownership.
 */

import { freezeKnowledge } from "./freeze";
import type {
  KnowledgeDefinition,
  KnowledgeValidationResult,
} from "./types";

const ID_ARRAY_FIELDS = [
  "ageBands",
  "rootCauses",
  "understanding",
  "corePrinciples",
  "coachObjectives",
  "recommendedActions",
  "mistakesToAvoid",
  "microTasks",
  "reflectionQuestions",
  "successSignals",
  "relatedProblems",
  "contentIds",
] as const;

function requireNonEmptyId(
  value: unknown,
  path: string,
  issues: { path: string; message: string }[],
): void {
  if (typeof value !== "string" || !value) {
    issues.push({ path, message: "required non-empty id" });
  }
}

function requireIdArray(
  value: unknown,
  path: string,
  issues: { path: string; message: string }[],
): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "required array" });
    return;
  }
  value.forEach((item, i) => {
    requireNonEmptyId(item, `${path}[${i}]`, issues);
  });
}

/** Reject values that look like prose / prompts (heuristic — IDs only). */
function looksLikeProse(value: string): boolean {
  if (value.includes(" ")) return true;
  if (value.length > 96) return true;
  if (/[.!?]$/.test(value) && value.length > 24) return true;
  return false;
}

export function validateKnowledge(
  value: unknown,
): KnowledgeValidationResult {
  const issues: { path: string; message: string }[] = [];

  if (!value || typeof value !== "object") {
    return freezeKnowledge({
      ok: false,
      issues: [{ path: "", message: "must be an object" }],
    });
  }

  const k = value as Partial<KnowledgeDefinition>;

  requireNonEmptyId(k.knowledgeId, "knowledgeId", issues);
  requireNonEmptyId(k.problemId, "problemId", issues);
  requireNonEmptyId(k.difficulty, "difficulty", issues);
  requireNonEmptyId(k.version, "version", issues);

  for (const field of ID_ARRAY_FIELDS) {
    requireIdArray(k[field], field, issues);
  }

  // Structured-data-only guard: no whitespace prose in string fields / array ids.
  const stringFields: Array<keyof KnowledgeDefinition> = [
    "knowledgeId",
    "problemId",
    "difficulty",
    "version",
  ];
  for (const field of stringFields) {
    const v = k[field];
    if (typeof v === "string" && looksLikeProse(v)) {
      issues.push({ path: field, message: "must be an id, not prose" });
    }
  }
  for (const field of ID_ARRAY_FIELDS) {
    const arr = k[field];
    if (!Array.isArray(arr)) continue;
    arr.forEach((item, i) => {
      if (typeof item === "string" && looksLikeProse(item)) {
        issues.push({
          path: `${field}[${i}]`,
          message: "must be an id, not prose",
        });
      }
    });
  }

  return freezeKnowledge({
    ok: issues.length === 0,
    issues,
  });
}
