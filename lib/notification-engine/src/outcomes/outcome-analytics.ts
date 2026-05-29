import type { NotificationGoal, OutcomeEventType } from "./types.js";

export interface OutcomeAnalyticsRow {
  notificationLogId?: number;
  category: string;
  goal: NotificationGoal | null;
  sentAt: Date;
  openedAt: Date | null;
  outcomeEvent: OutcomeEventType | null;
  outcomeAt: Date | null;
}

export interface GoalOutcomeAnalytics {
  goal: NotificationGoal;
  sent: number;
  opened: number;
  outcomes: number;
  openRate: number;
  outcomeRate: number;
  outcomeAfterOpenRate: number;
}

export interface CategoryOutcomeAnalytics {
  category: string;
  sent: number;
  opened: number;
  routineOutcomes: number;
  learningOutcomes: number;
  retentionOutcomes: number;
  conversionOutcomes: number;
  outcomeRate: number;
  roiScore: number;
}

export interface OutcomeAnalyticsSummary {
  totalSent: number;
  totalOpened: number;
  openRate: number;
  routineCompletionAfterNotification: number;
  learningCompletionAfterNotification: number;
  retentionAfterNotification: number;
  conversionAfterNotification: number;
  outcomeRate: number;
  byGoal: GoalOutcomeAnalytics[];
  byCategory: CategoryOutcomeAnalytics[];
}

const ROUTINE_EVENTS = new Set<OutcomeEventType>(["routine_completed", "routine_started"]);
const LEARNING_EVENTS = new Set<OutcomeEventType>(["lesson_completed", "lesson_started"]);
const RETENTION_EVENTS = new Set<OutcomeEventType>(["session_returned", "streak_restored"]);
const CONVERSION_EVENTS = new Set<OutcomeEventType>([
  "subscription_started",
  "subscription_trial_started",
]);

const ATTRIBUTION_WINDOW_HOURS = 48;

export function computeOutcomeAnalytics(
  rows: OutcomeAnalyticsRow[],
  windowDays = 30,
  now = new Date(),
): OutcomeAnalyticsSummary {
  const cutoff = now.getTime() - windowDays * 86400000;
  const recent = rows.filter((r) => r.sentAt.getTime() >= cutoff);

  const sent = recent.length;
  const opened = recent.filter((r) => r.openedAt).length;

  let routineOutcomes = 0;
  let learningOutcomes = 0;
  let retentionOutcomes = 0;
  let conversionOutcomes = 0;

  for (const r of recent) {
    if (!r.outcomeEvent || !isAttributed(r)) continue;
    if (ROUTINE_EVENTS.has(r.outcomeEvent)) routineOutcomes++;
    if (LEARNING_EVENTS.has(r.outcomeEvent)) learningOutcomes++;
    if (RETENTION_EVENTS.has(r.outcomeEvent)) retentionOutcomes++;
    if (CONVERSION_EVENTS.has(r.outcomeEvent)) conversionOutcomes++;
  }

  const totalOutcomes = routineOutcomes + learningOutcomes + retentionOutcomes + conversionOutcomes;

  return {
    totalSent: sent,
    totalOpened: opened,
    openRate: sent > 0 ? opened / sent : 0,
    routineCompletionAfterNotification: routineOutcomes,
    learningCompletionAfterNotification: learningOutcomes,
    retentionAfterNotification: retentionOutcomes,
    conversionAfterNotification: conversionOutcomes,
    outcomeRate: sent > 0 ? totalOutcomes / sent : 0,
    byGoal: aggregateByGoal(recent),
    byCategory: aggregateByCategory(recent),
  };
}

function isAttributed(r: OutcomeAnalyticsRow): boolean {
  if (!r.outcomeAt) return false;
  const ref = r.openedAt ?? r.sentAt;
  const deltaH = (r.outcomeAt.getTime() - ref.getTime()) / 3600000;
  return deltaH >= 0 && deltaH <= ATTRIBUTION_WINDOW_HOURS;
}

function aggregateByGoal(rows: OutcomeAnalyticsRow[]): GoalOutcomeAnalytics[] {
  const map = new Map<
    string,
    { sent: number; opened: number; outcomes: number; outcomesAfterOpen: number }
  >();

  for (const r of rows) {
    const goal = r.goal ?? "GOAL_PARENT_ENGAGEMENT";
    const cur = map.get(goal) ?? { sent: 0, opened: 0, outcomes: 0, outcomesAfterOpen: 0 };
    cur.sent++;
    if (r.openedAt) cur.opened++;
    if (r.outcomeEvent && isAttributed(r)) {
      cur.outcomes++;
      if (r.openedAt) cur.outcomesAfterOpen++;
    }
    map.set(goal, cur);
  }

  return [...map.entries()].map(([goal, v]) => ({
    goal: goal as NotificationGoal,
    sent: v.sent,
    opened: v.opened,
    outcomes: v.outcomes,
    openRate: v.sent > 0 ? v.opened / v.sent : 0,
    outcomeRate: v.sent > 0 ? v.outcomes / v.sent : 0,
    outcomeAfterOpenRate: v.opened > 0 ? v.outcomesAfterOpen / v.opened : 0,
  }));
}

function aggregateByCategory(rows: OutcomeAnalyticsRow[]): CategoryOutcomeAnalytics[] {
  const map = new Map<
    string,
    {
      sent: number;
      opened: number;
      routine: number;
      learning: number;
      retention: number;
      conversion: number;
    }
  >();

  for (const r of rows) {
    const cur = map.get(r.category) ?? {
      sent: 0,
      opened: 0,
      routine: 0,
      learning: 0,
      retention: 0,
      conversion: 0,
    };
    cur.sent++;
    if (r.openedAt) cur.opened++;
    if (r.outcomeEvent && isAttributed(r)) {
      if (ROUTINE_EVENTS.has(r.outcomeEvent)) cur.routine++;
      if (LEARNING_EVENTS.has(r.outcomeEvent)) cur.learning++;
      if (RETENTION_EVENTS.has(r.outcomeEvent)) cur.retention++;
      if (CONVERSION_EVENTS.has(r.outcomeEvent)) cur.conversion++;
    }
    map.set(r.category, cur);
  }

  return [...map.entries()].map(([category, v]) => {
    const outcomes = v.routine + v.learning + v.retention + v.conversion;
    const outcomeRate = v.sent > 0 ? outcomes / v.sent : 0;
    const openRate = v.sent > 0 ? v.opened / v.sent : 0;
    const roiScore = Math.round(outcomeRate * 100 + openRate * 20);
    return {
      category,
      sent: v.sent,
      opened: v.opened,
      routineOutcomes: v.routine,
      learningOutcomes: v.learning,
      retentionOutcomes: v.retention,
      conversionOutcomes: v.conversion,
      outcomeRate,
      roiScore,
    };
  });
}
