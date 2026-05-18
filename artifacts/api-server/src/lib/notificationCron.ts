import cron from "node-cron";
import { and, eq, sql } from "drizzle-orm";
import {
  childrenTable,
  db,
  pushTokensTable,
  routinesTable,
  type NotificationCategory,
} from "@workspace/db";
import { logger } from "./logger";
import {
  dispatchNotification,
  getOrCreatePreferences,
  pruneStaleTokens,
} from "../services/notificationDispatchService";
import {
  buildMorningRoutine,
  buildSnackTime,
  buildDinnerSuggestion,
  buildGoodNight,
  buildWeeklyReport,
  buildEngagement,
  buildNutritionInsight,
  buildAmyInsight,
  buildRoutineItem,
  buildParentingTip,
  buildStoryTime,
  buildPhonicsReminder,
  buildLearningActivity,
  buildMilestoneAlert,
  type BuiltNotification,
} from "../services/notificationContentBuilder";

/** "7:00 AM" / "12:30 PM" → minutes since local midnight. Returns -1 if unparseable. */
function timeStringToMinutes(s: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(s.trim());
  if (!m) return -1;
  let hours = parseInt(m[1]!, 10);
  const minutes = parseInt(m[2]!, 10);
  const ampm = m[3]!.toUpperCase();
  if (hours === 12) hours = 0;
  if (ampm === "PM") hours += 12;
  return hours * 60 + minutes;
}

interface RoutineItemShape {
  time?: string;
  activity?: string;
  status?: string;
}

function routinePushOptedIn(uiPrefs: unknown): boolean {
  // Default is opted-IN. We only skip if the user has explicitly set
  // pushReminders: false on a specific routine. This matches expected UX:
  // routines created before the flag existed should still get reminders.
  // The user-level `routineItemEnabled` pref (checked above) is the primary
  // opt-out mechanism; this flag just allows per-routine suppression.
  if (!uiPrefs || typeof uiPrefs !== "object") return true;
  const prefs = uiPrefs as { pushReminders?: unknown };
  if (!("pushReminders" in prefs)) return true;
  return prefs.pushReminders !== false;
}

let started = false;
let pushTokensTableExists: boolean | null = null;
let loggedMissingPushTokensTable = false;
let loggedPushTokensCheckFailure = false;
const loggedCronFailures = new Set<string>();

const TZ = process.env["NOTIFICATION_TZ"] ?? "Asia/Kolkata";

function notificationsEnabled(): boolean {
  return process.env["NOTIFICATIONS_ENABLED"]?.trim().toLowerCase() !== "false";
}

async function hasPushTokensTable(): Promise<boolean> {
  if (pushTokensTableExists !== null) return pushTokensTableExists;

  try {
    const result = await db.execute<{ exists: boolean }>(sql`
      SELECT to_regclass('public.push_tokens') IS NOT NULL AS exists
    `);
    pushTokensTableExists = result.rows[0]?.exists === true;
  } catch (err) {
    pushTokensTableExists = false;
    if (!loggedPushTokensCheckFailure) {
      loggedPushTokensCheckFailure = true;
      logger.warn({ err }, "Notification cron disabled: could not check push_tokens table");
    }
    return false;
  }

  if (!pushTokensTableExists && !loggedMissingPushTokensTable) {
    loggedMissingPushTokensTable = true;
    logger.warn("Notification cron skipped: push_tokens table is missing");
  }

  return pushTokensTableExists;
}

async function getTargetUsers(): Promise<string[]> {
  if (!(await hasPushTokensTable())) return [];

  const rows = await db
    .selectDistinct({ userId: pushTokensTable.userId })
    .from(pushTokensTable);
  return rows.map((r) => r.userId);
}

