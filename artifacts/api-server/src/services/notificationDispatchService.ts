import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  notificationLogTable,
  notificationPreferencesTable,
  pushTokensTable,
  intensityToCap,
  type NotificationCategory,
} from "@workspace/db";
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { getMessaging } from "firebase-admin/messaging";
import { adminApp } from "../lib/firebase-admin";
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
  /** Skip the daily cap check. Reserved for test sends. */
  bypassDailyCap?: boolean;
  /** Skip the quiet-hours gate. For explicit user-initiated test sends only. */
  bypassQuietHours?: boolean;
  /**
   * Skip the per-category enablement check. For explicit user-initiated
   * test sends so the delivery test always fires even if the category is off.
   */
  bypassCategoryCheck?: boolean;
  /**
   * When set, only tokens whose stored `platform` matches one of these values
   * are considered (e.g. test ping from iOS simulator → `["ios-capacitor"]`
   * so Android stays silent). Cron / normal sends omit this.
   */
  restrictToPlatforms?: readonly string[];
}

export type DispatchStatus = "sent" | "throttled" | "failed" | "duplicate" | "no_tokens";

export interface DispatchResult {
  status: DispatchStatus;
  reason?: string;
  ticketIds?: string[];
}

/**
 * Read prefs row for a user; lazily insert defaults if missing.
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

  const [retry] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);
  if (!retry) throw new Error("Failed to create notification preferences");
  return retry;
}

/**
 * Returns the effective daily cap for a user based on their intensity setting.
 * Growth mode = 12/day, active = 9, balanced = 6, minimal = 3.
 */
export function effectiveDailyCap(
  prefs: Awaited<ReturnType<typeof getOrCreatePreferences>>,
): number {
  return intensityToCap(prefs.notificationIntensity ?? "balanced");
}

function categoryEnabled(
  prefs: Awaited<ReturnType<typeof getOrCreatePreferences>>,
  category: NotificationCategory,
): boolean {
  switch (category) {
    case "routine":            return prefs.routineEnabled;
    case "routine_item":       return prefs.routineItemEnabled;
    case "nutrition":          return prefs.nutritionEnabled;
    case "insights":           return prefs.insightsEnabled;
    case "weekly":             return prefs.weeklyEnabled;
    case "engagement":         return prefs.engagementEnabled;
    case "good_night":         return prefs.goodNightEnabled;
    case "parenting_tips":     return prefs.parentingTipsEnabled;
    case "story_time":         return prefs.storyTimeEnabled;
    case "phonics":            return prefs.phonicsEnabled;
    case "learning_activity":  return prefs.learningActivityEnabled;
    case "milestone":          return prefs.milestoneEnabled;
    default:                   return true;
  }
}

export async function pruneInvalidToken(
  token: string,
  reason: string,
): Promise<void> {
  try {
    const deleted = await db
      .delete(pushTokensTable)
      .where(eq(pushTokensTable.token, token))
      .returning({ id: pushTokensTable.id });
    if (deleted.length > 0) {
      logger.info(
        { reason, tokenPrefix: token.slice(0, 16) },
        "Pruned invalid push token",
      );
    }
  } catch (err) {
    logger.error({ err, tokenPrefix: token.slice(0, 16) }, "Failed to prune token");
  }
}

export async function pruneStaleTokens(maxDays = 60): Promise<number> {
  const cutoff = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000);
  const removed = await db
    .delete(pushTokensTable)
    .where(sql`${pushTokensTable.lastSeenAt} < ${cutoff}`)
    .returning({ id: pushTokensTable.id });
  if (removed.length > 0) {
    logger.info({ removed: removed.length, maxDays }, "Pruned stale push tokens");
  }
  return removed.length;
}

const FCM_INVALID_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export function isFcmInvalidTokenError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; errorInfo?: { code?: unknown } };
  const code = typeof e.code === "string" ? e.code : "";
  const infoCode =
    e.errorInfo && typeof e.errorInfo === "object" && typeof e.errorInfo.code === "string"
      ? e.errorInfo.code
      : "";
  return FCM_INVALID_CODES.has(code) || FCM_INVALID_CODES.has(infoCode);
}

/** Capacitor iOS registers a 32-byte APNs token as 64 hex chars — not an FCM registration token. */
function looksLikeApnsDeviceTokenHex(token: string): boolean {
  return /^[0-9a-f]{64}$/i.test(token.trim());
}

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
  return localHHMM >= start || localHHMM < end;
}

