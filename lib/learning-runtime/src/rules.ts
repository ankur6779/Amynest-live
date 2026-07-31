import { evaluateCondition } from "./conditions.js";
import type {
  DecisionEvidence,
  DecisionPatch,
  RuleContext,
  RuntimeRule,
} from "./types.js";

export type RuleFireResult = {
  ruleId: string;
  priority: number;
  patch: DecisionPatch;
};

/**
 * Evaluate declarative rules against context.
 * Honors priority sort, cooldowns, dependsOn, feature flags.
 *
 * dependsOn uses a two-pass match: first all `when` matches (respecting
 * flags/cooldowns), then dependents are kept only if dependencies matched.
 */
export function evaluateRules(
  rules: RuntimeRule[],
  ctx: RuleContext,
): RuleFireResult[] {
  const ordered = [...rules].sort((a, b) => b.priority - a.priority);
  const matched: RuleFireResult[] = [];
  const matchedIds = new Set<string>();

  for (const rule of ordered) {
    if (rule.featureFlag) {
      const enabled = ctx.featureFlags[rule.featureFlag];
      if (enabled === false) continue;
    }

    if (rule.cooldownMs && rule.cooldownMs > 0) {
      const last = ctx.state.ruleCooldowns[rule.id];
      if (last != null && ctx.nowMs - last < rule.cooldownMs) continue;
    }

    if (!evaluateCondition(rule.when, ctx)) continue;

    matchedIds.add(rule.id);
    matched.push({
      ruleId: rule.id,
      priority: rule.priority,
      patch: rule.then,
    });
  }

  return matched.filter((fire) => {
    const rule = rules.find((r) => r.id === fire.ruleId);
    if (!rule?.dependsOn?.length) return true;
    return rule.dependsOn.every((id) => matchedIds.has(id));
  });
}

/**
 * Merge patches: higher priority wins per field; arrays concatenate uniquely.
 * Primary rule = highest priority fire.
 */
export function mergeDecisionPatches(
  fires: RuleFireResult[],
): {
  patch: DecisionPatch;
  primaryRuleId: string;
  contributingRuleIds: string[];
  evidence: DecisionEvidence[];
  confidence: number;
} {
  if (!fires.length) {
    return {
      patch: {
        reason: "No matching rules — hold steady",
        difficulty: "same",
        hints: "none",
        celebrationLevel: 0,
        narrationLength: "medium",
        breakSuggestion: false,
        rewardPriority: "normal",
        nextActivity: null,
        recommendation: null,
        reviewQueue: [],
      },
      primaryRuleId: "runtime.default_hold",
      contributingRuleIds: ["runtime.default_hold"],
      evidence: [{ key: "fires", value: 0, source: "rule_engine" }],
      confidence: 40,
    };
  }

  const sorted = [...fires].sort((a, b) => b.priority - a.priority);
  const primary = sorted[0]!;
  let difficulty = primary.patch.difficulty;
  let hints = primary.patch.hints;
  let celebrationLevel = primary.patch.celebrationLevel;
  let narrationLength = primary.patch.narrationLength;
  let breakSuggestion = primary.patch.breakSuggestion;
  let rewardPriority = primary.patch.rewardPriority;
  let nextActivity = primary.patch.nextActivity;
  let recommendation = primary.patch.recommendation;
  let reviewQueue = primary.patch.reviewQueue ? [...primary.patch.reviewQueue] : [];
  const reasons: string[] = [];
  const evidence: DecisionEvidence[] = [];
  let confidenceSum = 0;
  let confidenceN = 0;

  // Apply from lowest → highest so highest wins.
  const ascending = [...sorted].reverse();
  for (const fire of ascending) {
    const p = fire.patch;
    reasons.push(p.reason);
    if (p.difficulty != null) difficulty = p.difficulty;
    if (p.hints != null) hints = p.hints;
    if (p.celebrationLevel != null) celebrationLevel = p.celebrationLevel;
    if (p.narrationLength != null) narrationLength = p.narrationLength;
    if (p.breakSuggestion != null) breakSuggestion = p.breakSuggestion;
    if (p.rewardPriority != null) rewardPriority = p.rewardPriority;
    if (p.nextActivity !== undefined) nextActivity = p.nextActivity;
    if (p.recommendation !== undefined) recommendation = p.recommendation;
    if (p.reviewQueue?.length) {
      reviewQueue = mergeReview(reviewQueue, p.reviewQueue);
    }
    if (p.evidence?.length) evidence.push(...p.evidence);
    evidence.push({
      key: "rule_fired",
      value: fire.ruleId,
      source: "rule_engine",
    });
    if (typeof p.confidence === "number") {
      confidenceSum += p.confidence;
      confidenceN += 1;
    }
  }

  return {
    patch: {
      reason: primary.patch.reason,
      difficulty: difficulty ?? "same",
      hints: hints ?? "none",
      celebrationLevel: celebrationLevel ?? 0,
      narrationLength: narrationLength ?? "medium",
      breakSuggestion: breakSuggestion ?? false,
      rewardPriority: rewardPriority ?? "normal",
      nextActivity: nextActivity ?? null,
      recommendation: recommendation ?? null,
      reviewQueue,
      evidence,
      confidence:
        confidenceN > 0
          ? Math.round(confidenceSum / confidenceN)
          : Math.min(95, 50 + primary.priority),
    },
    primaryRuleId: primary.ruleId,
    contributingRuleIds: sorted.map((f) => f.ruleId),
    evidence,
    confidence:
      confidenceN > 0
        ? Math.round(confidenceSum / confidenceN)
        : Math.min(95, 50 + primary.priority),
  };
}

function mergeReview<T extends { priority: number; reason: string }>(
  a: T[],
  b: T[],
): T[] {
  const out = [...a];
  for (const item of b) {
    out.push(item);
  }
  out.sort((x, y) => y.priority - x.priority);
  return out.slice(0, 8);
}
