import type { FamilyIntelligenceInput, PredictiveIntervention, ProductSurface } from "./types.js";

export function generatePredictiveInterventions(
  input: FamilyIntelligenceInput,
): PredictiveIntervention[] {
  const interventions: PredictiveIntervention[] = [];
  const expires = new Date(Date.now() + 48 * 3600000).toISOString();

  if (
    input.currentStreakDays >= 2 &&
    input.routineCompletionRate7d >= 0.5 &&
    input.routineCompletionRate7d < 0.65
  ) {
    interventions.push({
      id: "streak_break_risk",
      prediction: "Streak likely to break within 48 hours",
      probability: 0.55 + (1 - input.routineCompletionRate7d) * 0.3,
      recommendedAction: "Send gentle routine reminder before tomorrow morning.",
      surfaces: ["notifications", "amy_ai"],
      expiresAt: expires,
    });
  }

  if (input.lessonsCompleted7d <= 1 && input.accountAgeDays > 14 && input.daysSinceLastActive <= 2) {
    interventions.push({
      id: "learning_disengage_risk",
      prediction: "Child likely to disengage from learning this week",
      probability: 0.5 + (input.dropOffRisk ?? 0.2),
      recommendedAction: `Offer a 5-minute ${input.weakSubjects[0] ?? "reading"} activity at low friction.`,
      surfaces: ["learning_zone", "notifications"],
      expiresAt: expires,
    });
  }

  if (input.churnRisk7d >= 0.4 && input.daysSinceLastActive >= 2) {
    interventions.push({
      id: "parent_churn_risk",
      prediction: "Parent likely to churn within 7 days",
      probability: input.churnRisk7d,
      recommendedAction: "Trigger win-back journey with personalized coach message.",
      surfaces: ["notifications", "amy_ai", "parent_hub"],
      expiresAt: expires,
    });
  }

  if (input.isPremium && input.daysSinceLastActive >= 4 && input.routineCompletionRate7d < 0.3) {
    interventions.push({
      id: "subscription_churn_risk",
      prediction: "Premium subscriber showing disengagement signals",
      probability: 0.45,
      recommendedAction: "Surface value recap and simplify routine to reduce friction.",
      surfaces: ["parent_hub", "amy_ai"],
      expiresAt: expires,
    });
  }

  return interventions.sort((a, b) => b.probability - a.probability);
}

export function proactiveSurfaces(interventions: PredictiveIntervention[]): ProductSurface[] {
  const set = new Set<ProductSurface>();
  for (const i of interventions) {
    if (i.probability >= 0.5) {
      for (const s of i.surfaces) set.add(s);
    }
  }
  return [...set];
}
