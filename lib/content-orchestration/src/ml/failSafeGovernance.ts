import { resetDeploymentSafety, configureDeploymentSafety } from "./deploymentSafety.js";
import { DEFAULT_EXPERIMENT_FLAGS } from "../config/experiments.js";
import type { EffectiveRuntimeConfig, HumanOverride, TuningParameters } from "./types-meta.js";
import type { MlMetrics } from "./types.js";

export const SAFE_TUNING: TuningParameters = {
  explorationRate: DEFAULT_EXPERIMENT_FLAGS.explorationRate[0]!,
  difficultyRamp: "slow",
  rewardFrequency: "medium",
};

const UX_ENGAGEMENT_FLOOR = 0.3;
const UX_RETENTION_FLOOR = 0.25;

let failSafeActive = false;

export function isFailSafeActive(): boolean {
  return failSafeActive;
}

export function evaluateFailSafe(metrics: {
  engagementScore: number;
  retentionRate: number;
}): boolean {
  const breach =
    metrics.engagementScore < UX_ENGAGEMENT_FLOOR ||
    (metrics.retentionRate > 0 && metrics.retentionRate < UX_RETENTION_FLOOR);
  failSafeActive = breach;
  if (breach) {
    configureDeploymentSafety({ forceRuleFallback: true, rolloutStageIndex: 0 });
  }
  return breach;
}

export function applyFailSafeToConfig(
  config: EffectiveRuntimeConfig,
  metrics: MlMetrics,
): EffectiveRuntimeConfig {
  const engagementScore = Math.max(0, 0.5 + metrics.engagementLift * 0.5);
  const retentionRate = metrics.sessionReturnRate || metrics.nextDayRetention;

  if (!evaluateFailSafe({ engagementScore, retentionRate })) {
    return config;
  }

  return {
    ...config,
    explorationRate: SAFE_TUNING.explorationRate,
    difficultyRamp: SAFE_TUNING.difficultyRamp,
    rewardFrequency: SAFE_TUNING.rewardFrequency,
    forceRuleFallback: true,
    mlTrafficPercentage: Math.min(config.mlTrafficPercentage, 0.3),
  };
}

export function applyHumanOverride(
  config: EffectiveRuntimeConfig,
  override: HumanOverride,
): EffectiveRuntimeConfig {
  if (!override.enabled) return config;
  return {
    ...config,
    explorationRate: override.explorationRate ?? config.explorationRate,
    difficultyRamp: override.difficultyRamp ?? config.difficultyRamp,
    rewardFrequency: override.rewardFrequency ?? config.rewardFrequency,
    forceRuleFallback: override.forceRuleFallback ?? config.forceRuleFallback,
  };
}

export function clearFailSafe(): void {
  failSafeActive = false;
  resetDeploymentSafety();
}
