/**
 * CRM segmentation journey orchestration for registered users.
 * Runs alongside (not replacing) the global scheduled notification jobs.
 */
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import {
  db,
  notificationJourneyEnrollmentsTable,
  notificationLogTable,
  type NotificationCategory,
} from "@workspace/db";
import {
  buildSegmentNotification,
  decideCrmNotification,
  getLocalDateTimeParts,
  inLocalQuietHours,
  journeyForSegment,
  loadSegmentRemoteConfig,
  pickEligibleJourneyStep,
  resolveAudienceSegment,
  segmentationMode,
  type OutcomeSignals,
  type SegmentationMode,
} from "@workspace/notification-engine";
import type { notificationPreferencesTable } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { dispatchNotification } from "./notificationDispatchService.js";

type PrefsRow = typeof notificationPreferencesTable.$inferSelect;

export interface SegmentJourneyTickResult {
  attempted: number;
  sent: number;
  skipped: number;
  delayed: number;
  shadow: number;
}

function parseCompletedSteps(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function appendCompletedStep(existing: string | null, stepId: string): string {
  const set = new Set(parseCompletedSteps(existing));
  set.add(stepId);
  return [...set].join(",");
}

async function countCrmNonCriticalToday(userId: string, timezone: string): Promise<number> {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localDate = fmt.format(new Date());
  const result = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count FROM notification_log
    WHERE user_id = ${userId}
      AND status = 'sent'
      AND segment IS NOT NULL
      AND (sent_at AT TIME ZONE ${timezone})::date = ${localDate}::date
  `);
  return Number(result.rows[0]?.count ?? 0);
}

function isInPreferredSendWindow(
  localHour: number,
  morningHour: number,
  eveningHour: number,
): boolean {
  return localHour === morningHour || localHour === eveningHour;
}

async function getOrCreateEnrollment(
  userId: string,
  segment: string,
  journeyId: string,
): Promise<typeof notificationJourneyEnrollmentsTable.$inferSelect> {
  const [existing] = await db
    .select()
    .from(notificationJourneyEnrollmentsTable)
    .where(
      and(
        eq(notificationJourneyEnrollmentsTable.userId, userId),
        eq(notificationJourneyEnrollmentsTable.segment, segment),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(notificationJourneyEnrollmentsTable)
    .values({
      userId,
      segment,
      journeyId,
      enrolledAt: new Date(),
    })
    .returning();

  return created!;
}

/**
 * Attempt one CRM journey notification for a registered user.
 * Called once per user per global schedule tick — before scheduled jobs.
 */
export async function runSegmentJourneyForUser(
  userId: string,
  prefs: PrefsRow,
  signals: OutcomeSignals,
  countryCode: string | null,
  now = new Date(),
  mode: SegmentationMode = segmentationMode(),
): Promise<"sent" | "skipped" | "delayed" | "shadow" | "none"> {
  if (mode === "off") return "none";

  const rc = loadSegmentRemoteConfig();

  const resolution = resolveAudienceSegment(signals);
  const segment = resolution.segment;

  if (segment === "REGISTERED_ACTIVE") return "none";
  if (rc.journeysEnabled[segment] === false) return "none";

  const journey = journeyForSegment(segment);
  if (!journey) return "none";

  const tz = prefs.timezone;
  const local = getLocalDateTimeParts(tz, now);

  if (
    !isInPreferredSendWindow(local.hour, rc.morningHourLocal, rc.eveningHourLocal) &&
    segment !== "FREE_BEHAVIORAL"
  ) {
    return "delayed";
  }

  const enrollment = await getOrCreateEnrollment(userId, segment, journey.journeyId);
  const hoursSinceEntry =
    (now.getTime() - new Date(enrollment.enrolledAt).getTime()) / (1000 * 60 * 60);

  const completedSteps = parseCompletedSteps(enrollment.completedStepIds);
  const picked = pickEligibleJourneyStep(
    segment,
    hoursSinceEntry,
    signals,
    resolution.behavioralTrigger,
    completedSteps,
  );

  if (!picked) return "none";

  const crmSentToday = await countCrmNonCriticalToday(userId, tz);
  const quiet = inLocalQuietHours(tz, prefs.quietHoursStart, prefs.quietHoursEnd, now);

  const decision = decideCrmNotification({
    segment,
    lifecycleStage: resolution.lifecycleStage,
    step: picked.step,
    signals,
    inQuietHours: quiet,
    crmNonCriticalSentToday: crmSentToday,
    maxNonCriticalPerDay: rc.maxNonCriticalPerDay,
  });

  logger.info(
    {
      evt: "CRM_SEGMENT_DECISION",
      mode,
      userId,
      segment,
      stepId: picked.step.stepId,
      action: decision.action,
      reason: decision.reason,
      expectedValue: decision.expectedValue,
    },
    "CRM segment journey decision",
  );

  if (decision.action !== "send") {
    return decision.action === "delay" ? "delayed" : "skipped";
  }

  if (mode === "shadow") {
    return "shadow";
  }

  const built = buildSegmentNotification(
    segment,
    picked.step,
    picked.stepIndex,
    journey.journeyId,
    signals,
    tz,
    rc,
    prefs.locale ?? "en",
    local.localDate,
  );

  const category: NotificationCategory =
    built.monetization ? "engagement" : "engagement";

  const result = await dispatchNotification({
    userId,
    category,
    title: built.title,
    body: built.body,
    deepLink: built.deepLink,
    dedupKey: built.dedupKey,
    data: built.data,
    outcomeMeta: {
      goal: built.goal,
      childLifecycleStage: resolution.lifecycleStage,
      campaignId: built.journeyId,
      campaignStep: built.stepIndex,
      experimentId: rc.abVariant,
      segment: built.segment,
      journeyStepId: built.stepId,
    },
    globalMeta: {
      countryCode,
      locale: prefs.locale,
      timezoneAtSend: tz,
    },
  });

  if (result.status === "sent") {
    await db
      .update(notificationJourneyEnrollmentsTable)
      .set({
        currentStepId: picked.step.stepId,
        currentStepIndex: picked.stepIndex,
        lastStepSentAt: now,
        completedStepIds: appendCompletedStep(enrollment.completedStepIds, picked.step.stepId),
        nextEligibleAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      })
      .where(eq(notificationJourneyEnrollmentsTable.id, enrollment.id));
    return "sent";
  }

  return "skipped";
}

/** Cancel journey enrollments when user graduates out of a segment. */
export async function reconcileSegmentEnrollments(
  userId: string,
  currentSegment: string,
): Promise<void> {
  await db
    .update(notificationJourneyEnrollmentsTable)
    .set({ completedAt: new Date() })
    .where(
      and(
        eq(notificationJourneyEnrollmentsTable.userId, userId),
        sql`${notificationJourneyEnrollmentsTable.segment} <> ${currentSegment}`,
        isNull(notificationJourneyEnrollmentsTable.completedAt),
      ),
    );
}