async function dispatchToAll(
  category: NotificationCategory,
  builder: (userId: string, timezone: string) => Promise<BuiltNotification | null>,
): Promise<{ attempted: number; sent: number; throttled: number; failed: number }> {
  const users = await getTargetUsers();
  let sent = 0;
  let throttled = 0;
  let failed = 0;
  for (const userId of users) {
    try {
      const prefs = await getOrCreatePreferences(userId);
      const built = await builder(userId, prefs.timezone);
      if (!built) {
        throttled++;
        continue;
      }
      const result = await dispatchNotification({
        userId,
        category,
        title: built.title,
        body: built.body,
        deepLink: built.deepLink,
        dedupKey: built.dedupKey,
        data: built.data,
      });
      if (result.status === "sent") sent++;
      else if (result.status === "failed") failed++;
      else throttled++;
    } catch (err) {
      failed++;
      logger.error({ err, userId, category }, "Notification dispatch loop error");
    }
  }
  return { attempted: users.length, sent, throttled, failed };
}

function schedule(name: string, expr: string, runner: () => Promise<unknown>): void {
  try {
    cron.schedule(
      expr,
      () => {
        void (async () => {
          try {
            if (!(await hasPushTokensTable())) return;
            logger.debug({ job: name, expr, tz: TZ }, "Notification cron firing");
            await runner();
          } catch (err) {
            if (!loggedCronFailures.has(name)) {
              loggedCronFailures.add(name);
              logger.error({ err, job: name }, "Notification cron failed; future errors for this job will be suppressed");
            }
          }
        })();
      },
      { timezone: TZ },
    );
    logger.info({ job: name, expr, tz: TZ }, "Notification cron scheduled");
  } catch (err) {
    logger.error({ err, job: name, expr }, "Could not schedule notification cron");
  }
}

const REMINDER_LEAD_MINUTES = 5;

async function dispatchPerItemReminders(): Promise<{
  attempted: number;
  scheduled: number;
  sent: number;
  throttled: number;
  failed: number;
}> {
  const users = await getTargetUsers();
  let scheduled = 0;
  let sent = 0;
  let throttled = 0;
  let failed = 0;

  for (const userId of users) {
    try {
      const prefs = await getOrCreatePreferences(userId);
      if (!prefs.routineItemEnabled) continue;

      const tz = prefs.timezone;
      const dateFmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const timeFmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const localDate = dateFmt.format(new Date());
      const localHHMM = timeFmt.format(new Date());
      const [hh, mm] = localHHMM.split(":").map((s) => parseInt(s, 10));
      if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
      const nowMins = hh * 60 + mm;

      const rows = await db
        .select({ routine: routinesTable, child: childrenTable })
        .from(routinesTable)
        .innerJoin(childrenTable, eq(childrenTable.id, routinesTable.childId))
        .where(
          and(
            eq(childrenTable.userId, userId),
            eq(routinesTable.date, localDate),
          ),
        );

      for (const { routine, child } of rows) {
        if (!routinePushOptedIn(routine.uiPrefs)) continue;
        const items = (routine.items ?? []) as RoutineItemShape[];
        for (let i = 0; i < items.length; i++) {
          const item = items[i]!;
          if (!item.time || !item.activity) continue;
          if (item.status === "completed" || item.status === "skipped") continue;
          const itemMins = timeStringToMinutes(item.time);
          if (itemMins < 0) continue;
          if (itemMins - REMINDER_LEAD_MINUTES !== nowMins) continue;

          scheduled++;
          const built = buildRoutineItem({
            childName: child.name,
            childId: child.id,
            routineId: routine.id,
            itemIndex: i,
            itemTime: item.time,
            activity: item.activity,
            date: localDate,
          });
          const result = await dispatchNotification({
            userId,
            category: "routine_item",
            title: built.title,
            body: built.body,
            deepLink: built.deepLink,
            dedupKey: built.dedupKey,
            data: built.data,
          });
          if (result.status === "sent") sent++;
          else if (result.status === "failed") failed++;
          else throttled++;
        }
      }
    } catch (err) {
      failed++;
      logger.error({ err, userId }, "Per-item routine dispatch error");
    }
  }
  return { attempted: users.length, scheduled, sent, throttled, failed };
}

