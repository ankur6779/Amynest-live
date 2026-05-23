import type { ContentRankingWeights } from "../types-v2.js";
import { DEFAULT_RANKING_WEIGHTS } from "../contentEngine.js";
import type {
  EffectiveRuntimeConfig,
  SystemPolicy,
  TuningAdjustments,
  TuningParameters,
} from "./types-meta.js";

export const DEFAULT_SYSTEM_POLICY: SystemPolicy = {
  maxDifficultyJump: 0.35,
  minEngagementThreshold: 0.35,
  explorationBounds: { min: 0.08, max: 0.35 },
  rewardLimits: { minCooldownMs: 25_000, maxCooldownMs: 150_000 },
  maxTuningDeltaPerCycle: 0.05,
};

let activePolicy: SystemPolicy = { ...DEFAULT_SYSTEM_POLICY };

export function getSystemPolicy(): SystemPolicy {
  return activePolicy;
}

export function setSystemPolicy(partial: Partial<SystemPolicy>): void {
  activePolicy = { ...activePolicy, ...partial };
}

export function resetSystemPolicy(): void {
  activePolicy = { ...DEFAULT_SYSTEM_POLICY };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function applyPolicyToTuning(
  current: TuningParameters,
  adjustments: TuningAdjustments,
): TuningParameters {
  const policy = activePolicy;
  const delta = clamp(
    adjustments.explorationRateDelta,
    -policy.maxTuningDeltaPerCycle,
    policy.maxTuningDeltaPerCycle,
  );
  const explorationRate = clamp(
    current.explorationRate + delta,
    policy.explorationBounds.min,
    policy.explorationBounds.max,
  );

  let difficultyRamp = current.difficultyRamp;
  if (adjustments.difficultyRampShift === "slower") difficultyRamp = "slow";
  if (adjustments.difficultyRampShift === "faster") difficultyRamp = "fast";

  let rewardFrequency = current.rewardFrequency;
  if (adjustments.rewardFrequencyShift === "lower") {
    rewardFrequency =
      rewardFrequency === "high" ? "medium" : rewardFrequency === "medium" ? "low" : "low";
  }
  if (adjustments.rewardFrequencyShift === "higher") {
    rewardFrequency =
      rewardFrequency === "low" ? "medium" : rewardFrequency === "medium" ? "high" : "high";
  }

  return {
    ...current,
    explorationRate,
    difficultyRamp,
    rewardFrequency,
    contentRankingWeights: current.contentRankingWeights,
  };
}

export function enforcePolicyOnRuntimeConfig(
  config: EffectiveRuntimeConfig,
  engagementScore: number,
): EffectiveRuntimeConfig {
  const policy = activePolicy;
  const explorationRate = clamp(
    config.explorationRate,
    policy.explorationBounds.min,
    policy.explorationBounds.max,
  );

  let forceRuleFallback = config.forceRuleFallback;
  if (engagementScore < policy.minEngagementThreshold) {
    forceRuleFallback = true;
  }

  const weights: ContentRankingWeights = {
    ...DEFAULT_RANKING_WEIGHTS,
    ...config.contentWeights,
  };
  const sum =
    weights.noveltyWeight +
    weights.difficultyMatchWeight +
    weights.engagementWeight +
    weights.explorationWeight;
  if (sum > 0 && Math.abs(sum - 1) > 0.01) {
    weights.noveltyWeight /= sum;
    weights.difficultyMatchWeight /= sum;
    weights.engagementWeight /= sum;
    weights.explorationWeight /= sum;
  }

  return {
    ...config,
    explorationRate,
    contentWeights: weights,
    forceRuleFallback,
    policyApplied: true,
  };
}

export function isDifficultyJumpAllowed(
  fromLevel: number,
  toLevel: number,
): boolean {
  return Math.abs(toLevel - fromLevel) <= activePolicy.maxDifficultyJump;
}
