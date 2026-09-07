import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  notificationLogTable,
  notificationPreferencesTable,
  pushTokensTable,
  childrenTable,
  parentProfilesTable,
  intensityToCap,
  type NotificationCategory,
} from "@workspace/db";
import {
  parseFingerprintChildId,
  resolveFingerprint,
  stableNotificationId,
  canDeliverPush,
  isTransactionalNotificationCategory,
  isStalePushToken,
} from "@workspace/notification-engine";
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { getMessaging } from "firebase-admin/messaging";
import { adminApp } from "../lib/firebase-admin";
import { logger } from "../lib/logger.js";
import { buildNotificationActionPayload } from "@workspace/action-routing";
import {
  finalizeNotificationClaim,
  logNonDeliveryEvent,
} from "./notificationClaimService.js";
import { atomicAcquireDeliverySlot } from "./notificationRateLimitService.js";
import {
  checkNotificationMetricAlerts,
  recordNotificationMetric,
} from "./notification-metrics-store.js";

const expo = new Expo();

/** iOS APNs sound paths — files live in App bundle subfolder NotificationSounds/. */
const IOS_NOTIFICATION_SOUND_PREFIX = "NotificationSounds/";

function iosNotificationSound(category: NotificationCategory): string {
  switch (category) {
    case "routine":
    case "routine_item":
    case "good_night":
      return `${IOS_NOTIFICATION_SOUND_PREFIX}amynest_nest_chime.caf`;
    case "milestone":
    case "weekly":
    case "engagement":
      return `${IOS_NOTIFICATION_SOUND_PREFIX}amynest_sparkle.caf`;
    case "insights":
    case "parenting_tips":
    case "infant_care":
      return `${IOS_NOTIFICATION_SOUND_PREFIX}amynest_soft_bell.caf`;
    case "story_time":
      return `${IOS_NOTIFICATION_SOUND_PREFIX}amynest_story_ping.caf`;
    case "nutrition":
    case "phonics":
    case "learning_activity":
      return `${IOS_NOTIFICATION_SOUND_PREFIX}amynest_learning_pop.caf`;
    default:
      return `${IOS_NOTIFICATION_SOUND_PREFIX}amynest_nest_chime.caf`;
  }
}

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
   * Skip push consent gate. ONLY for explicit user-initiated delivery tests
   * (same trust level as bypassDailyCap / bypassQuietHours).
   */
  bypassPushConsent?: boolean;
  /**
   * When set, only tokens whose stored `platform` matches one of these values
   * are considered (e.g. test ping from iOS simulator → `["ios-capacitor"]`
   * so Android stays silent). Cron / normal sends omit this.
   */
  restrictToPlatforms?: readonly string[];
  /** Adaptive engine metadata for analytics and anti-repetition. */
  contentMeta?: {
    contentHash?: string;
    topicKey?: string;
    recommendationKey?: string;
    theme?: string;
    contentType?: string;
    noveltyScore?: number;
    relevanceScore?: number;
    recencyScore?: number;
    engagementPredictionScore?: number;
    qualityScore?: number;
    businessImpactScore?: number;
    routineCompletionProb?: number;
    learningCompletionProb?: number;
    retentionProb?: number;
    subscriptionProb?: number;
    engagementProb?: number;
  };
  /** Outcome optimization metadata. */
  outcomeMeta?: {
    goal?: string;
    childLifecycleStage?: string;
    parentMilestone?: string | null;
    campaignId?: string | null;
    campaignStep?: number | null;
    experimentId?: string | null;
    experimentVariant?: string | null;
    /** CRM segment metadata */
    segment?: string | null;
    journeyStepId?: string | null;
  };
  /** Global delivery dimensions for regional analytics. */
  globalMeta?: {
    countryCode?: string | null;
    locale?: string | null;
    timezoneAtSend?: string | null;
    culturalRegion?: string | null;
  };
}

export type DispatchStatus =
  | "sent"
  | "throttled"
  | "failed"
  | "duplicate"
  | "rate_limited"
  | "cooldown_blocked"
  | "no_tokens";

export interface DispatchResult {
  status: DispatchStatus;
  reason?: string;
  /** Human-readable FCM/APNs error when status is `failed` (e.g. test push). */
  detail?: string;
  ticketIds?: string[];
}

