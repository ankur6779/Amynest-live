import type { FamilyIntelligenceInput, SuccessMetrics } from "./types.js";
import type { FamilyHealthScore } from "./types.js";

export function computeSuccessMetrics(
  input: FamilyIntelligenceInput,
  health: FamilyHealthScore,
): SuccessMetrics {
  const routineSuccess = Math.round(input.routineCompletionRate7d * 100);
  const learningSuccess = Math.round(
    Math.min(100, (input.lessonsCompleted7d / 5) * 100),
  );
  const retentionSuccess = Math.round(
    Math.max(0, 100 - input.churnRisk30d * 100),
  );
  const parentSatisfaction = Math.round(
    (input.notificationsOpened7d / 7) * 50 +
    (input.sessionsLast7d / 7) * 50,
  );
  const childEngagement = Math.round(
    (learningSuccess * 0.4 + routineSuccess * 0.4 + health.components.streakHealth * 0.2),
  );

  const overallSuccess = Math.round(
    routineSuccess * 0.25 +
    learningSuccess * 0.25 +
    retentionSuccess * 0.2 +
    parentSatisfaction * 0.15 +
    childEngagement * 0.15,
  );

  return {
    routineSuccess,
    learningSuccess,
    retentionSuccess,
    parentSatisfaction,
    childEngagement,
    overallSuccess,
  };
}
