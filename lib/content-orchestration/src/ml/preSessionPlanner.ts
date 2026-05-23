import type { ModuleId } from "../types.js";
import type { PersonalityProfile } from "./types-personality.js";
import type { LearningPath } from "./types-personality.js";
import type { PredictionOutput } from "./types-prediction.js";
import type { PreSessionPlanAdjustments } from "./types-prediction.js";
import { applyEarlyInterventionToPlan } from "./earlyIntervention.js";
import { resolveSessionPersonalization } from "../sessionPersonalization.js";

/**
 * Pre-session planning: prediction + personality guide module priority, difficulty, slots.
 * Realtime layer still adjusts during session.
 */
export function generatePlanUsingPrediction(
  prediction: PredictionOutput,
  options?: {
    personality?: PersonalityProfile;
    learningPath?: LearningPath;
  },
): PreSessionPlanAdjustments {
  const personality = options?.personality;
  const path = options?.learningPath;
  const limits = resolveSessionPersonalization(personality);

  const modulePriorityBoost: Partial<Record<ModuleId, number>> = {};
  if (path?.currentTrack) {
    modulePriorityBoost[path.currentTrack] = 0.15;
  }
  for (const f of prediction.skillForecasts) {
    if (f.status === "fast_growth") {
      const mod = skillToPrimaryModule(f.skill);
      if (mod) modulePriorityBoost[mod] = (modulePriorityBoost[mod] ?? 0) + 0.1;
    }
    if (f.status === "plateau") {
      const mod = skillToPrimaryModule(f.skill);
      if (mod) modulePriorityBoost[mod] = (modulePriorityBoost[mod] ?? 0) + 0.05;
    }
  }

  let explorationSlotBias = 0;
  if (prediction.explorationSuccessRate > 0.5) explorationSlotBias += 0.1;
  if (personality?.traits.curiosity && personality.traits.curiosity > 0.6) {
    explorationSlotBias += 0.08;
  }

  let rewardFrequencyMultiplier = 1;
  if (personality?.traits.rewardSensitivity && personality.traits.rewardSensitivity > 0.65) {
    rewardFrequencyMultiplier = 0.85;
  }
  if (prediction.predictedDropOffRisk > 0.45) {
    rewardFrequencyMultiplier *= 0.9;
  }

  const maxSessionItems = Math.max(
    limits.minItems,
    Math.min(
      limits.maxItems,
      Math.round(prediction.recommendedSessionLength / 2.5),
    ),
  );

  let base: PreSessionPlanAdjustments = {
    modulePriorityBoost,
    difficultyBaseline: prediction.recommendedDifficulty,
    explorationSlotBias,
    rewardFrequencyMultiplier,
    maxSessionItems,
    earlyIntervention: false,
  };

  base = applyEarlyInterventionToPlan(base, prediction);
  return base;
}

function skillToPrimaryModule(skill: import("../types-v2.js").SkillKey): ModuleId | null {
  const map: Record<import("../types-v2.js").SkillKey, ModuleId> = {
    phonics: "phonics",
    motor_skills: "motor_skills",
    cognitive: "cognitive",
    social: "social_emotional",
  };
  return map[skill] ?? null;
}

export function mergeModulePriorityIntoScore(
  moduleId: ModuleId,
  baseScore: number,
  adjustments: PreSessionPlanAdjustments,
): number {
  const boost = adjustments.modulePriorityBoost[moduleId] ?? 0;
  return baseScore + boost;
}
