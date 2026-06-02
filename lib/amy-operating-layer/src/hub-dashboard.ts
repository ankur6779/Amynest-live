import { buildCommandCenter } from "@workspace/family-intelligence";
import {
  resolveRoutedAction,
  surfaceToAction,
  PLAYBOOK_TARGET_MAP,
  type ActionTarget,
  type RoutedAction,
} from "@workspace/action-routing";
import type { AmyOperatingContext, ExplainedRecommendation } from "./types.js";

export interface HubRoutedAction {
  actionTarget: ActionTarget;
  entityId?: string | null;
  href: string;
  fallbackTarget: ActionTarget;
  params?: Record<string, string | number | boolean | null | undefined>;
}

export interface HubPrimaryAction {
  id: string;
  title: string;
  description: string;
  why: string;
  href: string;
  surface: string;
  action: HubRoutedAction;
}

export interface HubAmyRecommendation {
  title: string;
  why: string;
  suggestedQuestion: string;
  action: HubRoutedAction;
}

export interface HubActiveCampaign {
  id: string;
  title: string;
  subtitle: string;
  progressPct: number;
  currentStep: number;
  totalSteps: number;
  action: HubRoutedAction;
}

export interface HubMetricCard {
  label: string;
  pct: number;
  action: HubRoutedAction;
}

export interface HubDashboardView {
  childName: string;
  computedAt: string;
  healthScore: number;
  healthTrend7d: number;
  healthTrendLabel: string;
  narration: string;
  primaryAction: HubPrimaryAction | null;
  weeklyWins: string[];
  currentRisks: string[];
  goals: AmyOperatingContext["goalCoach"];
  learningProgressPct: number;
  routineConsistencyPct: number;
  learningMetric: HubMetricCard;
  routineMetric: HubMetricCard;
  familyHealthAction: HubRoutedAction;
  amyRecommendation: HubAmyRecommendation;
  activeCampaigns: HubActiveCampaign[];
  timelineHighlights: AmyOperatingContext["executiveMode"]["timeline"];
  suggestedQuestions: string[];
  engineVersion: string;
}

function toHubAction(action: RoutedAction): HubRoutedAction {
  const resolved = resolveRoutedAction(action);
  return {
    actionTarget: resolved.actionTarget,
    entityId: resolved.entityId != null ? String(resolved.entityId) : null,
    href: resolved.path,
    fallbackTarget: action.fallbackTarget ?? "parent_hub",
    params: action.params,
  };
}

function surfaceToHubAction(
  surface: string,
  params?: RoutedAction["params"],
  entityId?: string | null,
): HubRoutedAction {
  return toHubAction(surfaceToAction(surface, entityId, params));
}

function explainedToAction(rec: ExplainedRecommendation, index: number): HubPrimaryAction {
  const surface = rec.surfaces[0] ?? "parent_hub";
  const action = surfaceToHubAction(surface, { q: rec.title });

  return {
    id: `primary_${index}`,
    title: rec.title,
    description: rec.description,
    why: rec.why,
    href: action.href,
    surface,
    action,
  };
}

function buildAmyRecommendation(ctx: AmyOperatingContext): HubAmyRecommendation {
  const secondary = ctx.dailyBriefing.recommendedActions[1];
  if (secondary) {
    const action = explainedToAction(secondary, 1).action;
    return {
      title: secondary.title,
      why: secondary.why,
      suggestedQuestion: ctx.dailyBriefing.suggestedQuestions[0] ?? "What should we focus on today?",
      action: {
        ...action,
        params: { ...action.params, q: secondary.title },
        href: resolveRoutedAction({
          actionTarget: "amy_chat",
          params: { q: secondary.title },
          fallbackTarget: "parent_hub",
        }).path,
      },
    };
  }

  const goal = ctx.goalCoach.goals.find((g) => g.active);
  if (goal) {
    const action = toHubAction({
      actionTarget: "goal",
      entityId: goal.id,
      fallbackTarget: "amy_chat",
    });
    return {
      title: goal.coachMessage,
      why: `${ctx.snapshot.childName}'s ${goal.type} goal is ${goal.progress}% complete — ${goal.onTrack ? "on track" : "needs a nudge"}.`,
      suggestedQuestion: ctx.dailyBriefing.suggestedQuestions[0] ?? "How are we doing on our goals?",
      action,
    };
  }

  const focus = ctx.weeklyReview.nextWeekFocus[0];
  const action = toHubAction({
    actionTarget: "weekly_review",
    fallbackTarget: "parent_hub",
  });
  return {
    title: focus ?? ctx.executiveMode.narration.slice(0, 120),
    why: ctx.weeklyReview.executiveSummary.slice(0, 200),
    suggestedQuestion: ctx.dailyBriefing.suggestedQuestions[0] ?? "How are we doing?",
    action,
  };
}

