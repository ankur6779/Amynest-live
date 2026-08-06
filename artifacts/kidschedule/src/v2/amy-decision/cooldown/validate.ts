import { AMY_DECISION_COOLDOWN_VERSION } from "./types";
import type {
  DecisionCooldownDocument,
  DecisionCooldownEntry,
  DecisionCooldownResult,
  DecisionCooldownValidationResult,
} from "./types";

const STATES = new Set(["NONE", "ACTIVE", "EXPIRED", "PERMANENT"]);
const POLICIES = new Set([
  "UNTIL_END_OF_DAY",
  "UNTIL_TOMORROW",
  "UNTIL_CHALLENGE_CHANGES",
  "UNTIL_MISSION_CHANGES",
  "UNTIL_COACH_COMPLETES",
  "PERMANENT_HIDE",
]);

function validateEntry(
  entry: unknown,
  path: string,
): DecisionCooldownValidationResult["issues"][number][] {
  const issues: { path: string; message: string }[] = [];
  if (!entry || typeof entry !== "object") {
    return [{ path, message: "entry must be an object" }];
  }
  const e = entry as Partial<DecisionCooldownEntry>;
  if (typeof e.experienceId !== "string" || !e.experienceId) {
    issues.push({ path: `${path}.experienceId`, message: "required" });
  }
  if (!POLICIES.has(e.cooldownPolicy as string)) {
    issues.push({ path: `${path}.cooldownPolicy`, message: "invalid policy" });
  }
  if (typeof e.startedAt !== "string") {
    issues.push({ path: `${path}.startedAt`, message: "required" });
  }
  if (e.expiresAt != null && typeof e.expiresAt !== "string") {
    issues.push({ path: `${path}.expiresAt`, message: "string or null" });
  }
  if (typeof e.dismissCount !== "number" || e.dismissCount < 1) {
    issues.push({ path: `${path}.dismissCount`, message: "must be >= 1" });
  }
  if (typeof e.cooldownReason !== "string") {
    issues.push({ path: `${path}.cooldownReason`, message: "required" });
  }
  if (typeof e.cooldownVersion !== "string") {
    issues.push({ path: `${path}.cooldownVersion`, message: "required" });
  }
  return issues;
}

function validateResultShape(
  result: unknown,
): DecisionCooldownValidationResult["issues"][number][] {
  const issues: { path: string; message: string }[] = [];
  if (!result || typeof result !== "object") {
    return [{ path: "", message: "result must be an object" }];
  }
  const r = result as Partial<DecisionCooldownResult>;
  if (typeof r.experienceId !== "string") {
    issues.push({ path: "experienceId", message: "required" });
  }
  if (!STATES.has(r.cooldownState as string)) {
    issues.push({ path: "cooldownState", message: "invalid state" });
  }
  if (
    r.cooldownPolicy != null &&
    !POLICIES.has(r.cooldownPolicy as string)
  ) {
    issues.push({ path: "cooldownPolicy", message: "invalid policy" });
  }
  if (typeof r.dismissCount !== "number" || r.dismissCount < 0) {
    issues.push({ path: "dismissCount", message: "must be >= 0" });
  }
  if (typeof r.eligibleAgain !== "boolean") {
    issues.push({ path: "eligibleAgain", message: "required boolean" });
  }
  if (typeof r.cooldownReason !== "string") {
    issues.push({ path: "cooldownReason", message: "required" });
  }
  if (r.cooldownVersion !== AMY_DECISION_COOLDOWN_VERSION) {
    issues.push({ path: "cooldownVersion", message: "unexpected version" });
  }
  return issues;
}

/**
 * Validate DecisionCooldownResult, entry, or document.
 */
export function validateDecisionCooldown(
  value: unknown,
): DecisionCooldownValidationResult {
  if (!value || typeof value !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ path: "", message: "must be an object" }]),
    });
  }

  // Result?
  if ("eligibleAgain" in value && "cooldownState" in value) {
    const issues = validateResultShape(value);
    return Object.freeze({
      ok: issues.length === 0,
      issues: Object.freeze(issues),
    });
  }

  // Entry?
  if ("dismissCount" in value && "cooldownPolicy" in value && !("entries" in value)) {
    const issues = validateEntry(value, "entry");
    return Object.freeze({
      ok: issues.length === 0,
      issues: Object.freeze(issues),
    });
  }

  // Document
  const doc = value as Partial<DecisionCooldownDocument>;
  const issues: { path: string; message: string }[] = [];
  if (typeof doc.schemaVersion !== "string") {
    issues.push({ path: "schemaVersion", message: "required" });
  }
  if (!Array.isArray(doc.entries)) {
    issues.push({ path: "entries", message: "required array" });
  } else {
    const seen = new Set<string>();
    for (let i = 0; i < doc.entries.length; i++) {
      issues.push(...validateEntry(doc.entries[i], `entries[${i}]`));
      const id = (doc.entries[i] as DecisionCooldownEntry | undefined)
        ?.experienceId;
      if (id) {
        if (seen.has(id)) {
          issues.push({
            path: `entries[${i}].experienceId`,
            message: "duplicate experienceId",
          });
        }
        seen.add(id);
      }
    }
  }
  if (typeof doc.updatedAt !== "string") {
    issues.push({ path: "updatedAt", message: "required" });
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