export async function getOrCreatePreferences(userId: string) {
  const existing = await getPreferencesIfExists(userId);
  if (existing) return existing;

  const [created] = await db
    .insert(notificationPreferencesTable)
    .values({ userId })
    .onConflictDoNothing({ target: notificationPreferencesTable.userId })
    .returning();
  if (created) return created;

  const retry = await getPreferencesIfExists(userId);
  if (!retry) throw new Error("Failed to create notification preferences");
  return retry;
}

/** SELECT-only. Never inserts. Used by production dry-run. */
export async function getPreferencesIfExists(userId: string) {
  const [existing] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);
  return existing ?? null;
}

/** In-memory schema defaults — no database write. */
export function dryRunDefaultPreferences(
  userId: string,
): Awaited<ReturnType<typeof getOrCreatePreferences>> {
  const now = new Date(0);
  return {
    id: 0,
    userId,
    routineEnabled: true,
    routineItemEnabled: true,
    nutritionEnabled: true,
    insightsEnabled: true,
    weeklyEnabled: true,
    engagementEnabled: true,
    goodNightEnabled: true,
    parentingTipsEnabled: true,
    storyTimeEnabled: true,
    phonicsEnabled: true,
    learningActivityEnabled: true,
    milestoneEnabled: true,
    infantCareEnabled: true,
    timezone: "Asia/Kolkata",
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    dailyCap: 10,
    notificationIntensity: "balanced",
    engagementScore: 50,
    locale: "en-US",
    countryCode: null,
    pushConsentAt: null,
    pushConsentVersion: null,
    marketingOptIn: false,
    preferredEngagementHour: null,
    smartDeliveryEnabled: true,
    pushSoundsEnabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function resolveChildAgeYears(userId: string): Promise<number | null> {
  const [youngest] = await db
    .select({
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .orderBy(childrenTable.age, childrenTable.ageMonths)
    .limit(1);
  if (!youngest) return null;
  return Math.max(0, Math.floor(Number(youngest.age ?? 0)));
}

async function assertPushConsentAllowed(
  input: DispatchInput,
  prefs: Awaited<ReturnType<typeof getOrCreatePreferences>>,
): Promise<DispatchResult | null> {
  if (input.bypassPushConsent) return null;

  const [profile] = await db
    .select({ country: parentProfilesTable.country })
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, input.userId))
    .limit(1);

  const childAgeYears = await resolveChildAgeYears(input.userId);
  const consent = canDeliverPush({
    pushConsentAt: prefs.pushConsentAt,
    pushConsentVersion: prefs.pushConsentVersion,
    marketingOptIn: prefs.marketingOptIn,
    countryCode: profile?.country ?? prefs.countryCode ?? null,
    childAgeYears,
  });

  if (!consent.allowed) {
    await logNonDeliveryEvent(input, "throttled", consent.reason ?? "missing_push_consent");
    return { status: "throttled", reason: consent.reason ?? "missing_push_consent" };
  }

  return null;
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
    case "infant_care":        return prefs.infantCareEnabled;
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

/** Remove legacy Capacitor APNs hex rows — never deliverable via FCM. */
export async function pruneApnsHexTokens(): Promise<number> {
  const removed = await db
    .delete(pushTokensTable)
    .where(sql`trim(${pushTokensTable.token}) ~ '^[0-9a-fA-F]{64}$'`)
    .returning({ id: pushTokensTable.id });
  if (removed.length > 0) {
    logger.info({ removed: removed.length }, "Pruned undeliverable APNs hex push tokens");
  }
  return removed.length;
}

const FCM_INVALID_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

function fcmErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const e = err as { message?: unknown; errorInfo?: { message?: unknown } };
  return (
    (typeof e.message === "string" ? e.message : "") ||
    (e.errorInfo && typeof e.errorInfo.message === "string" ? e.errorInfo.message : "")
  );
}

export function isFcmInvalidTokenError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; errorInfo?: { code?: unknown } };
  const code = typeof e.code === "string" ? e.code : "";
  const infoCode =
    e.errorInfo && typeof e.errorInfo === "object" && typeof e.errorInfo.code === "string"
      ? e.errorInfo.code
      : "";
  if (FCM_INVALID_CODES.has(code) || FCM_INVALID_CODES.has(infoCode)) return true;
  const msg = fcmErrorMessage(err).toLowerCase();
  return msg.includes("requested entity was not found");
}