export function startNotificationCron(): void {
  if (started) return;
  started = true;

  if (!notificationsEnabled()) {
    logger.info("Notification cron disabled via NOTIFICATIONS_ENABLED=false");
    return;
  }

  if (process.env["DISABLE_NOTIFICATION_CRON"] === "1") {
    logger.info("Notification cron disabled via DISABLE_NOTIFICATION_CRON");
    return;
  }

  // ── Core category schedule ─────────────────────────────────────────────
  // Morning routine reminder — 07:30 local.
  schedule("morning_routine", "30 7 * * *", async () => {
    const r = await dispatchToAll("routine", buildMorningRoutine);
    logger.info({ ...r, job: "morning_routine" }, "Cron summary");
  });

  // Amy AI insight — 12:30 local (lunchtime browse).
  schedule("amy_insight", "30 12 * * *", async () => {
    const r = await dispatchToAll("insights", buildAmyInsight);
    logger.info({ ...r, job: "amy_insight" }, "Cron summary");
  });

  // Afternoon snack suggestion — 15:30 local.
  schedule("snack_time", "30 15 * * *", async () => {
    const r = await dispatchToAll("nutrition", buildSnackTime);
    logger.info({ ...r, job: "snack_time" }, "Cron summary");
  });

  // Dinner suggestion — 18:30 local.
  schedule("dinner_suggestion", "30 18 * * *", async () => {
    const r = await dispatchToAll("nutrition", buildDinnerSuggestion);
    logger.info({ ...r, job: "dinner_suggestion" }, "Cron summary");
  });

  // Engagement sweep — 19:00 local. Picks the best applicable nudge per user.
  schedule("engagement_sweep", "0 19 * * *", async () => {
    const r = await dispatchToAll("engagement", buildEngagement);
    logger.info({ ...r, job: "engagement_sweep" }, "Cron summary");
  });

  // Good night — 21:00 local.
  schedule("good_night", "0 21 * * *", async () => {
    const r = await dispatchToAll("good_night", buildGoodNight);
    logger.info({ ...r, job: "good_night" }, "Cron summary");
  });

  // Weekly report — Sunday 10:00 local. (Email recap fires Sun 09:00.)
  schedule("weekly_report", "0 10 * * 0", async () => {
    const r = await dispatchToAll("weekly", buildWeeklyReport);
    logger.info({ ...r, job: "weekly_report" }, "Cron summary");
  });

  // ── Smart engine: new categories ──────────────────────────────────────
  // Parenting tip — 09:00 local (after morning routine, before commute).
  schedule("parenting_tip", "0 9 * * *", async () => {
    const r = await dispatchToAll("parenting_tips", buildParentingTip);
    logger.info({ ...r, job: "parenting_tip" }, "Cron summary");
  });

  // Learning activity — 10:30 local (mid-morning energy peak).
  schedule("learning_activity", "30 10 * * *", async () => {
    const r = await dispatchToAll("learning_activity", buildLearningActivity);
    logger.info({ ...r, job: "learning_activity" }, "Cron summary");
  });

  // Milestone alert — 11:00 local (daily check, deduped monthly per user).
  schedule("milestone_alert", "0 11 * * *", async () => {
    const r = await dispatchToAll("milestone", buildMilestoneAlert);
    logger.info({ ...r, job: "milestone_alert" }, "Cron summary");
  });

  // Phonics practice — 16:00 local (after-school slot, skips tweens).
  schedule("phonics_reminder", "0 16 * * *", async () => {
    const r = await dispatchToAll("phonics", buildPhonicsReminder);
    logger.info({ ...r, job: "phonics_reminder" }, "Cron summary");
  });

  // Story time — 20:00 local (pre-bedtime wind-down).
  schedule("story_time", "0 20 * * *", async () => {
    const r = await dispatchToAll("story_time", buildStoryTime);
    logger.info({ ...r, job: "story_time" }, "Cron summary");
  });

  // ── Per-task routine reminders — every minute ──────────────────────────
  schedule("routine_item_sweep", "* * * * *", async () => {
    const r = await dispatchPerItemReminders();
    if (r.scheduled > 0) {
      logger.info({ ...r, job: "routine_item_sweep" }, "Per-item reminder summary");
    }
  });

  // Token health sweep — daily at 03:00 local.
  schedule("token_sweep", "0 3 * * *", async () => {
    const removed = await pruneStaleTokens(60);
    logger.info({ removed, job: "token_sweep" }, "Token sweep summary");
  });

  // Suppress unused import warnings
  void buildNutritionInsight;

}

// Re-export for tests.
export const __test = { dispatchPerItemReminders, timeStringToMinutes };
