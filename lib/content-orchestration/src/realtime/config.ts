import type { FallbackMode, RealtimeExperimentFlags } from "./types.js";
import { DEFAULT_FALLBACK_MODE, DEFAULT_REALTIME_EXPERIMENTS } from "./types.js";
import {
  DEFAULT_ML_EXPERIMENTS,
  type MlExperimentFlags,
} from "../ml/types.js";
import { resolveEffectiveMlFlags } from "../ml/deploymentSafety.js";

export const REALTIME_THRESHOLDS = {
  idleMs: 12_000,
  rapidTapCount: 8,
  rapidTapWindowMs: 3_000,
  fastResponseMs: 1_500,
  consecutiveSkipsForLower: 2,
  streamFlushDebounceMs: 2_000,
};

export function resolveRealtimeConfig(env?: {
  realtimeEnabled?: string;
  fallbackStatic?: string;
  mlEnabled?: string;
  mlTraffic?: string;
  mlRolloutStage?: string;
  mlForceFallback?: string;
}): {
  experiments: RealtimeExperimentFlags;
  fallback: FallbackMode;
  ml: MlExperimentFlags;
} {
  const disabled = env?.realtimeEnabled === "false" || env?.realtimeEnabled === "0";
  const staticPlan = env?.fallbackStatic === "true" || env?.fallbackStatic === "1";

  const mlOff = env?.mlEnabled === "false" || env?.mlEnabled === "0";
  const baseMl: MlExperimentFlags = {
    ...DEFAULT_ML_EXPERIMENTS,
    mlEnabled: !mlOff && DEFAULT_ML_EXPERIMENTS.mlEnabled,
  };

  return {
    experiments: {
      ...DEFAULT_REALTIME_EXPERIMENTS,
      realtimeEnabled: !disabled && DEFAULT_REALTIME_EXPERIMENTS.realtimeEnabled,
    },
    fallback: {
      realtimeDisabled: disabled || staticPlan,
      useStaticPlan: staticPlan,
    },
    ml: resolveEffectiveMlFlags(baseMl, undefined, {
      mlTraffic: env?.mlTraffic,
      mlRolloutStage: env?.mlRolloutStage,
      mlForceFallback: env?.mlForceFallback,
    }),
  };
}

export function rewardCooldownMs(frequency: RealtimeExperimentFlags["rewardFrequency"]): number {
  if (frequency === "low") return 120_000;
  if (frequency === "high") return 30_000;
  return 60_000;
}
