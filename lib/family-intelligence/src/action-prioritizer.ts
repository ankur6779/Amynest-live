import type {
  ActionCategory,
  FamilyIntelligenceInput,
  InterventionPlan,
  PrioritizedAction,
  ProductSurface,
  RiskAssessment,
} from "./types.js";

export function prioritizeActions(
  risks: RiskAssessment,
  plans: InterventionPlan[],
  input: FamilyIntelligenceInput,
): PrioritizedAction[] {
  const actions: PrioritizedAction[] = [];

  if (risks.routineCollapseRisk >= 0.35) {
    actions.push({
      rank: 0,
      category: "routine_problem",
      title: "Fix routine consistency",
      description: `${input.childName}'s routine completion is ${Math.round(input.routineCompletionRate7d * 100)}% — simplify to rebuild the habit.`,
      primarySurface: "routine",
      secondarySurfaces: ["notifications", "amy_ai"],
      valueScore: Math.round(risks.routineCollapseRisk * 100),
      suppressOthers: risks.routineCollapseRisk >= 0.65,
    });
  }

  if (risks.learningDisengagementRisk >= 0.3) {
    const subject = input.weakSubjects[0] ?? "learning";
    actions.push({
      rank: 0,
      category: "learning_problem",
      title: `Boost ${subject}`,
      description: `${input.lessonsCompleted7d} lessons this week — one focused session closes the gap.`,
      primarySurface: "learning_zone",
      secondarySurfaces: ["notifications", "parent_hub"],
      valueScore: Math.round(risks.learningDisengagementRisk * 100),
      suppressOthers: false,
    });
  }

  if (risks.parentChurnRisk >= 0.4) {
    actions.push({
      rank: 0,
      category: "retention_problem",
      title: "Prevent churn",
      description: `${input.daysSinceLastActive} days since last visit — restart with a 2-minute win.`,
      primarySurface: "notifications",
      secondarySurfaces: ["amy_ai", "parent_hub"],
      valueScore: Math.round(risks.parentChurnRisk * 100),
      suppressOthers: risks.parentChurnRisk >= 0.7,
    });
  }

  if (!input.isPremium && input.lessonsCompletedTotal >= 10 && risks.parentChurnRisk < 0.5) {
    actions.push({
      rank: 0,
      category: "subscription_opportunity",
      title: "Conversion opportunity",
      description: "Family is activated — Premium unlocks advanced paths.",
      primarySurface: "subscriptions",
      secondarySurfaces: ["parent_hub"],
      valueScore: 50 + input.lessonsCompletedTotal,
      suppressOthers: false,
    });
  }

  for (const plan of plans) {
    if (actions.some((a) => a.category === plan.risk)) continue;
    actions.push({
      rank: 0,
      category: plan.risk,
      title: plan.title,
      description: plan.description,
      primarySurface: plan.surfaces[0] ?? "parent_hub",
      secondarySurfaces: plan.surfaces.slice(1),
      valueScore: plan.priority,
      suppressOthers: plan.proactive && plan.priority >= 70,
    });
  }

  actions.sort((a, b) => b.valueScore - a.valueScore);
  return actions.map((a, i) => ({ ...a, rank: i + 1 }));
}

export function selectTopAction(actions: PrioritizedAction[]): PrioritizedAction | null {
  if (actions.length === 0) return null;
  const top = actions[0]!;
  if (top.suppressOthers) return top;
  return top;
}

export function surfaceForCategory(cat: ActionCategory): ProductSurface {
  switch (cat) {
    case "routine_problem": return "routine";
    case "learning_problem": return "learning_zone";
    case "retention_problem": return "notifications";
    case "subscription_opportunity": return "subscriptions";
  }
}
