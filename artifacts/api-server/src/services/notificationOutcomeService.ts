import { and, desc, eq, gte, isNull } from "drizzle-orm";
import {
  db,
  childrenTable,
  childLearningProgressTable,
  notificationLogTable,
  parentProfilesTable,
  pushTokensTable,
  routinesTable,
  subscriptionsTable,
  userActivationJourneyTable,
} from "@workspace/db";
import type { OutcomeSignals } from "@workspace/notification-engine";
import { detectChildLifecycleStage, detectParentMilestones } from "@workspace/notification-engine";

function todayLocalDateString(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function routineItemsCompleted(items: unknown): { completed: number; total: number } {
  const list = (items ?? []) as Array<{ status?: string }>;
  let completed = 0;
  for (const it of list) {
    if (it.status === "completed" || it.status === "done") completed++;
  }
  return { completed, total: list.length };
}

/**
 * Load behavioral signals from AmyNest data for outcome optimization.
 */
export async function loadOutcomeSignals(
  userId: string,
  timezone: string,
): Promise<OutcomeSignals | null> {
  const [child] = await db
    .select({
      id: childrenTable.id,
      name: childrenTable.name,
      createdAt: childrenTable.createdAt,
    })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .orderBy(desc(childrenTable.createdAt))
    .limit(1);

  const [profile] = await db
    .select({ createdAt: parentProfilesTable.createdAt })
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, userId))
    .limit(1);

  const accountStart = profile?.createdAt ?? child?.createdAt ?? new Date();
  const accountAgeDays = daysBetween(accountStart, new Date());

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [subscription, activationJourney, lastToken, recentOpens] = await Promise.all([
    db
      .select({ status: subscriptionsTable.status, plan: subscriptionsTable.plan })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({
        currentDay: userActivationJourneyTable.currentDay,
        completedDays: userActivationJourneyTable.completedDays,
        completedAt: userActivationJourneyTable.completedAt,
      })
      .from(userActivationJourneyTable)
      .where(eq(userActivationJourneyTable.userId, userId))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({ lastSeenAt: pushTokensTable.lastSeenAt })
      .from(pushTokensTable)
      .where(eq(pushTokensTable.userId, userId))
      .orderBy(desc(pushTokensTable.lastSeenAt))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({ openedAt: notificationLogTable.openedAt })
      .from(notificationLogTable)
      .where(
        and(
          eq(notificationLogTable.userId, userId),
          gte(notificationLogTable.sentAt, sevenDaysAgo),
        ),
      )
      .then((rows) => rows.filter((r) => r.openedAt).length),
  ]);

  const isPremium =
    subscription?.status === "active" ||
    subscription?.status === "trialing" ||
    (subscription?.plan != null && subscription.plan !== "free");

  const lastActive = lastToken?.lastSeenAt ?? accountStart;
  const daysSinceLastActive = daysBetween(lastActive, new Date());

  let routineCompletionRate7d = 0;
  let routinesCompletedToday = 0;
  let routinesMissedYesterday = false;
  let weeklyRoutineConsistency = 0;
  let currentStreakDays = 0;
  let streakBrokenDaysAgo: number | null = null;
  let hadSevenDayStreak = false;
  let firstRoutineCompleted = false;

  if (child) {
    const localToday = todayLocalDateString(timezone);
    const routines = await db
      .select({ items: routinesTable.items, date: routinesTable.date })
      .from(routinesTable)
      .where(
        and(
          eq(routinesTable.childId, child.id),
          gte(routinesTable.createdAt, thirtyDaysAgo),
        ),
      )
      .orderBy(desc(routinesTable.date))
      .limit(30);

    let completed7 = 0;
    let total7 = 0;
    let daysWithRoutine = 0;
    let daysCompleted = 0;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(yesterday);

    for (const r of routines) {
      const { completed, total } = routineItemsCompleted(r.items);
      if (total === 0) continue;

      const routineAge = daysBetween(new Date(r.date), new Date());
      if (routineAge <= 7) {
        completed7 += completed;
        total7 += total;
      }

      daysWithRoutine++;
      if (completed > 0) {
        daysCompleted++;
        if (!firstRoutineCompleted) firstRoutineCompleted = true;
      }

      if (r.date === localToday && completed > 0) routinesCompletedToday = completed;
      if (r.date === yesterdayStr && completed === 0 && total > 0) {
        routinesMissedYesterday = true;
      }
    }

    routineCompletionRate7d = total7 > 0 ? completed7 / total7 : 0;
    weeklyRoutineConsistency = daysWithRoutine > 0 ? daysCompleted / daysWithRoutine : 0;

    let streak = 0;
    for (const r of routines) {
      const { completed, total } = routineItemsCompleted(r.items);
      if (total > 0 && completed >= Math.ceil(total * 0.5)) {
        streak++;
      } else {
        break;
      }
    }
    currentStreakDays = streak;
    if (streak >= 7) hadSevenDayStreak = true;

    if (currentStreakDays === 0 && daysWithRoutine > 0) {
      for (let i = 0; i < routines.length; i++) {
        const r = routines[i]!;
        const { completed, total } = routineItemsCompleted(r.items);
        if (total > 0 && completed >= Math.ceil(total * 0.5)) break;
        if (i === 0 && total > 0 && completed === 0) {
          streakBrokenDaysAgo = 1;
        }
      }
      if (routinesMissedYesterday && streakBrokenDaysAgo == null) {
        streakBrokenDaysAgo = 2;
      }
    }
  }

  let lessonsCompletedTotal = 0;
  let lessonsCompleted7d = 0;
  const weakSubjects: string[] = [];
  const strongSubjects: string[] = [];
  let unfinishedLessonCount = 0;
  let firstLearningCompleted = false;

  if (child) {
    const learningRows = await db
      .select({
        subject: childLearningProgressTable.subject,
        weakTopics: childLearningProgressTable.weakTopics,
        lastActiveAt: childLearningProgressTable.lastActiveAt,
        accuracyRecent: childLearningProgressTable.accuracyRecent,
      })
      .from(childLearningProgressTable)
      .where(eq(childLearningProgressTable.childId, child.id));

    for (const row of learningRows) {
      const recent = (row.accuracyRecent ?? []) as Array<{ correct?: boolean; ts?: string }>;
      lessonsCompletedTotal += recent.length;
      const recent7 = recent.filter((a) => {
        if (!a.ts) return false;
        return new Date(a.ts).getTime() >= sevenDaysAgo.getTime();
      });
      lessonsCompleted7d += recent7.length;
      if (recent.length > 0) firstLearningCompleted = true;

      const weak = (row.weakTopics ?? []) as string[];
      if (weak.length > 0) weakSubjects.push(row.subject);
      else if (recent7.length >= 3) strongSubjects.push(row.subject);

      if (row.lastActiveAt && row.lastActiveAt.getTime() < sevenDaysAgo.getTime() && weak.length > 0) {
        unfinishedLessonCount++;
      }
    }
  }

  const sessionsLast7d = Math.max(
    0,
    7 - Math.min(daysSinceLastActive, 7),
  );

  const partial: OutcomeSignals = {
    userId,
    childId: child?.id ?? null,
    childName: child?.name ?? "your child",
    accountAgeDays,
    daysSinceLastActive,
    isPremium,
    isFreeTier: !isPremium,
    routineCompletionRate7d,
    routinesCompletedToday,
    routinesMissedYesterday,
    weeklyRoutineConsistency,
    lessonsCompletedTotal,
    lessonsCompleted7d,
    weakSubjects,
    strongSubjects,
    unfinishedLessonCount,
    currentStreakDays,
    streakBrokenDaysAgo,
    hadSevenDayStreak,
    firstRoutineCompleted,
    firstLearningCompleted,
    firstWeekComplete: accountAgeDays >= 7,
    firstMonthComplete: accountAgeDays >= 28,
    activationJourneyDay: activationJourney?.completedAt
      ? null
      : activationJourney?.currentDay ?? null,
    activationJourneyActive: Boolean(
      activationJourney && !activationJourney.completedAt,
    ),
    notificationsOpened7d: recentOpens,
    sessionsLast7d,
    childLifecycleStage: "ACTIVE",
    parentMilestones: [],
    churnRisk7d: 0,
    churnRisk30d: 0,
    churnRisk90d: 0,
  };

  partial.childLifecycleStage = detectChildLifecycleStage(partial);
  partial.parentMilestones = detectParentMilestones(partial);

  return partial;
}

export async function loadCampaignProgress(userId: string) {
  const { notificationCampaignProgressTable } = await import("@workspace/db");
  const [row] = await db
    .select()
    .from(notificationCampaignProgressTable)
    .where(
      and(
        eq(notificationCampaignProgressTable.userId, userId),
        isNull(notificationCampaignProgressTable.completedAt),
      ),
    )
    .orderBy(desc(notificationCampaignProgressTable.startedAt))
    .limit(1);
  if (!row) return null;
  return {
    campaignId: row.campaignId,
    currentStep: row.currentStep,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    stepCompletedAt: row.stepCompletedAt,
  };
}
