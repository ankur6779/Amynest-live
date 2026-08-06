/**
 * evaluateDecisionCooldown — pure eligibility report.
 * Never changes Decision, History, Context, or Memory.
 */

import { noneCooldownResult, resultFromEntry } from "./result";
import type {
  DecisionCooldownEntry,
  DecisionCooldownResult,
  EvaluateDecisionCooldownInput,
  EvaluateDecisionCooldownOptions,
} from "./types";

function findEntry(
  store: EvaluateDecisionCooldownInput["store"],
  experienceId: string,
): DecisionCooldownEntry | null {
  return store.entries.find((e) => e.experienceId === experienceId) ?? null;
}

/**
 * Report whether Amy should recommend an experience again.
 * Default experience = StableDecision primary.
 * History is accepted for pipeline completeness (passive — not mutated).
 */
export function evaluateDecisionCooldown(
  input: EvaluateDecisionCooldownInput,
  options: EvaluateDecisionCooldownOptions = {},
): DecisionCooldownResult {
  const now = options.now ?? new Date();
  const experienceId =
    options.experienceId ??
    input.stable.decision.primaryExperience.experienceId;

  // History is intentionally unused for mutation; presence validates pipeline input.
  void input.history;

  const entry = findEntry(input.store, experienceId);
  if (!entry) {
    return noneCooldownResult(experienceId);
  }

  return resultFromEntry(entry, input.facts, now);
}
