/**
 * Server-side feature reminders — olympiad daily, PTM follow-up, event prep,
 * sleep wind-down. All delivery goes through dispatchNotification.
 */
import { eq } from "drizzle-orm";
import {
  db,
  featureNotificationSchedulesTable,
  olympiadChildStatsTable,
  ptmPrepDataTable,
  pushTokensTable,
  type FeatureScheduleConfig,
} from "@workspace/db";
import { activeReminders, type PtmReminder } from "@workspace/ptm-prep";
import {
  buildNotificationFingerprint,
  contentFingerprint,
} from "@workspace/notification-engine";
import { dispatchNotification, getOrCreatePreferences } from "./notificationDispatchService.js";
import { logger } from "../lib/logger.js";

function getLocalParts(timezone: string, now = new Date()) {
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const localDate = dateFmt.format(now);
  const [hh, mm] = timeFmt.format(now).split(":").map((s) => parseInt(s, 10));
  return {
    localDate,
    localHour: Number.isFinite(hh) ? hh! : 0,
    localMinute: Number.isFinite(mm) ? mm! : 0,
  };
}

async function usersWithPushTokens(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: pushTokensTable.userId })
    .from(pushTokensTable);
  return rows.map((r) => r.userId);
}

type OlympiadStatsBlob = {
  reminderEnabled?: boolean;
  reminderHour?: number;
  lastDailyDate?: string | null;
  daily?: Record<string, { submitted?: boolean }>;
};

function olympiadDailyDone(stats: OlympiadStatsBlob, localDate: string): boolean {
  if (stats.lastDailyDate === localDate) return true;
  const run = stats.daily?.[localDate];
  return run?.submitted === true;
}

async function dispatchOlympiadDailyReminders(): Promise<number> {
  let sent = 0;
  const rows = await db
    .select({
      userId: olympiadChildStatsTable.userId,
      childId: olympiadChildStatsTable.childId,
      statsJson: olympiadChildStatsTable.statsJson,
    })
    .from(olympiadChildStatsTable);

  for (const row of rows) {
    const stats = (row.statsJson ?? {}) as OlympiadStatsBlob;
    if (!stats.reminderEnabled) continue;

    try {
      const prefs = await getOrCreatePreferences(row.userId);
      const { localDate, localHour, localMinute } = getLocalParts(prefs.timezone);
      const targetHour = stats.reminderHour ?? 17;
      if (localHour !== targetHour || localMinute !== 0) continue;
      if (olympiadDailyDone(stats, localDate)) continue;

      const fingerprint = contentFingerprint(
        row.childId,
        "olympiad_daily",
        "daily",
        localDate,
      );
      const result = await dispatchNotification({
        userId: row.userId,
        category: "learning_activity",
        title: "Olympiad daily challenge",
        body: "Your daily Olympiad questions are ready — keep your streak going!",
        deepLink: "/olympiad",
        dedupKey: fingerprint,
        data: { childId: row.childId },
      });
      if (result.status === "sent") sent++;
    } catch (err) {
      logger.warn({ err, userId: row.userId, childId: row.childId }, "Olympiad reminder dispatch failed");
    }
  }
  return sent;
}

async function dispatchPtmFollowupReminders(): Promise<number> {
  let sent = 0;
  const userIds = await usersWithPushTokens();

  for (const userId of userIds) {
    try {
      const [row] = await db
        .select({ reminders: ptmPrepDataTable.reminders })
        .from(ptmPrepDataTable)
        .where(eq(ptmPrepDataTable.userId, userId))
        .limit(1);
      if (!row) continue;

      const reminders = (Array.isArray(row.reminders)
        ? row.reminders
        : []) as unknown as PtmReminder[];
      const prefs = await getOrCreatePreferences(userId);
      const { localDate } = getLocalParts(prefs.timezone);
      const due = activeReminders(reminders, localDate);

      for (const reminder of due.slice(0, 3)) {
        const childId = reminder.childId ? Number(reminder.childId) : null;
        const fingerprint = buildNotificationFingerprint({
          childId: childId ?? "account",
          notificationType: "ptm_followup",
          entityId: reminder.id,
          scheduledDate: reminder.dueDate,
        });
        const result = await dispatchNotification({
          userId,
          category: "insights",
          title: "PTM follow-up",
          body: `${reminder.childName ? `${reminder.childName}: ` : ""}${reminder.actionText}`,
          deepLink: "/ptm-prep",
          dedupKey: fingerprint,
          data: childId != null ? { childId } : undefined,
        });
        if (result.status === "sent") sent++;
      }
    } catch (err) {
      logger.warn({ err, userId }, "PTM follow-up dispatch failed");
    }
  }
  return sent;
}