function buildActiveCampaigns(ctx: AmyOperatingContext): HubActiveCampaign[] {
  const campaigns: HubActiveCampaign[] = [];

  if (ctx.activePlaybook) {
    const total = ctx.activePlaybook.steps.length;
    const current = Math.min(1, total);
    const step = ctx.activePlaybook.steps[0];
    const action = step
      ? surfaceToHubAction(step.surface)
      : surfaceToHubAction(PLAYBOOK_TARGET_MAP[ctx.activePlaybook.id] ?? "parent_hub");
    campaigns.push({
      id: ctx.activePlaybook.id,
      title: ctx.activePlaybook.title,
      subtitle: ctx.activePlaybook.triggerCondition,
      progressPct: total > 0 ? Math.round((current / total) * 100) : 0,
      currentStep: current,
      totalSteps: total,
      action,
    });
  }

  for (const msg of ctx.proactiveMessages.filter((m) => m.playbookId && m.urgency !== "high").slice(0, 2)) {
    if (campaigns.some((c) => c.id === msg.playbookId)) continue;
    const target = msg.playbookId ? PLAYBOOK_TARGET_MAP[msg.playbookId] ?? "campaign" : "parent_hub";
    campaigns.push({
      id: msg.id,
      title: msg.title,
      subtitle: msg.body.slice(0, 80),
      progressPct: 0,
      currentStep: 0,
      totalSteps: 0,
      action: toHubAction({ actionTarget: target, entityId: msg.playbookId ?? msg.id, fallbackTarget: "parent_hub" }),
    });
  }

  return campaigns.slice(0, 3);
}

/** Single payload for Parent Hub executive dashboard — one round trip. */
export function buildHubDashboardView(ctx: AmyOperatingContext): HubDashboardView {
  const cmd = buildCommandCenter(ctx.snapshot);
  const primaryRec = ctx.dailyBriefing.recommendedActions[0] ?? null;

  const risks = [
    ...new Set([
      ...ctx.dailyBriefing.risks.slice(0, 4),
      cmd.risk.primary,
    ].filter(Boolean)),
  ].slice(0, 4);

  const wins = ctx.dailyBriefing.wins.slice(0, 5);

  const learningMetric: HubMetricCard = {
    label: "Learning",
    pct: ctx.snapshot.successMetrics.learningSuccess,
    action: toHubAction({ actionTarget: "learning_subject", fallbackTarget: "parent_hub" }),
  };

  const routineMetric: HubMetricCard = {
    label: "Routine",
    pct: ctx.snapshot.successMetrics.routineSuccess,
    action: toHubAction({ actionTarget: "routine", fallbackTarget: "parent_hub" }),
  };

  const familyHealthAction = toHubAction({
    actionTarget: "family_health",
    fallbackTarget: "parent_hub",
  });

  return {
    childName: ctx.snapshot.childName,
    computedAt: ctx.snapshot.computedAt,
    healthScore: ctx.snapshot.health.score,
    healthTrend7d: ctx.snapshot.health.trend7d,
    healthTrendLabel: cmd.familyHealth.trendLabel,
    narration: ctx.executiveMode.narration,
    primaryAction: primaryRec ? explainedToAction(primaryRec, 0) : null,
    weeklyWins: wins,
    currentRisks: risks,
    goals: ctx.goalCoach,
    learningProgressPct: ctx.snapshot.successMetrics.learningSuccess,
    routineConsistencyPct: ctx.snapshot.successMetrics.routineSuccess,
    learningMetric,
    routineMetric,
    familyHealthAction,
    amyRecommendation: buildAmyRecommendation(ctx),
    activeCampaigns: buildActiveCampaigns(ctx),
    timelineHighlights: ctx.executiveMode.timeline.slice(0, 5),
    suggestedQuestions: ctx.dailyBriefing.suggestedQuestions.slice(0, 3),
    engineVersion: ctx.engineVersion,
  };
}
