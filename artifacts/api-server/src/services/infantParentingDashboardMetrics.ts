export type DashboardAlert = {
  code: string;
  severity: "warning" | "critical";
  message: string;
  current: number;
  previous: number;
  changePct: number;
};

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildAlerts(input: {
  activationRateCurrent: number;
  activationRatePrevious: number;
  cryUsageCurrent: number;
  cryUsagePrevious: number;
  notifOpenRateCurrent: number;
  notifOpenRatePrevious: number;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  const actDrop = pctChange(input.activationRateCurrent, input.activationRatePrevious);
  if (actDrop <= -15) {
    alerts.push({
      code: "activation_rate_drop",
      severity: "warning",
      message: "Activation completion rate dropped more than 15% vs prior period",
      current: input.activationRateCurrent,
      previous: input.activationRatePrevious,
      changePct: actDrop,
    });
  }

  const cryDrop = pctChange(input.cryUsageCurrent, input.cryUsagePrevious);
  if (cryDrop <= -20) {
    alerts.push({
      code: "cry_insight_usage_drop",
      severity: "warning",
      message: "Cry Insight usage dropped more than 20% vs prior period",
      current: input.cryUsageCurrent,
      previous: input.cryUsagePrevious,
      changePct: cryDrop,
    });
  }

  const openDrop = pctChange(input.notifOpenRateCurrent, input.notifOpenRatePrevious);
  if (openDrop <= -20) {
    alerts.push({
      code: "notification_open_rate_drop",
      severity: "warning",
      message: "Infant notification open rate dropped more than 20% vs prior period",
      current: input.notifOpenRateCurrent,
      previous: input.notifOpenRatePrevious,
      changePct: openDrop,
    });
  }

  return alerts;
}

type EventRow = {
  userId: string;
  event: string;
  createdAt: Date;
};

/** Cohort = first infant_hub_opened; return % with activity on D+1, D+7, D+30. */
export function computeRetentionCohorts(
  rows: EventRow[],
  windowDays: number,
): { d1: number; d7: number; d30: number; cohortSize: number } {
  const cohortStart = new Map<string, number>();
  for (const row of rows) {
    if (row.event !== "infant_hub_opened") continue;
    const ts = row.createdAt.getTime();
    const prev = cohortStart.get(row.userId);
    if (prev == null || ts < prev) cohortStart.set(row.userId, ts);
  }

  const activityDays = new Map<string, Set<number>>();
  for (const row of rows) {
    const start = cohortStart.get(row.userId);
    if (start == null) continue;
    const dayOffset = Math.floor((row.createdAt.getTime() - start) / 86400000);
    if (dayOffset < 0) continue;
    if (!activityDays.has(row.userId)) activityDays.set(row.userId, new Set());
    activityDays.get(row.userId)!.add(dayOffset);
  }

  const cohortSize = cohortStart.size;
  if (cohortSize === 0) return { d1: 0, d7: 0, d30: 0, cohortSize: 0 };

  const retained = (targetDay: number) => {
    let hit = 0;
    let eligibleCount = 0;
    for (const [userId, start] of cohortStart.entries()) {
      const ageDays = Math.floor((Date.now() - start) / 86400000);
      if (ageDays < targetDay) continue;
      eligibleCount++;
      const days = activityDays.get(userId);
      if (days?.has(targetDay) || (days && [...days].some((d) => d >= targetDay && d <= targetDay + 1))) {
        hit++;
      }
    }
    return eligibleCount > 0 ? Math.round((hit / eligibleCount) * 100) : 0;
  };

  return {
    d1: retained(1),
    d7: retained(7),
    d30: windowDays >= 30 ? retained(30) : 0,
    cohortSize,
  };
}

export function countDistinctUsers(
  rows: Array<{ userId: string; event: string }>,
  events: string[],
): number {
  const set = new Set<string>();
  for (const row of rows) {
    if (events.includes(row.event)) set.add(row.userId);
  }
  return set.size;
}

export function countEvents(rows: Array<{ event: string }>, events: string[]): number {
  return rows.filter((r) => events.includes(r.event)).length;
}
