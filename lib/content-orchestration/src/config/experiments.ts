import type { ExperimentFlags } from "../types-v2.js";

export const DEFAULT_EXPERIMENT_FLAGS: ExperimentFlags = {
  explorationRate: [0.15, 0.25],
  difficultyRampSpeed: ["slow", "fast"],
};

/**
 * Deterministic A/B bucket from childId (0 or 1).
 * explorationRate[0] vs explorationRate[1], difficultyRampSpeed likewise.
 */
export function resolveExperimentVariant(
  childId: string,
  flags: ExperimentFlags = DEFAULT_EXPERIMENT_FLAGS,
  bucketOverride?: number,
): {
  bucket: number;
  explorationRate: number;
  difficultyRamp: "slow" | "fast";
  variantLabel: string;
} {
  const bucket =
    bucketOverride ??
    (childId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 2);
  const explorationRate = flags.explorationRate[bucket] ?? flags.explorationRate[0];
  const difficultyRamp = flags.difficultyRampSpeed[bucket] ?? "slow";
  return {
    bucket,
    explorationRate,
    difficultyRamp,
    variantLabel: `exp_${bucket}`,
  };
}
