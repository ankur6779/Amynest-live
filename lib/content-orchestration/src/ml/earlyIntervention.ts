import type { ModuleId } from "../types.js";
import type { PreSessionPlanAdjustments } from "./types-prediction.js";
import type { PredictionOutput } from "./types-prediction.js";

export const DROP_OFF_INTERVENTION_THRESHOLD = 0.55;

export type EarlyInterventionFlags = {
  injectFunEarly: boolean;
  reduceDifficulty: boolean;
  increaseRewards: boolean;
};

export function shouldTriggerEarlyIntervention(
  prediction: PredictionOutput,
): boolean {
  return prediction.predictedDropOffRisk >= DROP_OFF_INTERVENTION_THRESHOLD;
}

export function resolveEarlyIntervention(
  prediction: PredictionOutput,
): EarlyInterventionFlags {
  if (!shouldTriggerEarlyIntervention(prediction)) {
    return {
      injectFunEarly: false,
      reduceDifficulty: false,
      increaseRewards: false,
    };
  }
  return {
    injectFunEarly: true,
    reduceDifficulty: true,
    increaseRewards: true,
  };
}

/** Module types favored when drop-off risk is high. */
export const FUN_MODULE_PRIORITY: ModuleId[] = [
  "creativity",
  "stories",
  "motor_skills",
];

export function applyEarlyInterventionToPlan(
  adjustments: PreSessionPlanAdjustments,
  prediction: PredictionOutput,
): PreSessionPlanAdjustments {
  const flags = resolveEarlyIntervention(prediction);
  if (!flags.injectFunEarly && !flags.reduceDifficulty && !flags.increaseRewards) {
    return adjustments;
  }

  const boost = { ...adjustments.modulePriorityBoost };
  if (flags.injectFunEarly) {
    for (const mod of FUN_MODULE_PRIORITY) {
      boost[mod] = (boost[mod] ?? 0) + 0.2;
    }
  }

  return {
    ...adjustments,
    modulePriorityBoost: boost,
    difficultyBaseline: flags.reduceDifficulty ? "easy" : adjustments.difficultyBaseline,
    rewardFrequencyMultiplier: flags.increaseRewards
      ? adjustments.rewardFrequencyMultiplier * 0.7
      : adjustments.rewardFrequencyMultiplier,
    explorationSlotBias: flags.injectFunEarly
      ? adjustments.explorationSlotBias + 0.15
      : adjustments.explorationSlotBias,
    earlyIntervention: flags.injectFunEarly || flags.reduceDifficulty || flags.increaseRewards,
  };
}
