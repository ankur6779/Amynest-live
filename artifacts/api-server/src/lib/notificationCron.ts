import cron from "node-cron";
import { and, eq, sql } from "drizzle-orm";
import {
  childrenTable,
  db,
  pushTokensTable,
  routinesTable,
  type NotificationCategory,
} from "@workspace/db";
import { childIdNameSelect } from "./children-db.js";
import { isMissingColumnError, withSafeDb } from "./db-safe.js";
import { logger } from "./logger";
import {
  dispatchNotification,
  getOrCreatePreferences,
  pruneApnsHexTokens,
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

  return withSafeDb(
    "notification.getTargetUsers",
    async () => {
      const rows = await db
        .selectDistinct({ userId: pushTokensTable.userId })
        .from(pushTokensTable);
      return rows.map((r) => r.userId);
    },
    [],
  );
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
        contentMeta: built.contentMeta,
      });
      if (result.status === "sent") sent++;
      else if (result.status === "failed") failed++;
      else throttled++;
    } catch (err) {
      failed++;
      if (isMissingColumnError(err)) {
        logger.warn({ err, userId, category }, "Notification dispatch skipped — missing DB column");
      } else {
        logger.error({ err, userId, category }, "Notification dispatch loop error");
      }
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
            const { withCronAdvisoryLock } = await import("./cron-advisory-lock.js");
            await withCronAdvisoryLock(name, async () => {
              await runner();
            });
          } catch (err) {
            if (!loggedCronFailures.has(name)) {
              loggedCronFailures.add(name);
              const level = isMissingColumnError(err) ? "warn" : "error";
              logger[level](
                { err, job: name },
                isMissingColumnError(err)
                  ? "Notification cron skipped — missing DB column; future errors for this job will be suppressed"
                  : "Notification cron failed; future errors for this job will be suppressed",
              );
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

      const rows = await withSafeDb(
        `notification.routineItems.${userId}`,
        () =>
          db
            .select({ routine: routinesTable, child: childIdNameSelect })
            .from(routinesTable)
            .innerJoin(childrenTable, eq(childrenTable.id, routinesTable.childId))
            .where(
              and(
                eq(childrenTable.userId, userId),
                eq(routinesTable.date, localDate),
              ),
            ),
        [],
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
          // 3-minute window (cron fires every minute; dedupKey prevents duplicate sends).
          const reminderStart = itemMins - REMINDER_LEAD_MINUTES;
          if (nowMins < reminderStart || nowMins >= reminderStart + 3) continue;

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
            contentMeta: built.contentMeta,
          });
          if (result.status === "sent") sent++;
          else if (result.status === "failed") failed++;
          else throttled++;
        }
      }
    } catch (err) {
      failed++;
      if (isMissingColumnError(err)) {
        logger.warn({ err, userId }, "Per-item routine dispatch skipped — missing DB column");
      } else {
        logger.error({ err, userId }, "Per-item routine dispatch error");
      }
    }
  }
  return { attempted: users.length, scheduled, sent, throttled, failed };
}

