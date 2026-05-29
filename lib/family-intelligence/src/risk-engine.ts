import type {
  ActionCategory,
  FamilyIntelligenceInput,
  InterventionPlan,
  RiskAssessment,
} from "./types.js";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Math.round(n * 1000) / 1000));
}

export function assessFamilyRisk(input: FamilyIntelligenceInput): RiskAssessment {
  let routineCollapseRisk = 0.15;
  let learningDisengagementRisk = 0.12;
  let parentChurnRisk = input.churnRisk30d;
  let subscriptionChurnRisk = input.isPremium ? 0.1 : 0.05;

  if (input.routineCompletionRate7d < 0.3) routineCollapseRisk += 0.45;
  else if (input.routineCompletionRate7d < 0.5) routineCollapseRisk += 0.25;
  if (input.weeklyRoutineConsistency < 0.4) routineCollapseRisk += 0.15;
  if (input.streakBrokenDaysAgo != null && input.streakBrokenDaysAgo <= 3) {
    routineCollapseRisk += 0.2;
  }

  if (input.lessonsCompleted7d === 0 && input.accountAgeDays > 14) {
    learningDisengagementRisk += 0.35;
  }
  if (input.weakSubjects.length >= 2) learningDisengagementRisk += 0.15;
  if (input.dropOffRisk != null) learningDisengagementRisk += input.dropOffRisk * 0.4;

  if (input.daysSinceLastActive >= 5) parentChurnRisk = Math.max(parentChurnRisk, 0.7);
  if (input.notificationsOpened7d === 0) parentChurnRisk += 0.15;
  if (input.sessionsLast7d <= 1) parentChurnRisk += 0.1;

  if (input.isPremium && input.daysSinceLastActive >= 7) subscriptionChurnRisk += 0.4;
  if (input.isPremium && input.routineCompletionRate7d < 0.2) subscriptionChurnRisk += 0.2;

  routineCollapseRisk = clamp01(routineCollapseRisk);
  learningDisengagementRisk = clamp01(learningDisengagementRisk);
  parentChurnRisk = clamp01(parentChurnRisk);
  subscriptionChurnRisk = clamp01(subscriptionChurnRisk);

  const riskOnly = [
    { cat: "routine_problem" as const, v: routineCollapseRisk },
    { cat: "learning_problem" as const, v: learningDisengagementRisk },
    { cat: "retention_problem" as const, v: parentChurnRisk },
  ];
  riskOnly.sort((a, b) => b.v - a.v);
  const primaryRisk = riskOnly[0]!.cat;

  const overallRisk = clamp01(
    routineCollapseRisk * 0.3 +
    learningDisengagementRisk * 0.25 +
    parentChurnRisk * 0.3 +
    subscriptionChurnRisk * 0.15,
  );

  return {
    routineCollapseRisk,
    learningDisengagementRisk,
    parentChurnRisk,
    subscriptionChurnRisk,
    overallRisk,
    primaryRisk,
  };
}

export function generateInterventionPlans(
  risks: RiskAssessment,
  input: FamilyIntelligenceInput,
): InterventionPlan[] {
  const plans: InterventionPlan[] = [];

  if (risks.routineCollapseRisk >= 0.4) {
    plans.push({
      id: "routine_simplify",
      risk: "routine_problem",
      title: "Simplify the routine",
      description: `Reduce ${input.childName}'s routine to 3 essential tasks to rebuild consistency.`,
      surfaces: ["notifications", "routine", "amy_ai"],
      priority: Math.round(risks.routineCollapseRisk * 100),
      proactive: risks.routineCollapseRisk >= 0.55,
    });
  }

  if (risks.learningDisengagementRisk >= 0.35) {
    const subject = input.weakSubjects[0] ?? "reading";
    plans.push({
      id: "learning_reengage",
      risk: "learning_problem",
      title: `Re-engage ${subject}`,
      description: `A 10-minute ${subject} session at ${input.childName}'s peak focus window.`,
      surfaces: ["learning_zone", "notifications", "parent_hub"],
      priority: Math.round(risks.learningDisengagementRisk * 100),
      proactive: true,
    });
  }

  if (risks.parentChurnRisk >= 0.45) {
    plans.push({
      id: "retention_win_back",
      risk: "retention_problem",
      title: "Win-back journey",
      description: "Two-minute routine check-in to restart family momentum.",
      surfaces: ["notifications", "amy_ai", "parent_hub"],
      priority: Math.round(risks.parentChurnRisk * 100),
      proactive: risks.parentChurnRisk >= 0.6,
    });
  }

  if (!input.isPremium && input.lessonsCompletedTotal >= 10 && risks.subscriptionChurnRisk < 0.3) {
    plans.push({
      id: "subscription_activation",
      risk: "subscription_opportunity",
      title: "Unlock full potential",
      description: `${input.childName} has completed ${input.lessonsCompletedTotal} lessons — Premium unlocks personalized paths.`,
      surfaces: ["subscriptions", "parent_hub"],
      priority: 55,
      proactive: false,
    });
  }

  return plans.sort((a, b) => b.priority - a.priority);
}
