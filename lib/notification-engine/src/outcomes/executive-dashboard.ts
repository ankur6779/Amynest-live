import type { OutcomeAnalyticsSummary } from "./outcome-analytics.js";
import type { ExperimentResult } from "./experiments.js";
import type { NotificationGoal } from "./types.js";

export interface ExecutiveDashboardSummary {
  periodDays: number;
  notificationsSent: number;
  openRate: number;
  outcomeRate: number;
  routineUplift: number;
  learningUplift: number;
  retentionUplift: number;
  subscriptionUplift: number;
  roiByCategory: Array<{
    category: string;
    sent: number;
    outcomeRate: number;
    roiScore: number;
  }>;
  roiByGoal: Array<{
    goal: NotificationGoal;
    sent: number;
    outcomeRate: number;
    outcomeAfterOpenRate: number;
  }>;
  experiments: ExperimentResult[];
  topPerformingGoal: NotificationGoal | null;
  bottomPerformingGoal: NotificationGoal | null;
}

export function computeExecutiveDashboard(
  outcomeAnalytics: OutcomeAnalyticsSummary,
  experiments: ExperimentResult[],
  periodDays: number,
): ExecutiveDashboardSummary {
  const roiByCategory = outcomeAnalytics.byCategory
    .map((c) => ({
      category: c.category,
      sent: c.sent,
      outcomeRate: c.outcomeRate,
      roiScore: c.roiScore,
    }))
    .sort((a, b) => b.roiScore - a.roiScore);

  const roiByGoal = outcomeAnalytics.byGoal
    .map((g) => ({
      goal: g.goal,
      sent: g.sent,
      outcomeRate: g.outcomeRate,
      outcomeAfterOpenRate: g.outcomeAfterOpenRate,
    }))
    .sort((a, b) => b.outcomeRate - a.outcomeRate);

  const withData = roiByGoal.filter((g) => g.sent >= 5);
  const topPerformingGoal = withData[0]?.goal ?? null;
  const bottomPerformingGoal = withData.length > 0 ? withData[withData.length - 1]!.goal : null;

  const sent = outcomeAnalytics.totalSent;
  const routineUplift = sent > 0 ? outcomeAnalytics.routineCompletionAfterNotification / sent : 0;
  const learningUplift = sent > 0 ? outcomeAnalytics.learningCompletionAfterNotification / sent : 0;
  const retentionUplift = sent > 0 ? outcomeAnalytics.retentionAfterNotification / sent : 0;
  const subscriptionUplift = sent > 0 ? outcomeAnalytics.conversionAfterNotification / sent : 0;

  return {
    periodDays,
    notificationsSent: sent,
    openRate: outcomeAnalytics.openRate,
    outcomeRate: outcomeAnalytics.outcomeRate,
    routineUplift,
    learningUplift,
    retentionUplift,
    subscriptionUplift,
    roiByCategory,
    roiByGoal,
    experiments,
    topPerformingGoal,
    bottomPerformingGoal,
  };
}
