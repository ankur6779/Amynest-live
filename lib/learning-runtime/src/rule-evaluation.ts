import { evaluateCondition } from "./conditions.js";
import type { RuleContext, RuntimeRule } from "./types.js";
import type { RuleFireResult } from "./rules.js";

export type RuleSkipReason =
  | { ruleId: string; priority: number; reason: "feature_flag_off"; flag: string }
  | {
      ruleId: string;
      priority: number;
      reason: "cooldown";
      remainingMs: number;
    }
  | { ruleId: string; priority: number; reason: "condition_false" }
  | {
      ruleId: string;
      priority: number;
      reason: "dependency_unmet";
      missing: string[];
    };

export type DetailedRuleEvaluation = {
  matched: RuleFireResult[];
  skipped: RuleSkipReason[];
};

/**
 * Full rule evaluation with skip reasons — used by the Runtime Inspector.
 * Production hot path should call `evaluateRules` instead (no skip bookkeeping).
 */
export function evaluateRulesDetailed(
  rules: RuntimeRule[],
  ctx: RuleContext,
): DetailedRuleEvaluation {
  const ordered = [...rules].sort((a, b) => b.priority - a.priority);
  const matched: RuleFireResult[] = [];
  const matchedIds = new Set<string>();
  const skipped: RuleSkipReason[] = [];
  const whenPassed = new Set<string>();

  for (const rule of ordered) {
    if (rule.featureFlag) {
      const enabled = ctx.featureFlags[rule.featureFlag];
      if (enabled === false) {
        skipped.push({
          ruleId: rule.id,
          priority: rule.priority,
          reason: "feature_flag_off",
          flag: rule.featureFlag,
        });
        continue;
      }
    }

    if (rule.cooldownMs && rule.cooldownMs > 0) {
      const last = ctx.state.ruleCooldowns[rule.id];
      if (last != null && ctx.nowMs - last < rule.cooldownMs) {
        skipped.push({
          ruleId: rule.id,
          priority: rule.priority,
          reason: "cooldown",
          remainingMs: rule.cooldownMs - (ctx.nowMs - last),
        });
        continue;
      }
    }

    if (!evaluateCondition(rule.when, ctx)) {
      skipped.push({
        ruleId: rule.id,
        priority: rule.priority,
        reason: "condition_false",
      });
      continue;
    }

    whenPassed.add(rule.id);
    matchedIds.add(rule.id);
    matched.push({
      ruleId: rule.id,
      priority: rule.priority,
      patch: rule.then,
    });
  }

  const kept: RuleFireResult[] = [];
  for (const fire of matched) {
    const rule = rules.find((r) => r.id === fire.ruleId);
    if (!rule?.dependsOn?.length) {
      kept.push(fire);
      continue;
    }
    const missing = rule.dependsOn.filter((id) => !whenPassed.has(id));
    if (missing.length) {
      matchedIds.delete(fire.ruleId);
      skipped.push({
        ruleId: fire.ruleId,
        priority: fire.priority,
        reason: "dependency_unmet",
        missing,
      });
      continue;
    }
    kept.push(fire);
  }

  return { matched: kept, skipped };
}
