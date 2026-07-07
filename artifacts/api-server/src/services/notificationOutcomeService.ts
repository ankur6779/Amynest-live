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
import type { OutcomeSignals, SubscriptionStatus } from "@workspace/notification-engine";
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

  const [subscription, activationJourney, lastToken, recentLog] = await Promise.all([
    db
      .select({
        status: subscriptionsTable.status,
        plan: subscriptionsTable.plan,
        provider: subscriptionsTable.provider,
        subscriptionState: subscriptionsTable.subscriptionState,
        providerSubscriptionId: subscriptionsTable.providerSubscriptionId,
        trialEndsAt: subscriptionsTable.trialEndsAt,
        currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
        expiresAt: subscriptionsTable.expiresAt,
        cancelAtPeriodEnd: subscriptionsTable.cancelAtPeriodEnd,
      })
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
      .select({
        openedAt: notificationLogTable.openedAt,
        dismissedAt: notificationLogTable.dismissedAt,
        status: notificationLogTable.status,
        sentAt: notificationLogTable.sentAt,
      })
      .from(notificationLogTable)
      .where(
        and(
          eq(notificationLogTable.userId, userId),
          gte(notificationLogTable.sentAt, sevenDaysAgo),
        ),
      )
      .orderBy(desc(notificationLogTable.sentAt)),
  ]);

  // Delivered notifications only (exclude throttled/duplicate/no_tokens rows).
  const deliveredLog = recentLog.filter((r) => r.status === "sent");
  const recentOpens = deliveredLog.filter((r) => r.openedAt).length;
  const dismissed7d = deliveredLog.filter((r) => r.dismissedAt).length;
  const notificationsSent7d = deliveredLog.length;
  // Consecutive ignores: walk newest→oldest until we hit an opened notification.
  let consecutiveIgnored = 0;
  for (const r of deliveredLog) {
    if (r.openedAt) break;
    consecutiveIgnored++;
  }

  const isPremium =
    subscription?.status === "active" ||
    subscription?.status === "trialing" ||
    (subscription?.plan != null && subscription.plan !== "free");

  const subscriptionSignals = subscription
    ? buildSubscriptionSignals(subscription)
    : undefined;

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
  let routineDaysCompleted7d = 0;

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
        if (completed > 0) routineDaysCompleted7d++;
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
    subscription: subscriptionSignals,
    engagement: {
      notificationsSent7d,
      notificationsDismissed7d: dismissed7d,
      consecutiveIgnored,
      preferredHourLocal: null,
      preferredHourConfidence: 0,
      permissionGranted: true,
    },
    // Per-domain activity for persona/value engines. Only the domains AmyNest
    // can cheaply measure today are populated; speech/nutrition/stories/
    // worksheets/coach are left undefined (treated as 0) until their event
    // sources are wired — the engines degrade gracefully.
    activity: {
      routinesCompleted7d: routineDaysCompleted7d,
      lessonsCompleted7d,
      weekdayActiveDays7d: Math.min(5, sessionsLast7d),
      weekendActiveDays7d: Math.max(0, Math.min(2, sessionsLast7d - 5)),
    },
  };

  partial.childLifecycleStage = detectChildLifecycleStage(partial);
  partial.parentMilestones = detectParentMilestones(partial);

  return partial;
}

interface SubscriptionRow {
  status: string;
  plan: string;
  provider: string;
  subscriptionState: string;
  providerSubscriptionId: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  expiresAt: Date | null;
  cancelAtPeriodEnd: number;
}

/** Whole days from now until `at` (0 = today, negative = already past). */
function daysUntil(at: Date | null): number | null {
  if (!at) return null;
  return Math.ceil((at.getTime() - Date.now()) / 86400000);
}

/**
 * Map a subscriptions row into the notification engine's lifecycle signals.
 * Uses subscriptionState as the source of truth (it encodes GRACE_PERIOD /
 * CANCELLED / EXPIRED beyond the coarse `status` column).
 */
function buildSubscriptionSignals(row: SubscriptionRow): OutcomeSignals["subscription"] {
  let status: SubscriptionStatus;
  switch (row.subscriptionState) {
    case "TRIAL": status = "trialing"; break;
    case "ACTIVE": status = "active"; break;
    case "GRACE_PERIOD": status = "past_due"; break;
    case "CANCELLED": status = "canceled"; break;
    case "EXPIRED": status = "expired"; break;
    case "FREE":
    default:
      // Fall back to the coarse status column for legacy rows.
      status =
        row.status === "trialing" || row.status === "active" ||
        row.status === "past_due" || row.status === "canceled"
          ? (row.status as SubscriptionStatus)
          : "free";
  }

  const everSubscribed =
    row.provider !== "none" ||
    row.providerSubscriptionId != null ||
    (row.subscriptionState !== "FREE" && row.subscriptionState !== "TRIAL");

  const lapseAt = row.currentPeriodEnd ?? row.expiresAt;

  return {
    status,
    trialDaysRemaining: status === "trialing" ? daysUntil(row.trialEndsAt) : null,
    subscriptionDaysRemaining:
      status === "canceled" || status === "past_due" || row.cancelAtPeriodEnd === 1
        ? daysUntil(lapseAt)
        : null,
    everSubscribed,
  };
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
