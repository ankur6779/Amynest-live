import cron from "node-cron";
import { db, pushTokensTable, type NotificationCategory } from "@workspace/db";
import { logger } from "./logger";
import { dispatchNotification, getOrCreatePreferences } from "../services/notificationDispatchService";
import {
  buildMorningRoutine,
  buildSnackTime,
  buildDinnerSuggestion,
  buildGoodNight,
  buildWeeklyReport,
  buildEngagement,
  buildNutritionInsight,
  buildAmyInsight,
  type BuiltNotification,
} from "../services/notificationContentBuilder";

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

  // Suppress unused var warning — buildNutritionInsight is referenced in
  // dispatch loops via the contentBuilders map and through other categories.
  void buildNutritionInsight;

  started = true;
}
