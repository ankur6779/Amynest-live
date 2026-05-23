import type { PredictionOutput } from "./types-prediction.js";
import type { ModelPrediction } from "./types.js";
import type { FamilyGraph, CrossChildSignals } from "./types-family.js";
import type { LearningGraph } from "./types-family.js";
import { hasSiblingMastered } from "./learningGraph.js";
import type { SkillKey } from "../types-v2.js";

/**
 * Gentle transfer learning — child-first; family only nudges.
 */
export function applyCrossChildToPrediction(
  prediction: PredictionOutput,
  signals: CrossChildSignals,
  graph: LearningGraph,
  childId: string,
): PredictionOutput {
  let difficulty = prediction.recommendedDifficulty;
  const order = { easy: 0, medium: 1, hard: 2 };

  if (signals.difficultyNudge > 0.05) {
    const cur = order[difficulty];
    if (cur < 2) {
      difficulty = cur === 0 ? "medium" : "hard";
    }
  }

  if (signals.exposureAcceleration && hasSiblingMastered(graph, "phonics", childId)) {
    if (difficulty === "easy") difficulty = "medium";
  }

  return {
    ...prediction,
    recommendedDifficulty: difficulty,
    explorationSuccessRate: Math.min(
      1,
      prediction.explorationSuccessRate + signals.explorationBoost * 0.5,
    ),
  };
}

export function applyCrossChildToNbaPrior(
  prediction: ModelPrediction,
  signals: CrossChildSignals,
): ModelPrediction {
  if (signals.explorationBoost <= 0 && signals.difficultyNudge <= 0) {
    return prediction;
  }

  const probs = { ...prediction.probabilities };
  probs.INTRODUCE_EXPLORATION =
    (probs.INTRODUCE_EXPLORATION ?? 0) + signals.explorationBoost * 0.15;
  if (signals.teachingRoleRecommended) {
    probs.KEEP_AS_IS = (probs.KEEP_AS_IS ?? 0) + 0.08;
  }
  if (signals.difficultyNudge > 0) {
    probs.INCREASE_DIFFICULTY = (probs.INCREASE_DIFFICULTY ?? 0) + signals.difficultyNudge * 0.2;
  }

  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const k of Object.keys(probs) as (keyof typeof probs)[]) {
      probs[k] = (probs[k] ?? 0) / total;
    }
  }

  return { ...prediction, probabilities: probs };
}

export function transferSignalFromFastSibling(
  targetChildId: string,
  fastSiblingSkill: SkillKey,
  targetLevel: number,
): number {
  if (targetLevel >= 3) return 0;
  return 0.08;
}