export function startNotificationCron(): void {
  if (started) return;
  started = true;

  void import("@workspace/notification-engine").then(({ warmContentPools }) => {
    warmContentPools();
  });

  if (!notificationsEnabled()) {
    logger.info("Notification cron disabled via NOTIFICATIONS_ENABLED=false");
    return;
  }

  if (process.env["DISABLE_NOTIFICATION_CRON"] === "1") {
    logger.info("Notification cron disabled via DISABLE_NOTIFICATION_CRON");
    return;
  }

  // ── Global per-user timezone schedule — runs every minute (UTC clock; DST-safe local eval) ──
  schedule("global_notification_tick", "* * * * *", async () => {
    const { runGlobalScheduleTick } = await import("../services/notificationGlobalScheduler.js");
    const r = await runGlobalScheduleTick();
    if (r.sent > 0 || r.attempted > 10) {
      logger.info({ ...r, job: "global_notification_tick" }, "Global schedule summary");
    }
  });

  // Signed-in re-engagement selector (dry-run by default; live requires env).
  schedule("reengagement_tick", "* * * * *", async () => {
    const { runReengagementTick } = await import(
      "../services/reengagementNotificationService.js"
    );
    const r = await runReengagementTick();
    if (r.evaluated > 0) {
      logger.info({ ...r, job: "reengagement_tick" }, "Re-engagement tick summary");
    }
  });

  // ── Per-task routine reminders — every minute (already user-TZ aware) ──
  schedule("routine_item_sweep", "* * * * *", async () => {
    const r = await dispatchPerItemReminders();
    if (r.scheduled > 0) {
      logger.info({ ...r, job: "routine_item_sweep" }, "Per-item reminder summary");
    }
  });

  // ── Infant smart notifications — every minute, user-TZ aware ──
  schedule("infant_notification_tick", "* * * * *", async () => {
    const { runInfantNotificationTick } = await import("../lib/infantNotificationScheduler.js");
    const r = await runInfantNotificationTick();
    if (r.sent > 0) {
      logger.info({ ...r, job: "infant_notification_tick" }, "Infant notification summary");
    }
  });

  // Feature reminders (olympiad, PTM, event prep, sleep wind-down).
  schedule("feature_notification_tick", "* * * * *", async () => {
    const { runFeatureNotificationTick } = await import(
      "../services/featureNotificationScheduler.js"
    );
    const r = await runFeatureNotificationTick();
    if (r.sent > 0) {
      logger.info({ ...r, job: "feature_notification_tick" }, "Feature notification summary");
    }
  });

  // CRM pre-signup journey for anonymous devices (Segment 2).
  schedule("anonymous_presignup_tick", "*/15 * * * *", async () => {
    const { runPreSignupNotificationTick } = await import(
      "../services/preSignupNotificationScheduler.js"
    );
    const r = await runPreSignupNotificationTick();
    if (r.sent > 0) {
      logger.info({ ...r, job: "anonymous_presignup_tick" }, "Pre-signup CRM summary");
    }
  });

  // Release abandoned pending claims (worker crash recovery).
  schedule("stale_pending_sweep", "*/5 * * * *", async () => {
    const { releaseStalePendingClaimsGlobally } = await import(
      "../services/notificationRateLimitService.js"
    );
    const released = await releaseStalePendingClaimsGlobally(15);
    if (released > 0) {
      logger.info({ released, job: "stale_pending_sweep" }, "Stale pending claim sweep");
    }
  });

  // Token health sweep — daily at 03:00 UTC (global maintenance window).
  schedule("token_sweep", "0 3 * * *", async () => {
    const hexRemoved = await withSafeDb(
      "notification.token_sweep.apns_hex",
      () => pruneApnsHexTokens(),
      0,
    );
    const removed = await withSafeDb(
      "notification.token_sweep",
      () => pruneStaleTokens(60),
      0,
    );
    logger.info({ removed, hexRemoved, job: "token_sweep" }, "Token sweep summary");
  });

  // Legacy category crons replaced by global_notification_tick (per-user TZ).
  void buildNutritionInsight;
  void dispatchToAll;

}

/** External cron ping (Render scheduled job) — runs per-task routine reminders. */
export async function runNotificationCronPing(): Promise<{
  ok: boolean;
  skipped?: string;
  routine?: Awaited<ReturnType<typeof dispatchPerItemReminders>>;
}> {
  if (!notificationsEnabled()) {
    return { ok: false, skipped: "NOTIFICATIONS_ENABLED=false" };
  }
  if (!(await hasPushTokensTable())) {
    return { ok: false, skipped: "push_tokens_missing" };
  }
  const routine = await dispatchPerItemReminders();
  return { ok: true, routine };
}

// Re-export for tests.
export const __test = { dispatchPerItemReminders, timeStringToMinutes };