/** Firebase/APNs project misconfiguration — not a bad device token. */
export function isFcmApnsConfigurationError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; errorInfo?: { code?: unknown; message?: unknown }; message?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  const infoCode =
    e.errorInfo && typeof e.errorInfo === "object" && typeof e.errorInfo.code === "string"
      ? e.errorInfo.code
      : "";
  if (code === "messaging/third-party-auth-error" || infoCode === "messaging/third-party-auth-error") {
    return true;
  }
  const msg = (
    (typeof e.message === "string" ? e.message : "") ||
    (e.errorInfo && typeof e.errorInfo.message === "string" ? e.errorInfo.message : "")
  ).toLowerCase();
  return (
    msg.includes("authentication credential") ||
    msg.includes("oauth 2 access token") ||
    msg.includes("apns credentials") ||
    msg.includes("third-party-auth")
  );
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

async function logLegacyDelivery(
  input: DispatchInput,
  status: "sent" | "failed",
  errorMessage?: string,
  platform?: string,
  providerMessageId?: string,
): Promise<void> {
  const meta = input.contentMeta;
  const global = input.globalMeta;
  const outcome = input.outcomeMeta;
  await db.insert(notificationLogTable).values({
    userId: input.userId,
    category: input.category,
    title: input.title,
    body: input.body,
    deepLink: input.deepLink ?? null,
    dedupKey: null,
    status,
    platform: platform ?? null,
    providerMessageId: providerMessageId ?? null,
    errorMessage: errorMessage ?? null,
    contentHash: meta?.contentHash ?? null,
    topicKey: meta?.topicKey ?? null,
    recommendationKey: meta?.recommendationKey ?? null,
    theme: meta?.theme ?? null,
    contentType: meta?.contentType ?? null,
    noveltyScore: meta?.noveltyScore ?? null,
    relevanceScore: meta?.relevanceScore ?? null,
    recencyScore: meta?.recencyScore ?? null,
    engagementPredictionScore: meta?.engagementPredictionScore ?? null,
    qualityScore: meta?.businessImpactScore ?? meta?.qualityScore ?? null,
    businessImpactScore: meta?.businessImpactScore ?? meta?.qualityScore ?? null,
    routineCompletionProb: meta?.routineCompletionProb ?? null,
    learningCompletionProb: meta?.learningCompletionProb ?? null,
    retentionProb: meta?.retentionProb ?? null,
    subscriptionProb: meta?.subscriptionProb ?? null,
    engagementProb: meta?.engagementProb ?? null,
    goal: outcome?.goal ?? null,
    childLifecycleStage: outcome?.childLifecycleStage ?? null,
    parentMilestone: outcome?.parentMilestone ?? null,
    campaignId: outcome?.campaignId ?? null,
    campaignStep: outcome?.campaignStep ?? null,
    experimentId: outcome?.experimentId ?? null,
    experimentVariant: outcome?.experimentVariant ?? null,
    segment: outcome?.segment ?? null,
    journeyStepId: outcome?.journeyStepId ?? null,
    countryCode: global?.countryCode ?? null,
    locale: global?.locale ?? null,
    timezoneAtSend: global?.timezoneAtSend ?? null,
    culturalRegion: global?.culturalRegion ?? null,
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
      fingerprint: input.dedupKey ?? "",
      notificationId: input.dedupKey ?? "",
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
  fingerprint: string,
  pushSoundsEnabled: boolean,
): Promise<void> {
  const notificationId = stableNotificationId(fingerprint);
  // Data-only so KidScheduleFcmService always builds the tray notification with
  // a PendingIntent that carries deepLink + category (system-displayed FCM
  // notification taps often open the app without those extras).
  await getMessaging(adminApp()).send({
    token,
    data: {
      title: input.title,
      body: input.body,
      category: input.category,
      deepLink: input.deepLink ?? "",
      url: input.deepLink ?? "",
      fingerprint,
      notificationId: String(notificationId),
      soundEnabled: pushSoundsEnabled ? "true" : "false",
      ...(input.data
        ? Object.fromEntries(
            Object.entries(input.data).map(([k, v]) => [k, String(v)]),
          )
        : {}),
    },
    android: {
      priority: "high",
    },
  });
}

function formatFcmError(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);
  const e = err as { code?: string; message?: string; errorInfo?: { message?: string } };
  const code = typeof e.code === "string" ? e.code : "";
  const msg =
    (typeof e.message === "string" && e.message) ||
    (e.errorInfo && typeof e.errorInfo.message === "string" ? e.errorInfo.message : "");
  return [code, msg].filter(Boolean).join(": ") || "FCM send failed";
}

async function sendFcmIosPush(
  token: string,
  input: DispatchInput,
  pushSoundsEnabled: boolean,
): Promise<void> {
  // iOS: alert payload via APNs only (top-level `notification` can break delivery on some builds).
  await getMessaging(adminApp()).send({
    token,
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
          ...(pushSoundsEnabled
            ? { sound: iosNotificationSound(input.category) }
            : {}),
        },
      },
    },
    data: {
      category: input.category,
      deepLink: input.deepLink ?? "",
      fingerprint: input.dedupKey ?? "",
      notificationId: input.dedupKey ?? "",
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
  const actionPayload = buildNotificationActionPayload({
    category: input.category,
    deepLink: input.deepLink,
    data: input.data,
  });
  input.deepLink = actionPayload.deepLink;
  input.data = { ...input.data, ...actionPayload.data };

  const prefs = await getOrCreatePreferences(input.userId);

  const consentBlock = await assertPushConsentAllowed(input, prefs);
  if (consentBlock) return consentBlock;

  const localScheduledDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: prefs.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const childIdFromData =
    input.data?.childId != null ? String(input.data.childId) : undefined;
  const fingerprint =
    resolveFingerprint(input.dedupKey, {
      childId: childIdFromData,
      notificationType: input.category,
      entityId: input.contentMeta?.topicKey ?? input.category,
      scheduledDate: localScheduledDate,
    }) ?? input.dedupKey;
  if (fingerprint) {
    input.dedupKey = fingerprint;
  }

  if (!input.bypassCategoryCheck && !categoryEnabled(prefs, input.category)) {
    await logNonDeliveryEvent(input, "throttled", "category_disabled");
    return { status: "throttled", reason: "category_disabled" };
  }

  let tokens = await db
    .select({
      token: pushTokensTable.token,
      platform: pushTokensTable.platform,
      lastSeenAt: pushTokensTable.lastSeenAt,
    })
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
      !looksLikeApnsDeviceTokenHex(t.token) &&
      !String(t.token).startsWith("http"),
  );

  if (
    expoTokens.length === 0 &&
    webFcmTokens.length === 0 &&
    androidFcmTokens.length === 0 &&
    iosFcmTokens.length === 0
  ) {
    await logNonDeliveryEvent(input, "no_tokens", "no_valid_tokens");
    return { status: "no_tokens", reason: "no_valid_tokens" };
  }

  const now = new Date();
  const lastAppOpenAt = tokens.reduce<Date | null>((acc, t) => {
    if (!t.lastSeenAt) return acc;
    if (!acc || t.lastSeenAt > acc) return t.lastSeenAt;
    return acc;
  }, null);
  const allTokensStale =
    tokens.length > 0 && tokens.every((t) => isStalePushToken(t.lastSeenAt, now));
  if (allTokensStale && input.bypassDailyCap !== true) {
    logger.info(
      {
        evt: "notification_suppressed",
        reason: "stale_token",
        userId: input.userId,
        category: input.category,
      },
      "Notification suppressed because every push token is stale",
    );
    await logNonDeliveryEvent(input, "no_tokens", "stale_token");
    return { status: "no_tokens", reason: "stale_token" };
  }

  if (!input.bypassQuietHours && inQuietHours(prefs)) {
    await logNonDeliveryEvent(input, "throttled", "quiet_hours");
    return { status: "throttled", reason: "quiet_hours" };
  }

  // routine_item (5-min task heads-up) are time-sensitive, user-initiated
  // reminders that expire immediately. They bypass the intensity daily cap so
  // static cron notifications filling the cap don't silence scheduled tasks.
  const isTimebound = input.category === "routine_item";
  const skipGlobal =
    input.bypassDailyCap === true || isTransactionalNotificationCategory(input.category);

  let claimId: number | null = null;
  if (input.dedupKey) {
    const slot = await atomicAcquireDeliverySlot({
      ...input,
      timezone: prefs.timezone,
      intensityDailyCap: effectiveDailyCap(prefs),
      skipIntensityCap: input.bypassDailyCap === true || isTimebound,
      skipGlobalProactiveFatigue: skipGlobal,
      lastAppOpenAt,
      now,
    });
    if (!slot.ok) {
      if (slot.status === "rate_limited") {
        return { status: "rate_limited", reason: slot.reason };
      }
      if (slot.status === "cooldown_blocked") {
        return { status: "cooldown_blocked", reason: slot.reason };
      }
      if (slot.status === "throttled") {
        return { status: "throttled", reason: slot.reason };
      }
      return { status: "duplicate", reason: slot.reason };
    }
    claimId = slot.claimId;
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
      if (claimId != null) {
        await finalizeNotificationClaim(claimId, {
          status: "failed",
          platform: "expo",
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      } else {
        await logLegacyDelivery(
          input,
          "failed",
          err instanceof Error ? err.message : String(err),
          "expo",
        );
      }
      recordNotificationMetric("notification_failed_total");
      void checkNotificationMetricAlerts();
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
          await sendFcmAndroidPush(
            t.token,
            input,
            input.dedupKey ?? input.title,
            prefs.pushSoundsEnabled,
          );
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
  let lastIosFcmError: string | undefined;
  if (iosFcmTokens.length > 0) {
    const results = await Promise.allSettled(
      iosFcmTokens.map(async (t) => {
        try {
          await sendFcmIosPush(t.token, input, prefs.pushSoundsEnabled);
          return true;
        } catch (err) {
          lastIosFcmError = formatFcmError(err);
          if (isFcmInvalidTokenError(err)) {
            await pruneInvalidToken(t.token, "fcm:unregistered");
          }
          if (isFcmApnsConfigurationError(err)) {
            logger.warn(
              { err: lastIosFcmError, userId: input.userId },
              "FCM iOS push skipped — Firebase/APNs project configuration issue",
            );
          } else {
            logger.error(
              { err, userId: input.userId, token: t.token.slice(0, 20) },
              "FCM iOS push failed",
            );
          }
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
    const errMsg = `all_tokens_failed:expo=${expoFail},web=${webFail},android=${androidFail},ios=${iosFail}`;
    if (claimId != null) {
      await finalizeNotificationClaim(claimId, {
        status: "failed",
        platform,
        errorMessage: errMsg,
      });
    } else {
      await logLegacyDelivery(input, "failed", errMsg, platform);
    }
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
    recordNotificationMetric("notification_failed_total");
    void checkNotificationMetricAlerts();
    return {
      status: "failed",
      reason: "all_tokens_failed",
      detail: lastIosFcmError,
    };
  }

  const providerMessageId = ticketIds[0];
  if (claimId != null) {
    await finalizeNotificationClaim(claimId, {
      status: "sent",
      platform,
      providerMessageId,
    });
  } else {
    await logLegacyDelivery(input, "sent", undefined, platform, providerMessageId);
  }
  recordNotificationMetric("notification_sent_total");
  try {
    const { touchFatigueLastSent } = await import("./notificationContentHistoryService.js");
    await touchFatigueLastSent(input.userId);
  } catch {
    /* best-effort */
  }
  logger.info(
    {
      evt: "NOTIFICATION_CREATED",
      timestamp: new Date().toISOString(),
      userId: input.userId,
      childId: input.dedupKey ? parseFingerprintChildId(input.dedupKey) : null,
      notificationType: input.category,
      fingerprint: input.dedupKey,
      notificationId: input.dedupKey ? stableNotificationId(input.dedupKey) : null,
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
  void checkNotificationMetricAlerts();
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
