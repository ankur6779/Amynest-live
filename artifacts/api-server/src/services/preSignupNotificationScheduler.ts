/**
 * Pre-signup CRM journey tick — Segment 2 (Installed but Never Registered).
 * Uses synthetic userId `anon:{deviceId}` with existing dispatch pipeline.
 */
import { and, eq } from "drizzle-orm";
import {
  db,
  notificationJourneyEnrollmentsTable,
  type NotificationCategory,
} from "@workspace/db";
import {
  buildSegmentNotification,
  getLocalDateTimeParts,
  inLocalQuietHours,
  loadSegmentRemoteConfig,
  PRESIGNUP_JOURNEY,
  pickEligibleJourneyStep,
  preSignupServerFcmEnabled,
  resolvePreSignupSegment,
  segmentationMode,
} from "@workspace/notification-engine";
import { logger } from "../lib/logger.js";
import {
  anonymousUserId,
  listUnlinkedAnonymousDevices,
} from "./anonymousDeviceService.js";
import { dispatchNotification } from "./notificationDispatchService.js";

export async function runPreSignupNotificationTick(now = new Date()): Promise<{
  attempted: number;
  sent: number;
}> {
  if (!preSignupServerFcmEnabled()) return { attempted: 0, sent: 0 };
  if (segmentationMode() === "off") return { attempted: 0, sent: 0 };

  const rc = loadSegmentRemoteConfig();
  const devices = await listUnlinkedAnonymousDevices();
  let attempted = 0;
  let sent = 0;

  for (const device of devices) {
    attempted++;
    const tz = device.timezone ?? "Asia/Kolkata";
    const local = getLocalDateTimeParts(tz, now);
    const resolution = resolvePreSignupSegment();

    if (inLocalQuietHours(tz, "22:00", "07:00", now)) continue;
    if (local.hour !== rc.morningHourLocal && local.hour !== rc.eveningHourLocal) continue;

    const hoursSinceInstall =
      (now.getTime() - new Date(device.installAt).getTime()) / (1000 * 60 * 60);

    let [enrollment] = await db
      .select()
      .from(notificationJourneyEnrollmentsTable)
      .where(
        and(
          eq(notificationJourneyEnrollmentsTable.deviceId, device.deviceId),
          eq(notificationJourneyEnrollmentsTable.segment, resolution.segment),
        ),
      )
      .limit(1);

    if (!enrollment) {
      [enrollment] = await db
        .insert(notificationJourneyEnrollmentsTable)
        .values({
          deviceId: device.deviceId,
          segment: resolution.segment,
          journeyId: PRESIGNUP_JOURNEY.journeyId,
          enrolledAt: device.installAt,
        })
        .returning();
    }

    const completedSteps = (enrollment?.completedStepIds ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);

    const picked = pickEligibleJourneyStep(
      resolution.segment,
      hoursSinceInstall,
      {
        userId: anonymousUserId(device.deviceId),
        childId: null,
        childName: "your child",
        accountAgeDays: Math.floor(hoursSinceInstall / 24),
        daysSinceLastActive: Math.floor(hoursSinceInstall / 24),
        isPremium: false,
        isFreeTier: true,
        routineCompletionRate7d: 0,
        routinesCompletedToday: 0,
        routinesMissedYesterday: false,
        weeklyRoutineConsistency: 0,
        lessonsCompletedTotal: 0,
        lessonsCompleted7d: 0,
        weakSubjects: [],
        strongSubjects: [],
        unfinishedLessonCount: 0,
        currentStreakDays: 0,
        streakBrokenDaysAgo: null,
        hadSevenDayStreak: false,
        firstRoutineCompleted: false,
        firstLearningCompleted: false,
        firstWeekComplete: false,
        firstMonthComplete: false,
        activationJourneyDay: null,
        activationJourneyActive: false,
        notificationsOpened7d: 0,
        sessionsLast7d: 0,
        childLifecycleStage: "NEW_USER",
        parentMilestones: [],
        churnRisk7d: 0,
        churnRisk30d: 0,
        churnRisk90d: 0,
      },
      "none",
      completedSteps,
    );

    if (!picked || !enrollment) continue;

    const built = buildSegmentNotification(
      resolution.segment,
      picked.step,
      picked.stepIndex,
      PRESIGNUP_JOURNEY.journeyId,
      {
        userId: anonymousUserId(device.deviceId),
        childId: null,
        childName: "your child",
        accountAgeDays: Math.floor(hoursSinceInstall / 24),
        daysSinceLastActive: 0,
        isPremium: false,
        isFreeTier: true,
        routineCompletionRate7d: 0,
        routinesCompletedToday: 0,
        routinesMissedYesterday: false,
        weeklyRoutineConsistency: 0,
        lessonsCompletedTotal: 0,
        lessonsCompleted7d: 0,
        weakSubjects: [],
        strongSubjects: [],
        unfinishedLessonCount: 0,
        currentStreakDays: 0,
        streakBrokenDaysAgo: null,
        hadSevenDayStreak: false,
        firstRoutineCompleted: false,
        firstLearningCompleted: false,
        firstWeekComplete: false,
        firstMonthComplete: false,
        activationJourneyDay: null,
        activationJourneyActive: false,
        notificationsOpened7d: 0,
        sessionsLast7d: 0,
        childLifecycleStage: "NEW_USER",
        parentMilestones: [],
        churnRisk7d: 0,
        churnRisk30d: 0,
        churnRisk90d: 0,
      },
      tz,
      rc,
      device.locale ?? "en",
      local.localDate,
    );

    const syntheticUserId = anonymousUserId(device.deviceId);
    const category: NotificationCategory = "engagement";

    if (segmentationMode() === "shadow") {
      logger.info(
        {
          evt: "PRESIGNUP_CRM_SHADOW",
          deviceId: device.deviceId,
          stepId: picked.step.stepId,
        },
        "Pre-signup CRM shadow send",
      );
      continue;
    }

    const result = await dispatchNotification({
      userId: syntheticUserId,
      category,
      title: built.title,
      body: built.body,
      deepLink: built.deepLink,
      dedupKey: built.dedupKey,
      data: built.data,
      outcomeMeta: {
        goal: built.goal,
        campaignId: built.journeyId,
        campaignStep: built.stepIndex,
        segment: built.segment,
        journeyStepId: built.stepId,
      },
      globalMeta: {
        locale: device.locale,
        timezoneAtSend: tz,
      },
    });

    if (result.status === "sent") {
      sent++;
      const nextCompleted = [...completedSteps, picked.step.stepId].join(",");
      await db
        .update(notificationJourneyEnrollmentsTable)
        .set({
          currentStepId: picked.step.stepId,
          currentStepIndex: picked.stepIndex,
          lastStepSentAt: now,
          completedStepIds: nextCompleted,
        })
        .where(eq(notificationJourneyEnrollmentsTable.id, enrollment.id));
    }
  }

  return { attempted, sent };
}
