/**
 * validateAmyDecisionPolicy — developer / QA only.
 */

import { AMY_EXPERIENCE, type AmyDecisionPolicy, type AmyExperienceId } from "./policy";
import type { AmyDecisionValidationResult } from "./types";

const KNOWN = new Set<string>(Object.values(AMY_EXPERIENCE));

function issue(path: string, message: string) {
  return { path, message };
}

function checkList(
  name: string,
  list: readonly AmyExperienceId[] | undefined,
  issues: { path: string; message: string }[],
  requireNonEmpty: boolean,
): void {
  if (!Array.isArray(list)) {
    issues.push(issue(name, "must be an array"));
    return;
  }
  if (requireNonEmpty && list.length === 0) {
    issues.push(issue(name, "must not be empty"));
  }
  const seen = new Set<string>();
  for (let i = 0; i < list.length; i++) {
    const id = list[i];
    if (typeof id !== "string" || !KNOWN.has(id)) {
      issues.push(issue(`${name}[${i}]`, `invalid experience id: ${String(id)}`));
      continue;
    }
    if (seen.has(id)) {
      issues.push(issue(`${name}[${i}]`, `duplicate experience: ${id}`));
    }
    seen.add(id);
  }
}

/**
 * Checks duplicate priorities, missing Hero, invalid ids,
 * duplicate experiences, invalid ordering.
 */
export function validateAmyDecisionPolicy(
  policy: unknown,
): AmyDecisionValidationResult {
  const issues: { path: string; message: string }[] = [];
  if (!policy || typeof policy !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([issue("", "policy must be an object")]),
    });
  }
  const p = policy as Partial<AmyDecisionPolicy>;

  if (typeof p.policyId !== "string" || !p.policyId) {
    issues.push(issue("policyId", "required string"));
  }
  if (typeof p.policyVersion !== "string" || !p.policyVersion) {
    issues.push(issue("policyVersion", "required string"));
  }
  if (!p.reasonWeights || typeof p.reasonWeights !== "object") {
    issues.push(issue("reasonWeights", "required object"));
  }

  checkList("heroPriority", p.heroPriority, issues, true);
  checkList("secondaryPriority", p.secondaryPriority, issues, true);
  checkList("passivePriority", p.passivePriority, issues, true);

  if (Array.isArray(p.heroPriority) && p.heroPriority.length > 0) {
    // Hero list must include wedge (index 0) and not place treasury before wedge.
    const wedge = p.heroPriority[0];
    if (wedge === AMY_EXPERIENCE.FOR_CHILD) {
      issues.push(
        issue("heroPriority", "invalid ordering: treasury cannot be Hero wedge"),
      );
    }
  }

  // Cross-list: same experience must not appear twice as conflicting slot heads
  // when it is the sole entry in two different priority lists at index 0.
  if (
    p.heroPriority?.[0] &&
    p.secondaryPriority?.[0] &&
    p.heroPriority[0] === p.secondaryPriority[0]
  ) {
    issues.push(
      issue(
        "secondaryPriority",
        "duplicate priorities: hero and secondary heads must differ",
      ),
    );
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
