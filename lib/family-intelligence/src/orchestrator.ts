import type {
  FamilyIntelligenceInput,
  OrchestrationPlan,
  PrioritizedAction,
  FamilyMoment,
  FamilyGoal,
} from "./types.js";

/**
 * Cross-product orchestration — one brain decides what each surface does.
 */
export function buildOrchestrationPlan(
  topAction: PrioritizedAction | null,
  moments: FamilyMoment[],
  goals: FamilyGoal[],
  input: FamilyIntelligenceInput,
): OrchestrationPlan {
  const basePriority = topAction?.valueScore ?? 30;
  const moment = moments[0];
  const activeGoal = goals.find((g) => g.active);

  const notifications = {
    enabled: true,
    goal: topAction?.category ?? null,
    priority: topAction?.secondarySurfaces.includes("notifications") || topAction?.primarySurface === "notifications"
      ? basePriority
      : moment ? 60 : 20,
  };

  const amyAi = {
    enabled: topAction != null || moment != null,
    promptHint: topAction
      ? `Coach parent on: ${topAction.title}`
      : moment
        ? `Celebrate: ${moment.title}`
        : null,
    priority: topAction?.secondarySurfaces.includes("amy_ai") ? basePriority - 5 : 15,
  };

  const parentHub = {
    enabled: true,
    cardId: moment ? `moment_${moment.type}` : topAction ? `action_${topAction.category}` : null,
    priority: moment ? 70 : basePriority - 10,
  };

  const rewards = {
    enabled: moment != null && moment.coordinatedActions.some((a) => a.surface === "rewards"),
    rewardType: moment?.type ?? null,
    priority: moment ? 65 : 0,
  };

  const learningZone = {
    enabled: topAction?.category === "learning_problem" || activeGoal?.type === "learning" || activeGoal?.type === "reading",
    focusSubject: input.weakSubjects[0] ?? activeGoal?.type ?? null,
    priority: topAction?.category === "learning_problem" ? basePriority : activeGoal ? 50 : 10,
  };

  const events = {
    enabled: moment != null,
    eventType: moment?.type ?? null,
    priority: moment ? 55 : 0,
  };

  const subscriptions = {
    enabled: topAction?.category === "subscription_opportunity" && !input.isPremium,
    offerType: topAction?.category === "subscription_opportunity" ? "activation_offer" : null,
    priority: topAction?.category === "subscription_opportunity" ? basePriority : 0,
  };

  return {
    notifications,
    amyAi,
    parentHub,
    rewards,
    learningZone,
    events,
    subscriptions,
  };
}

export function shouldSurfaceOnProduct(
  plan: OrchestrationPlan,
  surface: keyof OrchestrationPlan,
): boolean {
  const entry = plan[surface];
  return entry.enabled && entry.priority >= 40;
}
