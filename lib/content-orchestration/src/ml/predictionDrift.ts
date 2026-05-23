import type { PredictionDriftResult, PredictionOutput } from "./types-prediction.js";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export type ActualSessionOutcome = {
  engagementScore: number;
  skips: number;
  sessionLengthMinutes: number;
  completed: boolean;
};

/**
 * Compare predicted vs actual; reduce confidence and boost exploration on mismatch.
 */
export function correctPredictionDrift(
  prediction: PredictionOutput,
  actual: ActualSessionOutcome,
): PredictionDriftResult {
  const predictedEng = prediction.predictedEngagement;
  const actualEng = clamp01(actual.engagementScore / 100);
  const engMismatch = Math.abs(predictedEng - actualEng);

  const predictedDrop = prediction.predictedDropOffRisk;
  const actualDrop = clamp01(
    actual.skips / 5 + (actual.sessionLengthMinutes < 4 ? 0.25 : 0) +
      (actual.completed ? 0 : 0.2),
  );
  const dropMismatch = Math.abs(predictedDrop - actualDrop);

  const mismatch = clamp01(engMismatch * 0.55 + dropMismatch * 0.45);
  const threshold = 0.28;

  if (mismatch < threshold) {
    return { mismatch, confidencePenalty: 0, explorationBoost: 0 };
  }

  return {
    mismatch,
    confidencePenalty: Math.min(0.2, mismatch * 0.35),
    explorationBoost: Math.min(0.15, mismatch * 0.25),
  };
}

export function applyConfidencePenalty(
  prediction: PredictionOutput,
  penalty: number,
): PredictionOutput {
  return {
    ...prediction,
    confidence: Math.max(0.15, prediction.confidence - penalty),
  };
}
