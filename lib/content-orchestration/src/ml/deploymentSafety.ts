import type { MlExperimentFlags, MlMetrics } from "./types.js";
import { DEFAULT_ML_EXPERIMENTS } from "./types.js";

/** Gradual ML rollout: 0.3 → 0.5 → 0.7 → 1.0 */
export const ML_ROLLOUT_STAGES = [0.3, 0.5, 0.7, 1.0] as const;

export type DeploymentSafetyConfig = {
  rolloutStageIndex: number;
  forceRuleFallback: boolean;
  engagementLiftMin: number;
  sessionReturnRateMin: number;
};

const DEFAULT_SAFETY: DeploymentSafetyConfig = {
  rolloutStageIndex: 0,
  forceRuleFallback: false,
  engagementLiftMin: -0.15,
  sessionReturnRateMin: 0.35,
};

let runtimeSafety: DeploymentSafetyConfig = { ...DEFAULT_SAFETY };

export function configureDeploymentSafety(partial: Partial<DeploymentSafetyConfig>): void {
  runtimeSafety = { ...runtimeSafety, ...partial };
}

export function resetDeploymentSafety(): void {
  runtimeSafety = { ...DEFAULT_SAFETY };
}

export function resolveRolloutTrafficPercentage(
  stageIndex = runtimeSafety.rolloutStageIndex,
): number {
  const idx = Math.max(0, Math.min(ML_ROLLOUT_STAGES.length - 1, stageIndex));
  return ML_ROLLOUT_STAGES[idx]!;
}

/**
 * Auto fallback to rule-based when engagement/retention signals degrade.
 */
export function shouldForceRuleFallback(metrics: MlMetrics): boolean {
  if (runtimeSafety.forceRuleFallback) return true;
  if (metrics.sampleCount < 30) return false;

  if (metrics.engagementLift < runtimeSafety.engagementLiftMin) return true;
  if (
    metrics.sessionReturnRate > 0 &&
    metrics.sessionReturnRate < runtimeSafety.sessionReturnRateMin
  ) {
    return true;
  }
  return false;
}

export function resolveEffectiveMlFlags(
  base: MlExperimentFlags = DEFAULT_ML_EXPERIMENTS,
  metrics?: MlMetrics,
  env?: { mlRolloutStage?: string; mlForceFallback?: string; mlTraffic?: string },
): MlExperimentFlags & { forceRuleFallback: boolean } {
  const stageIdx = env?.mlRolloutStage
    ? Math.max(0, Number(env.mlRolloutStage) || 0)
    : runtimeSafety.rolloutStageIndex;

  const envTraffic = env?.mlTraffic ? Number(env.mlTraffic) : NaN;
  const traffic = Number.isFinite(envTraffic)
    ? envTraffic
    : resolveRolloutTrafficPercentage(stageIdx);

  const forceFromEnv = env?.mlForceFallback === "true" || env?.mlForceFallback === "1";
  const forceFromMetrics = metrics ? shouldForceRuleFallback(metrics) : false;

  return {
    ...base,
    mlTrafficPercentage: Number.isFinite(traffic)
      ? Math.max(0, Math.min(1, traffic))
      : base.mlTrafficPercentage,
    mlEnabled: base.mlEnabled && !forceFromEnv && !forceFromMetrics,
    forceRuleFallback: forceFromEnv || forceFromMetrics,
  };
}
