import { freezeDeep } from "../freeze";
import { evaluatePolicyAgainstFacts } from "./policy";
import {
  AMY_DECISION_COOLDOWN_VERSION,
  type DecisionCooldownEntry,
  type DecisionCooldownFacts,
  type DecisionCooldownResult,
} from "./types";

export function noneCooldownResult(experienceId: string): DecisionCooldownResult {
  return freezeDeep({
    experienceId,
    cooldownState: "NONE",
    cooldownPolicy: null,
    startedAt: null,
    expiresAt: null,
    dismissCount: 0,
    eligibleAgain: true,
    cooldownReason: "NO_COOLDOWN",
    cooldownVersion: AMY_DECISION_COOLDOWN_VERSION,
  });
}

export function resultFromEntry(
  entry: DecisionCooldownEntry,
  facts: DecisionCooldownFacts,
  now: Date,
): DecisionCooldownResult {
  const evaled = evaluatePolicyAgainstFacts(entry, facts, now);
  return freezeDeep({
    experienceId: entry.experienceId,
    cooldownState: evaled.state,
    cooldownPolicy: entry.cooldownPolicy,
    startedAt: entry.startedAt,
    expiresAt: evaled.expiresAt,
    dismissCount: entry.dismissCount,
    eligibleAgain: evaled.eligibleAgain,
    cooldownReason: evaled.reason,
    cooldownVersion: AMY_DECISION_COOLDOWN_VERSION,
  });
}
