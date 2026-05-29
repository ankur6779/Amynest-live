import type { OutcomeSignals } from "./types.js";

export interface ChurnPrediction {
  churnRisk7d: number;
  churnRisk30d: number;
  churnRisk90d: number;
  interventionLevel: "none" | "light" | "moderate" | "aggressive";
  primaryRiskFactor: string;
}

/**
 * Heuristic retention prediction model.
 * Replace with ML model when sufficient labeled churn data exists.
 */
export function predictChurn(s: OutcomeSignals): ChurnPrediction {
  let risk7 = 0.1;
  let risk30 = 0.08;
  let risk90 = 0.05;
  let primaryRiskFactor = "baseline";

  if (s.daysSinceLastActive >= 7) {
    risk7 = 0.95;
    risk30 = 0.9;
    risk90 = 0.85;
    primaryRiskFactor = "inactive_7d";
  } else if (s.daysSinceLastActive >= 3) {
    risk7 = 0.55 + s.daysSinceLastActive * 0.08;
    risk30 = 0.45;
    risk90 = 0.35;
    primaryRiskFactor = "inactive_3d";
  }

  if (s.routineCompletionRate7d < 0.2) {
    risk7 += 0.15;
    risk30 += 0.2;
    primaryRiskFactor = "low_routine_completion";
  }

  if (s.lessonsCompleted7d === 0 && s.accountAgeDays > 14) {
    risk30 += 0.12;
    risk90 += 0.1;
    if (primaryRiskFactor === "baseline") primaryRiskFactor = "no_learning_7d";
  }

  if (s.notificationsOpened7d === 0 && s.sessionsLast7d <= 1) {
    risk7 += 0.2;
    risk30 += 0.15;
    primaryRiskFactor = "disengaged_notifications";
  }

  if (s.streakBrokenDaysAgo != null && s.streakBrokenDaysAgo >= 3) {
    risk7 += 0.1;
    risk30 += 0.12;
  }

  if (s.currentStreakDays >= 7) {
    risk7 -= 0.15;
    risk30 -= 0.2;
    risk90 -= 0.15;
  }

  if (s.isPremium) {
    risk30 -= 0.08;
    risk90 -= 0.1;
  }

  const churnRisk7d = clamp01(risk7);
  const churnRisk30d = clamp01(risk30);
  const churnRisk90d = clamp01(risk90);

  let interventionLevel: ChurnPrediction["interventionLevel"] = "none";
  if (churnRisk7d >= 0.7) interventionLevel = "aggressive";
  else if (churnRisk30d >= 0.5) interventionLevel = "moderate";
  else if (churnRisk30d >= 0.3) interventionLevel = "light";

  return {
    churnRisk7d,
    churnRisk30d,
    churnRisk90d,
    interventionLevel,
    primaryRiskFactor,
  };
}

export function enrichSignalsWithChurn(s: OutcomeSignals): OutcomeSignals {
  const p = predictChurn(s);
  return {
    ...s,
    churnRisk7d: p.churnRisk7d,
    churnRisk30d: p.churnRisk30d,
    churnRisk90d: p.churnRisk90d,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Math.round(n * 1000) / 1000));
}