async function countSentToday(userId: string, timezone: string): Promise<number> {
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
 * Bump or decay the engagementScore when a notification is opened/ignored.
 * Best-effort — never throws.
 */
export async function updateEngagementScore(
  userId: string,
  opened: boolean,
): Promise<void> {
  try {
    const delta = opened ? 5 : -2;
    await db.execute(sql`
      UPDATE notification_preferences
      SET engagement_score = GREATEST(0, LEAST(100, engagement_score + ${delta})),
          updated_at = NOW()
      WHERE user_id = ${userId}
    `);
  } catch (err) {
    logger.warn({ err, userId }, "Failed to update engagement score");
  }
}

async function sendFcmWebPush(
  token: string,
  input: DispatchInput,
): Promise<void> {
  await getMessaging(adminApp()).send({
    token,
    webpush: {
      notification: {
        title: input.title,
        body: input.body,
        icon: "https://amynest.in/pwa-icon-192.png",
        badge: "https://amynest.in/pwa-icon-192.png",
        requireInteraction: false,
      },
      fcmOptions: {
        link: input.deepLink
          ? `https://amynest.in${input.deepLink.startsWith("/") ? input.deepLink : `/${input.deepLink}`}`
          : "https://amynest.in/",
      },
    },
    data: {
      title: input.title,
      body: input.body,
      category: input.category,
      deepLink: input.deepLink ?? "",
      ...(input.data
        ? Object.fromEntries(
            Object.entries(input.data).map(([k, v]) => [k, String(v)]),
          )
        : {}),
    },
  });
}

async function sendFcmAndroidPush(
  token: string,
  input: DispatchInput,
): Promise<void> {
  await getMessaging(adminApp()).send({
    token,
    notification: {
      title: input.title,
      body: input.body,
    },
    android: {
      notification: {
        icon: "ic_notification",
        color: "#6C63FF",
        channelId: "default",
        clickAction: "android.intent.action.MAIN",
      },
    },
    data: {
      category: input.category,
      deepLink: input.deepLink ?? "",
      url: input.deepLink ?? "",
      ...(input.data
        ? Object.fromEntries(
            Object.entries(input.data).map(([k, v]) => [k, String(v)]),
          )
        : {}),
    },
  });
}

async function sendFcmIosPush(
  token: string,
  input: DispatchInput,
): Promise<void> {
  await getMessaging(adminApp()).send({
    token,
    notification: {
      title: input.title,
      body: input.body,
    },
    apns: {
      headers: {
        "apns-priority": "10",
        "apns-push-type": "alert",
      },
      payload: {
        aps: {
          alert: {
            title: input.title,
            body: input.body,
          },
          sound: "default",
        },
      },
    },
    data: {
      category: input.category,
      deepLink: input.deepLink ?? "",
      ...(input.data
        ? Object.fromEntries(
            Object.entries(input.data).map(([k, v]) => [k, String(v)]),
          )
        : {}),
    },
  });
}

/**
 * Main entry point. Validates against prefs/cap/quiet hours/dedup, then
 * sends the notification to every registered push token for the user.
 * Daily cap is now driven by the user's intensity mode setting.
 */
export async function dispatchNotification(input: DispatchInput): Promise<DispatchResult> {
  const prefs = await getOrCreatePreferences(input.userId);

  if (!input.bypassCategoryCheck && !categoryEnabled(prefs, input.category)) {
    await logEvent(input, "throttled", "category_disabled");
    return { status: "throttled", reason: "category_disabled" };
  }

  let tokens = await db
    .select({ token: pushTokensTable.token, platform: pushTokensTable.platform })
    .from(pushTokensTable)
    .where(eq(pushTokensTable.userId, input.userId));

  if (input.restrictToPlatforms && input.restrictToPlatforms.length > 0) {
    const allow = new Set(input.restrictToPlatforms);
    tokens = tokens.filter((t) => allow.has(t.platform));
  }

  const expoTokens = tokens.filter((t) => Expo.isExpoPushToken(t.token));
  const webFcmTokens = tokens.filter(
    (t) => !Expo.isExpoPushToken(t.token) && t.platform === "web",
  );
  const androidFcmTokens = tokens.filter(
    (t) => !Expo.isExpoPushToken(t.token) && t.platform === "android",
  );
  const iosFcmTokens = tokens.filter(
    (t) =>
      !Expo.isExpoPushToken(t.token) &&
      (t.platform === "ios" || t.platform === "ios-capacitor") &&
      !looksLikeApnsDeviceTokenHex(t.token),
  );

  if (
    expoTokens.length === 0 &&
    webFcmTokens.length === 0 &&
    androidFcmTokens.length === 0 &&
    iosFcmTokens.length === 0
  ) {
    await logEvent(input, "no_tokens", "no_valid_tokens");
    return { status: "no_tokens", reason: "no_valid_tokens" };
  }

  if (input.dedupKey && (await isDuplicate(input.userId, input.dedupKey))) {
    await logEvent(input, "duplicate", "dedup_window");
    return { status: "duplicate", reason: "dedup_window" };
  }

  // routine_item (5-min task heads-up) are time-sensitive, user-initiated
  // reminders that expire immediately. They bypass the daily cap so that
  // static cron notifications filling the cap don't silence scheduled tasks.
  const isTimebound = input.category === "routine_item";
  if (!input.bypassDailyCap && !isTimebound) {
    const sentToday = await countSentToday(input.userId, prefs.timezone);
    const cap = effectiveDailyCap(prefs);
    if (sentToday >= cap) {
      await logEvent(input, "throttled", `daily_cap:${cap}:intensity=${prefs.notificationIntensity}`);
      return { status: "throttled", reason: "daily_cap" };
    }
  }

  if (!input.bypassQuietHours && inQuietHours(prefs)) {
    await logEvent(input, "throttled", "quiet_hours");
    return { status: "throttled", reason: "quiet_hours" };
  }

  const ticketIds: string[] = [];
  let expoOk = 0;
  let expoFail = 0;
  let webOk = 0;
  let webFail = 0;
  let androidOk = 0;
  let androidFail = 0;
  let iosOk = 0;
  let iosFail = 0;

  // ── Expo (mobile) ─────────────────────────────────────────────────────────
  if (expoTokens.length > 0) {
    const messages: ExpoPushMessage[] = expoTokens.map((t) => ({
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
      logger.error(
        { err, userId: input.userId, category: input.category },
        "Expo dispatch failed",
      );
      await logEvent(input, "failed", err instanceof Error ? err.message : String(err), "expo");
      return { status: "failed", reason: "expo_error" };
    }

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket && ticket.status === "error") {
        const errCode = ticket.details?.error;
        if (errCode === "DeviceNotRegistered") {
          const tok = expoTokens[i]?.token;
          if (tok) await pruneInvalidToken(tok, `expo:${errCode}`);
        }
        logger.warn(
          { err: ticket.message, code: errCode, userId: input.userId },
          "Expo ticket error",
        );
        expoFail++;
      } else if (ticket && ticket.status === "ok") {
        ticketIds.push(ticket.id);
        expoOk++;
      }
    }
  }

  // ── FCM web push (browser / PWA) ──────────────────────────────────────────
  if (webFcmTokens.length > 0) {
    const results = await Promise.allSettled(
      webFcmTokens.map(async (t) => {
        try {
          await sendFcmWebPush(t.token, input);
          return true;
        } catch (err) {
          if (isFcmInvalidTokenError(err)) {
            await pruneInvalidToken(t.token, "fcm:unregistered");
          }
          logger.error(
            { err, userId: input.userId, token: t.token.slice(0, 20) },
            "FCM web push failed",
          );
          return false;
        }
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) webOk++;
      else webFail++;
    }
  }

  // ── FCM Android push (KidSchedule native TWA wrapper) ────────────────────
  if (androidFcmTokens.length > 0) {
    const results = await Promise.allSettled(
      androidFcmTokens.map(async (t) => {
        try {
          await sendFcmAndroidPush(t.token, input);
          return true;
        } catch (err) {
          if (isFcmInvalidTokenError(err)) {
            await pruneInvalidToken(t.token, "fcm:unregistered");
          }
          logger.error(
            { err, userId: input.userId, token: t.token.slice(0, 20) },
            "FCM android push failed",
          );
          return false;
        }
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) androidOk++;
      else androidFail++;
    }
  }

  // ── FCM iOS (Capacitor native — FCM registration token, not raw APNs hex) ──
  if (iosFcmTokens.length > 0) {
    const results = await Promise.allSettled(
      iosFcmTokens.map(async (t) => {
        try {
          await sendFcmIosPush(t.token, input);
          return true;
        } catch (err) {
          if (isFcmInvalidTokenError(err)) {
            await pruneInvalidToken(t.token, "fcm:unregistered");
          }
          logger.error(
            { err, userId: input.userId, token: t.token.slice(0, 20) },
            "FCM iOS push failed",
          );
          return false;
        }
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) iosOk++;
      else iosFail++;
    }
  }

  const platformParts: string[] = [];
  if (expoTokens.length > 0) platformParts.push("expo");
  if (webFcmTokens.length > 0) platformParts.push("web");
  if (androidFcmTokens.length > 0) platformParts.push("android");
  if (iosFcmTokens.length > 0) platformParts.push("ios");
  const platform = platformParts.join("+") || "unknown";

  const totalOk = expoOk + webOk + androidOk + iosOk;
  const totalFail = expoFail + webFail + androidFail + iosFail;
  if (totalOk === 0 && totalFail > 0) {
    await logEvent(
      input,
      "failed",
      `all_tokens_failed:expo=${expoFail},web=${webFail},android=${androidFail},ios=${iosFail}`,
      platform,
    );
    logger.warn(
      {
        userId: input.userId,
        category: input.category,
        expoFail,
        webFail,
        androidFail,
        iosFail,
      },
      "Notification dispatch: all tokens failed",
    );
    return { status: "failed", reason: "all_tokens_failed" };
  }

  await logEvent(input, "sent", undefined, platform);
  logger.info(
    {
      userId: input.userId,
      category: input.category,
      intensity: prefs.notificationIntensity,
      engagementScore: prefs.engagementScore,
      expoOk,
      expoFail,
      webOk,
      webFail,
      androidOk,
      androidFail,
      iosOk,
      iosFail,
    },
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
