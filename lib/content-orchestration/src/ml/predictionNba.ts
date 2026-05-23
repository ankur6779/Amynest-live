import type { ModelPrediction, NbaAction } from "./types.js";
import type { PredictionOutput } from "./types-prediction.js";

const PRIOR_WEIGHT = 0.18;

function renormalize(probs: Record<NbaAction, number>): Record<NbaAction, number> {
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  if (total <= 0) return probs;
  const out = { ...probs };
  for (const k of Object.keys(out) as NbaAction[]) {
    out[k] = (out[k] ?? 0) / total;
  }
  return out;
}

/**
 * Prediction acts as a soft prior; realtime signals remain primary via existing pipeline.
 */
export function applyPredictionPrior(
  prediction: ModelPrediction,
  behavioral: PredictionOutput | undefined,
): ModelPrediction {
  if (!behavioral || behavioral.confidence < 0.2) return prediction;

  const scale = PRIOR_WEIGHT * behavioral.confidence;
  const probs = { ...prediction.probabilities };

  if (behavioral.predictedDropOffRisk > 0.5) {
    probs.DECREASE_DIFFICULTY = (probs.DECREASE_DIFFICULTY ?? 0) + scale * 0.8;
    probs.INJECT_REWARD = (probs.INJECT_REWARD ?? 0) + scale * 0.5;
    probs.INCREASE_DIFFICULTY = Math.max(
      0,
      (probs.INCREASE_DIFFICULTY ?? 0) - scale,
    );
  }

  if (
    behavioral.predictedEngagement > 0.65 &&
    behavioral.predictedDropOffRisk < 0.4
  ) {
    probs.INCREASE_DIFFICULTY = (probs.INCREASE_DIFFICULTY ?? 0) + scale * 0.4;
    probs.INTRODUCE_EXPLORATION = (probs.INTRODUCE_EXPLORATION ?? 0) + scale * 0.3;
  }

  if (behavioral.explorationSuccessRate > 0.55) {
    probs.INTRODUCE_EXPLORATION = (probs.INTRODUCE_EXPLORATION ?? 0) + scale * 0.35;
  }

  const adjusted = renormalize(probs);
  let best: NbaAction = prediction.action;
  let bestP = adjusted[best] ?? 0;
  for (const [action, p] of Object.entries(adjusted) as [NbaAction, number][]) {
    if (p > bestP) {
      bestP = p;
      best = action;
    }
  }

  return {
    action: best,
    confidence: Math.max(prediction.confidence * (1 - scale * 0.3), bestP),
    probabilities: adjusted,
    rewardEstimate: prediction.rewardEstimate,
  };
}
