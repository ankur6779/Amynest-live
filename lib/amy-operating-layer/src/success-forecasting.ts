import type { FamilyIntelligenceSnapshot } from "@workspace/family-intelligence";
import type { SuccessForecast } from "./types.js";

export function generateSuccessForecasts(
  snapshot: FamilyIntelligenceSnapshot,
): SuccessForecast[] {
  const forecasts: SuccessForecast[] = [];
  const { risks, health, goals, successMetrics, childName } = snapshot;

  for (const g of goals.filter((goal) => goal.active)) {
    const pct = g.targetValue > 0 ? g.progress / g.targetValue : 0;
    const likelihood = Math.min(0.95, pct + (1 - risks.overallRisk) * 0.3);
    forecasts.push({
      metric: `${g.type} goal`,
      likelihood: Math.round(likelihood * 100) / 100,
      confidenceLow: Math.max(0, likelihood - 0.15),
      confidenceHigh: Math.min(1, likelihood + 0.1),
      horizonDays: 7,
      narrative: `${childName} has a ${Math.round(likelihood * 100)}% estimated chance of hitting the ${g.type} goal this week.`,
    });
  }

  const routineStability = 1 - risks.routineCollapseRisk;
  forecasts.push({
    metric: "routine stability",
    likelihood: Math.round(routineStability * 100) / 100,
    confidenceLow: Math.max(0, routineStability - 0.12),
    confidenceHigh: Math.min(1, routineStability + 0.08),
    horizonDays: 14,
    narrative:
      routineStability >= 0.7
        ? `${childName}'s routine pattern looks stable for the next two weeks.`
        : `Routine stability may be fragile — simplifying could improve odds.`,
  });

  const learningTrajectory = successMetrics.learningSuccess / 100;
  forecasts.push({
    metric: "learning trajectory",
    likelihood: Math.round(learningTrajectory * 100) / 100,
    confidenceLow: Math.max(0, learningTrajectory - 0.18),
    confidenceHigh: Math.min(1, learningTrajectory + 0.12),
    horizonDays: 30,
    narrative: `Learning momentum suggests a ${Math.round(learningTrajectory * 100)}% trajectory toward weekly targets.`,
  });

  return forecasts;
}