async function dispatchRegisteredSchedules(): Promise<number> {
  let sent = 0;
  const now = Date.now();
  const rows = await db
    .select()
    .from(featureNotificationSchedulesTable)
    .where(eq(featureNotificationSchedulesTable.enabled, true));

  for (const row of rows) {
    try {
      const prefs = await getOrCreatePreferences(row.userId);
      const { localDate } = getLocalParts(prefs.timezone);
      const config = row.config ?? {};

      if (row.scheduleType === "sleep_winddown") {
        const remindAt = config.remindAt ? Date.parse(config.remindAt) : NaN;
        if (!Number.isFinite(remindAt)) continue;
        const delta = now - remindAt;
        if (delta < 0 || delta >= 3 * 60_000) continue;

        const fingerprint = contentFingerprint(
          row.childId,
          "sleep_winddown",
          row.entityId,
          localDate,
        );
        const result = await dispatchNotification({
          userId: row.userId,
          category: "infant_care",
          title: config.title ?? "Wind-down time",
          body: config.body ?? "Start calming activities — nap window is approaching.",
          deepLink: config.deepLink ?? "/parenting-hub#infant-sleep",
          dedupKey: fingerprint,
          data: row.childId != null ? { childId: row.childId } : undefined,
        });
        if (result.status === "sent") {
          sent++;
          await db
            .update(featureNotificationSchedulesTable)
            .set({ enabled: false, updatedAt: new Date() })
            .where(eq(featureNotificationSchedulesTable.id, row.id));
        }
        continue;
      }

      if (row.scheduleType === "event_prep") {
        const eventDate = config.eventDate ?? localDate;
        const daysBefore = 3;
        const target = new Date(`${eventDate}T09:00:00`);
        target.setDate(target.getDate() - daysBefore);
        const { localDate: today, localHour, localMinute } = getLocalParts(prefs.timezone);
        const targetDate = target.toISOString().slice(0, 10);
        if (today !== targetDate || localHour !== 9 || localMinute !== 0) continue;

        const fingerprint = contentFingerprint(
          row.childId,
          "event_prep",
          row.entityId,
          eventDate,
        );
        const eventName = config.eventName ?? "school event";
        const result = await dispatchNotification({
          userId: row.userId,
          category: "insights",
          title: "Event prep reminder",
          body: `${eventName} is coming up — review your prep checklist.`,
          deepLink: config.deepLink ?? "/event-prep",
          dedupKey: fingerprint,
          data: row.childId != null ? { childId: row.childId } : undefined,
        });
        if (result.status === "sent") sent++;
      }
    } catch (err) {
      logger.warn(
        { err, userId: row.userId, scheduleType: row.scheduleType },
        "Feature schedule dispatch failed",
      );
    }
  }
  return sent;
}

export async function runFeatureNotificationTick(): Promise<{
  olympiad: number;
  ptm: number;
  schedules: number;
  sent: number;
}> {
  const [olympiad, ptm, schedules] = await Promise.all([
    dispatchOlympiadDailyReminders(),
    dispatchPtmFollowupReminders(),
    dispatchRegisteredSchedules(),
  ]);
  const sent = olympiad + ptm + schedules;
  return { olympiad, ptm, schedules, sent };
}

export async function upsertFeatureSchedule(input: {
  userId: string;
  childId?: number | null;
  scheduleType: "event_prep" | "sleep_winddown";
  entityId: string;
  enabled: boolean;
  config?: FeatureScheduleConfig;
}): Promise<void> {
  const config = input.config ?? {};
  await db
    .insert(featureNotificationSchedulesTable)
    .values({
      userId: input.userId,
      childId: input.childId ?? null,
      scheduleType: input.scheduleType,
      entityId: input.entityId,
      enabled: input.enabled,
      config,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        featureNotificationSchedulesTable.userId,
        featureNotificationSchedulesTable.scheduleType,
        featureNotificationSchedulesTable.entityId,
      ],
      set: {
        enabled: input.enabled,
        childId: input.childId ?? null,
        config,
        updatedAt: new Date(),
      },
    });
}
