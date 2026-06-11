import {
  computeSkillBreakdown,
  schoolReadinessBandFromScore,
  type PlaygroundEngagementState,
  type PlaygroundLearningState,
  type ReadinessDimension,
  type SchoolReadinessSnapshot,
} from "@workspace/math-playground";
import {
  attentionSpanScore,
  numberRecognitionScore,
  persistenceScore,
  problemSolvingScore,
} from "./skill-signals";

function weightedAverage(dimensions: ReadinessDimension[]): number {
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  return Math.round(weighted / totalWeight);
}

export function computeSchoolReadiness(
  learning: PlaygroundLearningState,
  engagement?: PlaygroundEngagementState,
): SchoolReadinessSnapshot {
  const breakdown = computeSkillBreakdown(learning);
  const sessionCount = learning.sessionHistory.length;

  const dimensions: ReadinessDimension[] = [
    { key: "counting", score: breakdown.counting || 45, weight: 1.2 },
    { key: "number_recognition", score: numberRecognitionScore(breakdown), weight: 1.0 },
    { key: "addition", score: breakdown.addition || 40, weight: 1.1 },
    { key: "problem_solving", score: problemSolvingScore(breakdown), weight: 1.0 },
    { key: "pattern_recognition", score: breakdown.patterns || 40, weight: 0.9 },
    { key: "attention_span", score: attentionSpanScore(learning, engagement), weight: 0.8 },
    { key: "persistence", score: persistenceScore(learning, engagement), weight: 0.8 },
  ];

  const score = weightedAverage(dimensions);

  return {
    score,
    band: schoolReadinessBandFromScore(score),
    dimensions,
    sessionCount,
    generatedAt: Date.now(),
  };
}

/** Alias for architecture doc naming. */
export const SchoolReadinessEngine = {
  compute: computeSchoolReadiness,
};
