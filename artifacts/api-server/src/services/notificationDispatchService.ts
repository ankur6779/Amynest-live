import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  notificationLogTable,
  notificationPreferencesTable,
  pushTokensTable,
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
  /**
   * Skip the daily cap check. Reserved for critical messages — none today.
   */
  bypassDailyCap?: boolean;
  /**
   * Skip the quiet-hours gate. For explicit user-initiated test sends only.
   */
  bypassQuietHours?: boolean;
  /**
   * Skip the per-category enablement check. For explicit user-initiated
   * test sends so the delivery test always fires even if the category is off.
   */
  bypassCategoryCheck?: boolean;
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
    case "routine_item":
      return prefs.routineItemEnabled;
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
 * Permanently delete a token row when the upstream provider tells us it's
 * no longer valid (uninstall, permission revoked, FCM rotation). Best-effort:
 * never throws.
 */
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

/**
 * Sweep: remove tokens whose lastSeenAt is older than `maxDays`.
 * Returns the number of rows removed.
 */
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

/**
 * FCM error codes that mean "this token is gone — stop sending to it".
 *
 * Intentionally narrow: we only auto-delete on codes that the FCM admin
 * SDK emits per-token when the registration is no longer valid. Generic
 * codes like `messaging/invalid-argument` can fire for malformed payloads
 * (not the token's fault) and would silently disconnect healthy devices,
 * so they are NOT in this list.
 */
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
 * Send via Firebase Admin to a single FCM web push token.
 * Errors are logged but do not abort Expo sends.
 */
async function sendFcmWebPush(
  token: string,
  input: DispatchInput,
): Promise<void> {
  await getMessaging(adminApp()).send({
    token,
    notification: {
      title: input.title,
      body: input.body,
    },
    webpush: {
      notification: {
        icon: "/pwa-icon-192.png",
        badge: "/pwa-icon-192.png",
      },
      fcmOptions: {
        link: input.deepLink ?? "/",
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
 * Send via Firebase Admin to a native Android FCM token (KidSchedule TWA/WebView wrapper).
 * Uses `android` notification config — native tokens silently drop `webpush` messages.
 * channelId "default" matches the channel registered in KidScheduleFcmService.kt.
 */
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
        // Opens MainActivity (the TWA/WebView launcher) when the user taps the
        // system-tray notification. FCM resolves this to the activity registered
        // with android.intent.action.MAIN in AndroidManifest.xml, passing the
        // data payload (including deepLink) as Intent extras so MainActivity
        // can navigate the WebView to the correct route.
        clickAction: "android.intent.action.MAIN",
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
 * sends the notification to every registered Expo push token (mobile) and
 * every FCM web push token (browser) for the user.
 */
export async function dispatchNotification(input: DispatchInput): Promise<DispatchResult> {
  const prefs = await getOrCreatePreferences(input.userId);

  if (!input.bypassCategoryCheck && !categoryEnabled(prefs, input.category)) {
    await logEvent(input, "throttled", "category_disabled");
    return { status: "throttled", reason: "category_disabled" };
  }

  // Fetch tokens first — no point running throttle checks if there's nobody to
  // send to. Returning no_tokens before quiet-hours / daily-cap also avoids
  // counting user-less dispatch attempts against the cap.
  const tokens = await db
    .select({ token: pushTokensTable.token, platform: pushTokensTable.platform })
    .from(pushTokensTable)
    .where(eq(pushTokensTable.userId, input.userId));

  const expoTokens = tokens.filter((t) => Expo.isExpoPushToken(t.token));
  // FCM tokens come from two sources, both routed through Firebase Admin:
  //   - platform "web"     → browser web push via service worker (FCM JS SDK)
  //                          must use `webpush` config
  //   - platform "android" → native FCM token from KidSchedule TWA wrapper
  //                          (registered via PushBridge.kt → /api/push/register)
  //                          must use `android` config — webpush is silently dropped
  const webFcmTokens = tokens.filter(
    (t) => !Expo.isExpoPushToken(t.token) && t.platform === "web",
  );
  const androidFcmTokens = tokens.filter(
    (t) => !Expo.isExpoPushToken(t.token) && t.platform === "android",
  );

  if (expoTokens.length === 0 && webFcmTokens.length === 0 && androidFcmTokens.length === 0) {
    await logEvent(input, "no_tokens", "no_valid_tokens");
    return { status: "no_tokens", reason: "no_valid_tokens" };
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

  // ── Expo (mobile) ──────────────────────────────────────────────────────────
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

    // Walk tickets in order — Expo returns one ticket per token in input order,
    // so an "error" ticket with DeviceNotRegistered points at expoTokens[i].
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket && ticket.status === "error") {
        const errCode = ticket.details?.error;
        // Only prune on per-device "not registered" — InvalidCredentials is
        // a server/config issue (bad Expo access token, wrong project) and
        // would wrongly disconnect every token if we deleted on it.
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

  // ── FCM web push (browser / PWA) ───────────────────────────────────────────
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

  // ── FCM Android push (KidSchedule native TWA wrapper) ──────────────────────
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

  // Build a platform label reflecting every active send path.
  const platformParts: string[] = [];
  if (expoTokens.length > 0) platformParts.push("expo");
  if (webFcmTokens.length > 0) platformParts.push("web");
  if (androidFcmTokens.length > 0) platformParts.push("android");
  const platform = platformParts.join("+") || "unknown";

  // If every token attempt failed, surface that as "failed" instead of
  // pretending the notification went out — diagnostics and the recent-
  // deliveries UI rely on this status to show the correct icon and to
  // help users understand why their device went quiet.
  const totalOk = expoOk + webOk + androidOk;
  const totalFail = expoFail + webFail + androidFail;
  if (totalOk === 0 && totalFail > 0) {
    await logEvent(
      input,
      "failed",
      `all_tokens_failed:expo=${expoFail},web=${webFail},android=${androidFail}`,
      platform,
    );
    logger.warn(
      {
        userId: input.userId,
        category: input.category,
        expoFail,
        webFail,
        androidFail,
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
      expoOk,
      expoFail,
      webOk,
      webFail,
      androidOk,
      androidFail,
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
