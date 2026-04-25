import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  notificationLogTable,
  notificationPreferencesTable,
  pushTokensTable,
  type NotificationCategory,
} from "@workspace/db";
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { logger } from "../lib/logger";

const expo = new Expo();

const DEDUP_WINDOW_MINUTES = 60;

export interface DispatchInput {
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** Deep link path opened on tap, e.g. "/hub", "/routine/3", "/meals". */
  deepLink?: string;
  /** Extra payload for client-side handling. */
  data?: Record<string, unknown>;
  /**
   * Idempotency key. If the same dedupKey was sent to this user within the
   * dedup window the call becomes a no-op (logged as "duplicate").
   */
  dedupKey?: string;
  /**
   * Skip the daily cap check. Reserved for critical messages — none today.
   */
  bypassDailyCap?: boolean;
}

export type DispatchStatus = "sent" | "throttled" | "failed" | "duplicate" | "no_tokens";

export interface DispatchResult {
  status: DispatchStatus;
  reason?: string;
  ticketIds?: string[];
}

/**
 * Read prefs row for a user; lazily insert defaults if missing.
 * Defaults match the column defaults in the schema.
 */
export async function getOrCreatePreferences(userId: string) {
  const [existing] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(notificationPreferencesTable)
    .values({ userId })
    .onConflictDoNothing({ target: notificationPreferencesTable.userId })
    .returning();
  if (created) return created;

  // Lost the insert race — re-read.
  const [retry] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);
  if (!retry) throw new Error("Failed to create notification preferences");
  return retry;
}

function categoryEnabled(
  prefs: Awaited<ReturnType<typeof getOrCreatePreferences>>,
  category: NotificationCategory,
): boolean {
  switch (category) {
    case "routine":
      return prefs.routineEnabled;
    case "nutrition":
      return prefs.nutritionEnabled;
    case "insights":
      return prefs.insightsEnabled;
    case "weekly":
      return prefs.weeklyEnabled;
    case "engagement":
      return prefs.engagementEnabled;
    case "good_night":
      return prefs.goodNightEnabled;
    default:
      return true;
  }
}

/**
 * Returns true if the current local time (in the user's timezone) falls
 * inside their quiet hours window. Handles overnight ranges (e.g. 22:00–07:00).
 */
function inQuietHours(
  prefs: Awaited<ReturnType<typeof getOrCreatePreferences>>,
  now: Date = new Date(),
): boolean {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: prefs.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const localHHMM = fmt.format(now);
  const start = prefs.quietHoursStart;
  const end = prefs.quietHoursEnd;
  if (start === end) return false;
  if (start < end) {
    return localHHMM >= start && localHHMM < end;
  }
  // Overnight window: in quiet hours if >= start OR < end.
  return localHHMM >= start || localHHMM < end;
}

async function countSentToday(userId: string, timezone: string): Promise<number> {
  // Compute "today" boundary in the user's timezone, then convert back to UTC.
  // Easier: count notifications in the last 24h windowed to local-day start.
  // We approximate by resetting at local midnight using formatted date.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localDate = fmt.format(new Date()); // "YYYY-MM-DD"
  // Local midnight → ISO. Use the date string + "T00:00" + offset trick:
  // safest is to query rows whose sentAt converted to that timezone matches.
  const result = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count FROM notification_log
    WHERE user_id = ${userId}
      AND status = 'sent'
      AND (sent_at AT TIME ZONE ${timezone})::date = ${localDate}::date
  `);
  return Number(result.rows[0]?.count ?? 0);
}

async function isDuplicate(userId: string, dedupKey: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000);
  const [row] = await db
    .select({ id: notificationLogTable.id })
    .from(notificationLogTable)
    .where(
      and(
        eq(notificationLogTable.userId, userId),
        eq(notificationLogTable.dedupKey, dedupKey),
        gte(notificationLogTable.sentAt, cutoff),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function logEvent(
  input: DispatchInput,
  status: DispatchStatus,
  errorMessage?: string,
  platform?: string,
): Promise<void> {
  await db.insert(notificationLogTable).values({
    userId: input.userId,
    category: input.category,
    title: input.title,
    body: input.body,
    deepLink: input.deepLink ?? null,
    dedupKey: input.dedupKey ?? null,
    status,
    platform: platform ?? null,
    errorMessage: errorMessage ?? null,
  });
}

/**
 * Main entry point. Validates against prefs/cap/quiet hours/dedup, then
 * sends the notification to every registered Expo push token for the user.
 */
export async function dispatchNotification(input: DispatchInput): Promise<DispatchResult> {
  const prefs = await getOrCreatePreferences(input.userId);

  if (!categoryEnabled(prefs, input.category)) {
    await logEvent(input, "throttled", "category_disabled");
    return { status: "throttled", reason: "category_disabled" };
  }

  if (inQuietHours(prefs)) {
    await logEvent(input, "throttled", "quiet_hours");
    return { status: "throttled", reason: "quiet_hours" };
  }

  if (input.dedupKey && (await isDuplicate(input.userId, input.dedupKey))) {
    await logEvent(input, "duplicate", "dedup_window");
    return { status: "duplicate", reason: "dedup_window" };
  }

  if (!input.bypassDailyCap) {
    const sentToday = await countSentToday(input.userId, prefs.timezone);
    if (sentToday >= prefs.dailyCap) {
      await logEvent(input, "throttled", `daily_cap:${prefs.dailyCap}`);
      return { status: "throttled", reason: "daily_cap" };
    }
  }

  const tokens = await db
    .select({ token: pushTokensTable.token, platform: pushTokensTable.platform })
    .from(pushTokensTable)
    .where(eq(pushTokensTable.userId, input.userId));

  const valid = tokens.filter((t) => Expo.isExpoPushToken(t.token));
  if (valid.length === 0) {
    await logEvent(input, "no_tokens", "no_valid_tokens");
    return { status: "no_tokens", reason: "no_valid_tokens" };
  }

  const messages: ExpoPushMessage[] = valid.map((t) => ({
    to: t.token,
    sound: "default",
    title: input.title,
    body: input.body,
    data: {
      category: input.category,
      deepLink: input.deepLink,
      ...(input.data ?? {}),
    },
  }));

  const tickets: ExpoPushTicket[] = [];
  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
    }
  } catch (err) {
    logger.error({ err, userId: input.userId, category: input.category }, "Expo dispatch failed");
    await logEvent(input, "failed", err instanceof Error ? err.message : String(err));
    return { status: "failed", reason: "expo_error" };
  }

  const errorTicket = tickets.find((t) => t.status === "error");
  if (errorTicket && errorTicket.status === "error") {
    await logEvent(input, "failed", errorTicket.message, valid[0]?.platform);
    return { status: "failed", reason: errorTicket.message };
  }

  const ticketIds = tickets
    .map((t) => (t.status === "ok" ? t.id : null))
    .filter((id): id is string => Boolean(id));
  await logEvent(input, "sent", undefined, valid[0]?.platform);
  logger.info(
    { userId: input.userId, category: input.category, tokens: valid.length },
    "Notification dispatched",
  );
  return { status: "sent", ticketIds };
}

/**
 * Returns recent notification history for the in-app inbox.
 */
export async function getNotificationHistory(userId: string, limit = 50) {
  return db
    .select()
    .from(notificationLogTable)
    .where(eq(notificationLogTable.userId, userId))
    .orderBy(desc(notificationLogTable.sentAt))
    .limit(limit);
}
