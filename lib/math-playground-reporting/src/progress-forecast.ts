import type {
  PlaygroundLearningState,
  ProgressForecastSnapshot,
  SchoolReadinessSnapshot,
} from "@workspace/math-playground";
import { computeSchoolReadiness } from "@workspace/math-playground-assessment";

function sessionsPerWeek(learning: PlaygroundLearningState): number {
  const recent = learning.sessionHistory.slice(0, 14);
  if (recent.length < 2) return 2;

  const spanMs = recent[0].completedAt - recent[recent.length - 1].completedAt;
  const weeks = Math.max(1, spanMs / (7 * 24 * 60 * 60 * 1000));
  return Math.round((recent.length / weeks) * 10) / 10;
}

function projectReadiness(
  current: number,
  practicePerWeek: number,
  weeks: number,
): number {
  const growthRate = Math.min(0.08, 0.02 + practicePerWeek * 0.008);
  const projected = current + current * growthRate * weeks;
  return Math.min(100, Math.round(projected));
}

export function buildProgressForecast(
  learning: PlaygroundLearningState,
  readiness?: SchoolReadinessSnapshot,
): ProgressForecastSnapshot {
  const currentReadiness = readiness ?? computeSchoolReadiness(learning);
  const practiceSessionsPerWeek = sessionsPerWeek(learning);

  return {
    generatedAt: Date.now(),
    currentReadiness: currentReadiness.score,
    forecast30: projectReadiness(currentReadiness.score, practiceSessionsPerWeek, 4),
    forecast60: projectReadiness(currentReadiness.score, practiceSessionsPerWeek, 8),
    forecast90: projectReadiness(currentReadiness.score, practiceSessionsPerWeek, 12),
    practiceSessionsPerWeek,
    assumptionsKey: "forecast_assumption_continue_practice",
  };
}

/** Progress forecasting engine. */
export const ProgressForecastEngine = {
  build: buildProgressForecast,
};
