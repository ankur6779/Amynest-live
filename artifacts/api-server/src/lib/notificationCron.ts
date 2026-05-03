import cron from "node-cron";
import { and, eq } from "drizzle-orm";
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

/**
 * Per-routine UI prefs persisted on `routines.ui_prefs`. The mobile per-routine
 * "Reminders" toggle writes `pushReminders` here so the cron knows which
 * routines to push for. We treat anything not strictly `true` as opt-out so
 * legacy routines (which only carry `ageBandFilter`) stay silent until the user
 * explicitly turns reminders on.
 */
function routinePushOptedIn(uiPrefs: unknown): boolean {
  if (!uiPrefs || typeof uiPrefs !== "object") return false;
  return (uiPrefs as { pushReminders?: unknown }).pushReminders === true;
}

let started = false;

const TZ = process.env["NOTIFICATION_TZ"] ?? "Asia/Kolkata";

/**
 * Returns every userId that has at least one push token registered.
 * Cron jobs only target users who can actually receive notifications.
 */
async function getTargetUsers(): Promise<string[]> {
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
        logger.info({ job: name, expr, tz: TZ }, "Notification cron firing");
        runner().catch((err) => logger.error({ err, job: name }, "Notification cron threw"));
      },
      { timezone: TZ },
    );
    logger.info({ job: name, expr, tz: TZ }, "Notification cron scheduled");
  } catch (err) {
    logger.error({ err, job: name, expr }, "Could not schedule notification cron");
  }
}

/**
 * Per-task routine reminder.
 *
 * Runs every minute. For each user with a registered push token, computes
 * the current local HH:MM in their timezone, loads their child's routine for
 * that local date, and fires a notification for any item whose scheduled
 * time minus 5 minutes equals the current minute. Dedup is enforced by the
 * dispatch service via a deterministic dedupKey, so a brief duplicate run
 * (e.g. process restart) won't double-send.
 */
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

      // Local "now" in the user's timezone.
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
      const localDate = dateFmt.format(new Date()); // "YYYY-MM-DD"
      const localHHMM = timeFmt.format(new Date()); // "HH:MM"
      const [hh, mm] = localHHMM.split(":").map((s) => parseInt(s, 10));
      if (Number.isNaN(hh) || Number.isNaN(mm)) continue;
      const nowMins = hh * 60 + mm;

      // Pull every routine for every child this user owns, scoped to "today".
      // Most parents have 1–2 children; this is a small query.
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
        // Per-task push reminders are opt-in per routine: the mobile app sets
        // `uiPrefs.pushReminders = true` when the user flips the toggle on
        // the routine detail screen. Without this gate we would push for
        // every today's routine of every user with the (default-on) global
        // routine_item category enabled.
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
  if (process.env["DISABLE_NOTIFICATION_CRON"] === "1") {
    logger.info("Notification cron disabled via DISABLE_NOTIFICATION_CRON");
    return;
  }

  // Morning routine reminder — 07:30 local.
  schedule("morning_routine", "30 7 * * *", async () => {
    const r = await dispatchToAll("routine", buildMorningRoutine);
    logger.info({ ...r, job: "morning_routine" }, "Cron summary");
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

  // Amy AI insight — 12:30 local (lunchtime browse).
  schedule("amy_insight", "30 12 * * *", async () => {
    const r = await dispatchToAll("insights", buildAmyInsight);
    logger.info({ ...r, job: "amy_insight" }, "Cron summary");
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

  // Per-task routine reminders — every minute. Fires ~5 min before each
  // scheduled item. Cheap because most users won't have a match each tick.
  schedule("routine_item_sweep", "* * * * *", async () => {
    const r = await dispatchPerItemReminders();
    if (r.scheduled > 0) {
      logger.info({ ...r, job: "routine_item_sweep" }, "Per-item reminder summary");
    }
  });

  // Token health sweep — daily at 03:00 local. Removes tokens not seen in
  // 60 days so the dispatch loop doesn't keep paying for failed sends.
  schedule("token_sweep", "0 3 * * *", async () => {
    const removed = await pruneStaleTokens(60);
    logger.info({ removed, job: "token_sweep" }, "Token sweep summary");
  });

  // Suppress unused var warning — buildNutritionInsight is referenced in
  // dispatch loops via the contentBuilders map and through other categories.
  void buildNutritionInsight;

  started = true;
}

// Re-export for tests.
export const __test = { dispatchPerItemReminders, timeStringToMinutes };
