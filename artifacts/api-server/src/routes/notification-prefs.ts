import { Router, type IRouter } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import {
  childrenTable,
  db,
  notificationLogTable,
  notificationPreferencesTable,
  pushTokensTable,
  routinesTable,
  NOTIFICATION_CATEGORIES,
  intensityToCap,
  type NotificationCategory,
} from "@workspace/db";
import {
  dispatchNotification,
  effectiveDailyCap,
  getNotificationHistory,
  getOrCreatePreferences,
} from "../services/notificationDispatchService";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * GET /api/notifications/categories
 * Returns the user's per-category toggles, intensity, timezone, quiet hours.
 * Lazily creates defaults on first request.
 */
router.get("/notifications/categories", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const prefs = await getOrCreatePreferences(userId);
  res.json({
    // Core categories
    routineEnabled: prefs.routineEnabled,
    routineItemEnabled: prefs.routineItemEnabled,
    nutritionEnabled: prefs.nutritionEnabled,
    insightsEnabled: prefs.insightsEnabled,
    weeklyEnabled: prefs.weeklyEnabled,
    engagementEnabled: prefs.engagementEnabled,
    goodNightEnabled: prefs.goodNightEnabled,
    // Smart engine categories
    parentingTipsEnabled: prefs.parentingTipsEnabled,
    storyTimeEnabled: prefs.storyTimeEnabled,
    phonicsEnabled: prefs.phonicsEnabled,
    learningActivityEnabled: prefs.learningActivityEnabled,
    milestoneEnabled: prefs.milestoneEnabled,
    infantCareEnabled: prefs.infantCareEnabled,
    // Schedule / limits
    timezone: prefs.timezone,
    quietHoursStart: prefs.quietHoursStart,
    quietHoursEnd: prefs.quietHoursEnd,
    dailyCap: effectiveDailyCap(prefs),
    notificationIntensity: prefs.notificationIntensity,
    engagementScore: prefs.engagementScore,
    locale: prefs.locale,
    countryCode: prefs.countryCode,
    preferredEngagementHour: prefs.preferredEngagementHour,
    smartDeliveryEnabled: prefs.smartDeliveryEnabled,
    pushConsentAt: prefs.pushConsentAt?.toISOString() ?? null,
  });
});

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const INTENSITY_VALUES = ["minimal", "balanced", "active", "growth"] as const;

const PatchSchema = z.object({
  // Core categories
  routineEnabled: z.boolean().optional(),
  routineItemEnabled: z.boolean().optional(),
  nutritionEnabled: z.boolean().optional(),
  insightsEnabled: z.boolean().optional(),
  weeklyEnabled: z.boolean().optional(),
  engagementEnabled: z.boolean().optional(),
  goodNightEnabled: z.boolean().optional(),
  // Smart engine categories
  parentingTipsEnabled: z.boolean().optional(),
  storyTimeEnabled: z.boolean().optional(),
  phonicsEnabled: z.boolean().optional(),
  learningActivityEnabled: z.boolean().optional(),
  milestoneEnabled: z.boolean().optional(),
  // Schedule / limits
  timezone: z
    .string()
    .min(1)
    .max(64)
    .refine(isValidTimezone, { message: "Invalid IANA timezone" })
    .optional(),
  quietHoursStart: z.string().regex(HHMM_REGEX).optional(),
  quietHoursEnd: z.string().regex(HHMM_REGEX).optional(),
  dailyCap: z.number().int().min(1).max(20).optional(),
  notificationIntensity: z.enum(INTENSITY_VALUES).optional(),
  locale: z.string().min(2).max(16).optional(),
  countryCode: z.string().length(2).optional(),
  smartDeliveryEnabled: z.boolean().optional(),
  marketingOptIn: z.boolean().optional(),
});

router.patch("/notifications/categories", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = PatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  await getOrCreatePreferences(userId);

  // When intensity changes, sync dailyCap to the matching cap value so
  // legacy code that reads dailyCap directly stays consistent.
  const setPayload: Partial<typeof notificationPreferencesTable.$inferInsert> = {
    ...parsed.data,
    updatedAt: new Date(),
  };
  if (parsed.data.notificationIntensity) {
    setPayload.dailyCap = intensityToCap(parsed.data.notificationIntensity);
  }

  await db
    .update(notificationPreferencesTable)
    .set(setPayload)
    .where(eq(notificationPreferencesTable.userId, userId));
  const updated = await getOrCreatePreferences(userId);
  res.json({
    routineEnabled: updated.routineEnabled,
    routineItemEnabled: updated.routineItemEnabled,
    nutritionEnabled: updated.nutritionEnabled,
    insightsEnabled: updated.insightsEnabled,
    weeklyEnabled: updated.weeklyEnabled,
    engagementEnabled: updated.engagementEnabled,
    goodNightEnabled: updated.goodNightEnabled,
    parentingTipsEnabled: updated.parentingTipsEnabled,
    storyTimeEnabled: updated.storyTimeEnabled,
    phonicsEnabled: updated.phonicsEnabled,
    learningActivityEnabled: updated.learningActivityEnabled,
    milestoneEnabled: updated.milestoneEnabled,
    timezone: updated.timezone,
    quietHoursStart: updated.quietHoursStart,
    quietHoursEnd: updated.quietHoursEnd,
    dailyCap: effectiveDailyCap(updated),
    notificationIntensity: updated.notificationIntensity,
    engagementScore: updated.engagementScore,
    locale: updated.locale,
    countryCode: updated.countryCode,
    preferredEngagementHour: updated.preferredEngagementHour,
    smartDeliveryEnabled: updated.smartDeliveryEnabled,
    pushConsentAt: updated.pushConsentAt?.toISOString() ?? null,
  });
});

router.get("/notifications/history", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const limit = Math.min(Number(req.query["limit"]) || 50, 200);
  const rows = await getNotificationHistory(userId, limit);
  res.json({ items: rows });
});

/**
 * GET /api/notifications/diagnostics
 */
router.get("/notifications/diagnostics", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const prefs = await getOrCreatePreferences(userId);
  const tokens = await db
    .select({
      id: pushTokensTable.id,
      platform: pushTokensTable.platform,
      deviceName: pushTokensTable.deviceName,
      tokenPrefix: pushTokensTable.token,
      createdAt: pushTokensTable.createdAt,
      lastSeenAt: pushTokensTable.lastSeenAt,
    })
    .from(pushTokensTable)
    .where(eq(pushTokensTable.userId, userId))
    .orderBy(desc(pushTokensTable.lastSeenAt));
  const recent = await getNotificationHistory(userId, 10);

  const localHHMM = new Intl.DateTimeFormat("en-GB", {
    timeZone: prefs.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const start = prefs.quietHoursStart;
  const end = prefs.quietHoursEnd;
  let inQuietHours = false;
  if (start !== end) {
    inQuietHours = start < end
      ? localHHMM >= start && localHHMM < end
      : localHHMM >= start || localHHMM < end;
  }

  const fixedCategorySchedule: Array<{ category: NotificationCategory; hhmm: string; enabled: boolean }> = [
    { category: "routine",           hhmm: "07:30", enabled: prefs.routineEnabled        },
    { category: "parenting_tips",    hhmm: "09:00", enabled: prefs.parentingTipsEnabled  },
    { category: "learning_activity", hhmm: "10:30", enabled: prefs.learningActivityEnabled },
    { category: "milestone",         hhmm: "11:00", enabled: prefs.milestoneEnabled      },
    { category: "insights",          hhmm: "12:30", enabled: prefs.insightsEnabled       },
    { category: "nutrition",         hhmm: "15:30", enabled: prefs.nutritionEnabled      },
    { category: "phonics",           hhmm: "16:00", enabled: prefs.phonicsEnabled        },
    { category: "nutrition",         hhmm: "18:30", enabled: prefs.nutritionEnabled      },
    { category: "engagement",        hhmm: "19:00", enabled: prefs.engagementEnabled     },
    { category: "story_time",        hhmm: "20:00", enabled: prefs.storyTimeEnabled      },
    { category: "good_night",        hhmm: "21:00", enabled: prefs.goodNightEnabled      },
  ];

  const REMINDER_LEAD_MINUTES = 5;
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: prefs.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [hh, mm] = localHHMM.split(":").map((s) => parseInt(s, 10));
  const nowMins = (hh ?? 0) * 60 + (mm ?? 0);

  type Candidate = { category: NotificationCategory; localTime: string; minutesFromNow: number; activity?: string };
  const candidates: Candidate[] = [];

  for (const slot of fixedCategorySchedule) {
    if (!slot.enabled) continue;
    const [sh, sm] = slot.hhmm.split(":").map((s) => parseInt(s, 10));
    const slotMins = (sh ?? 0) * 60 + (sm ?? 0);
    if (slotMins > nowMins) {
      candidates.push({
        category: slot.category,
        localTime: slot.hhmm,
        minutesFromNow: slotMins - nowMins,
      });
    }
  }

  if (prefs.routineItemEnabled) {
    try {
      const rows = await db
        .select({ routine: routinesTable })
        .from(routinesTable)
        .innerJoin(childrenTable, eq(childrenTable.id, routinesTable.childId))
        .where(and(eq(childrenTable.userId, userId), eq(routinesTable.date, localDate)));
      for (const { routine } of rows) {
        const uiPrefs = routine.uiPrefs as { pushReminders?: unknown } | null;
        if (!uiPrefs || uiPrefs.pushReminders !== true) continue;
        const items = (routine.items ?? []) as Array<{ time?: string; activity?: string; status?: string }>;
        for (const item of items) {
          if (!item.time || !item.activity) continue;
          if (item.status === "completed" || item.status === "skipped") continue;
          const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(item.time.trim());
          if (!m) continue;
          let h = parseInt(m[1]!, 10);
          const mi = parseInt(m[2]!, 10);
          if (h === 12) h = 0;
          if (m[3]!.toUpperCase() === "PM") h += 12;
          const itemMins = h * 60 + mi - REMINDER_LEAD_MINUTES;
          if (itemMins > nowMins) {
            const hhStr = String(Math.floor(itemMins / 60)).padStart(2, "0");
            const mmStr = String(itemMins % 60).padStart(2, "0");
            candidates.push({
              category: "routine_item",
              localTime: `${hhStr}:${mmStr}`,
              minutesFromNow: itemMins - nowMins,
              activity: item.activity,
            });
          }
        }
      }
    } catch (err) {
      logger.warn({ err, userId }, "Diagnostics: failed to load today's routine for nextScheduled");
    }
  }

  candidates.sort((a, b) => a.minutesFromNow - b.minutesFromNow);
  const nextScheduled = candidates[0] ?? null;

  res.json({
    userId,
    timezone: prefs.timezone,
    localTime: localHHMM,
    inQuietHours,
    dailyCap: effectiveDailyCap(prefs),
    notificationIntensity: prefs.notificationIntensity,
    engagementScore: prefs.engagementScore,
    nextScheduled,
    tokens: tokens.map((t) => ({
      id: t.id,
      platform: t.platform,
      deviceName: t.deviceName,
      tokenPrefix: t.tokenPrefix.slice(0, 16),
      createdAt: t.createdAt,
      lastSeenAt: t.lastSeenAt,
    })),
    recent,
  });
});

const TEST_ONLY_PLATFORMS = ["ios", "ios-capacitor", "android", "web"] as const;

const TestSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES),
  /** Limit the test push to these stored token platforms (current device only). */
  onlyPlatforms: z.array(z.enum(TEST_ONLY_PLATFORMS)).min(1).max(4).optional(),
});

/**
 * POST /api/notifications/test
 */
router.post("/notifications/test", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = TestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const category: NotificationCategory = parsed.data.category;
  const dedupKey = `test:${userId}:${category}:${Date.now()}`;
  const onlyPlatforms = parsed.data.onlyPlatforms;
  const result = await dispatchNotification({
    userId,
    category,
    title: "AmyNest AI — test notification",
    body: "Your device is set up correctly and receiving notifications.",
    deepLink: "/notification-settings",
    data: { test: true },
    dedupKey,
    bypassDailyCap: true,
    bypassQuietHours: true,
    bypassCategoryCheck: true,
    ...(onlyPlatforms && onlyPlatforms.length > 0
      ? { restrictToPlatforms: onlyPlatforms }
      : {}),
  });
  logger.info({ userId, category, result }, "Test notification dispatched");
  res.json(result);
});

/**
 * POST /api/notifications/consent
 * Record explicit push consent (GDPR / COPPA / PIPEDA regions).
 */
router.post("/notifications/consent", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { CURRENT_CONSENT_VERSION } = await import("@workspace/notification-engine");
  const now = new Date();
  await getOrCreatePreferences(userId);
  await db
    .update(notificationPreferencesTable)
    .set({
      pushConsentAt: now,
      pushConsentVersion: CURRENT_CONSENT_VERSION,
      updatedAt: now,
    })
    .where(eq(notificationPreferencesTable.userId, userId));
  res.json({ ok: true, pushConsentAt: now.toISOString(), version: CURRENT_CONSENT_VERSION });
});

/**
 * POST /api/notifications/opened
 * Called by client when a push notification is tapped/opened.
 */
router.post("/notifications/opened", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { recordNotificationOpened } = await import("../services/notificationContentHistoryService.js");
    await recordNotificationOpened(userId);
  } catch (err) {
    logger.warn({ err, userId }, "Failed to record notification opened");
  }
  res.json({ ok: true });
});

/**
 * POST /api/notifications/dismissed
 * Called when user dismisses without opening (where platform supports it).
 */
router.post("/notifications/dismissed", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { recordNotificationDismissed } = await import("../services/notificationContentHistoryService.js");
    await recordNotificationDismissed(userId);
  } catch (err) {
    logger.warn({ err, userId }, "Failed to record notification dismissed");
  }
  res.json({ ok: true });
});

/**
 * GET /api/notifications/analytics
 * Engagement analytics for adaptive engine tuning.
 */
router.get("/notifications/analytics", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const prefs = await getOrCreatePreferences(userId);
  const { loadUserContentHistory } = await import("../services/notificationContentHistoryService.js");
  const { computeAnalytics, computeRegionalAnalytics } = await import("@workspace/notification-engine");
  const history = await loadUserContentHistory(userId, prefs.timezone);
  const windowDays = Math.min(Number(req.query["days"]) || 30, 90);
  const summary = computeAnalytics(history.entries, history.fatigue, windowDays);

  const logRows = await db
    .select()
    .from(notificationLogTable)
    .where(eq(notificationLogTable.userId, userId))
    .orderBy(desc(notificationLogTable.sentAt))
    .limit(200);

  const regionalEntries = logRows.map((r) => ({
    category: r.category,
    title: r.title,
    body: r.body,
    contentHash: r.contentHash,
    topicKey: r.topicKey,
    recommendationKey: r.recommendationKey,
    theme: r.theme,
    contentType: r.contentType,
    sentAt: r.sentAt,
    openedAt: r.openedAt,
    dismissedAt: r.dismissedAt,
    countryCode: r.countryCode,
    locale: r.locale,
    timezone: r.timezoneAtSend,
    culturalRegion: r.culturalRegion,
  }));

  const regional = computeRegionalAnalytics(regionalEntries, windowDays);

  const { computeDestinationMetrics } = await import("@workspace/action-routing");
  const { notificationOutcomeEventsTable } = await import("@workspace/db");
  const outcomeRows = await db
    .select({
      notificationLogId: notificationOutcomeEventsTable.notificationLogId,
      outcomeAt: notificationOutcomeEventsTable.outcomeAt,
    })
    .from(notificationOutcomeEventsTable)
    .where(eq(notificationOutcomeEventsTable.userId, userId))
    .limit(500);
  const outcomeByLog = new Map(outcomeRows.map((r) => [r.notificationLogId, r.outcomeAt]));

  const destinationMetrics = computeDestinationMetrics(
    logRows.map((r) => ({
      category: r.category,
      sentAt: r.sentAt,
      openedAt: r.openedAt,
      outcomeAt: outcomeByLog.get(r.id) ?? null,
    })),
  );

  res.json({ windowDays, ...summary, regional, destinationMetrics });
});

/**
 * POST /api/notifications/deep-link-event
 * Funnel analytics: notification_clicked → deep_link_opened → destination_loaded → action_completed
 */
router.post("/notifications/deep-link-event", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const event = String(req.body?.event ?? "");
  const valid = new Set([
    "notification_clicked",
    "deep_link_opened",
    "destination_loaded",
    "action_completed",
    "deep_link_fallback",
  ]);
  if (!valid.has(event)) {
    res.status(400).json({ error: "invalid_event" });
    return;
  }
  logger.info(
    {
      userId,
      event,
      actionTarget: req.body?.actionTarget,
      category: req.body?.category,
      path: req.body?.path,
      usedFallback: req.body?.usedFallback,
      source: req.body?.source,
    },
    "deep_link_event",
  );
  res.json({ ok: true });
});

/**
 * POST /api/notifications/outcome
 * Record a downstream business outcome for causal attribution.
 */
router.post("/notifications/outcome", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const outcomeEvent = String(req.body?.outcomeEvent ?? "");
  const notificationLogId = req.body?.notificationLogId
    ? Number(req.body.notificationLogId)
    : undefined;
  const validEvents = new Set([
    "routine_completed",
    "routine_started",
    "lesson_completed",
    "lesson_started",
    "subscription_started",
    "subscription_trial_started",
    "session_returned",
    "streak_restored",
    "campaign_step_completed",
    "challenge_completed",
  ]);
  if (!validEvents.has(outcomeEvent)) {
    res.status(400).json({ error: "invalid_outcome_event" });
    return;
  }
  try {
    const { recordNotificationOutcome } = await import(
      "../services/notificationOutcomeAttributionService.js"
    );
    const result = await recordNotificationOutcome(
      userId,
      outcomeEvent as import("@workspace/notification-engine").OutcomeEventType,
      { notificationLogId },
    );
    res.json(result);
  } catch (err) {
    logger.warn({ err, userId }, "Failed to record notification outcome");
    res.status(500).json({ error: "outcome_record_failed" });
  }
});

/**
 * GET /api/notifications/analytics/outcomes
 * Outcome-based analytics (routine/learning/retention/conversion uplift).
 */
router.get("/notifications/analytics/outcomes", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const windowDays = Math.min(Number(req.query["days"]) || 30, 90);
  const { computeOutcomeAnalytics } = await import("@workspace/notification-engine");
  const { notificationOutcomeEventsTable } = await import("@workspace/db");

  const logRows = await db
    .select()
    .from(notificationLogTable)
    .where(eq(notificationLogTable.userId, userId))
    .orderBy(desc(notificationLogTable.sentAt))
    .limit(500);

  const outcomeRows = await db
    .select()
    .from(notificationOutcomeEventsTable)
    .where(eq(notificationOutcomeEventsTable.userId, userId));

  const outcomeByLog = new Map(outcomeRows.map((o) => [o.notificationLogId, o]));

  const analyticsRows = logRows.map((r) => {
    const o = outcomeByLog.get(r.id);
    return {
      notificationLogId: r.id,
      category: r.category,
      goal: r.goal as import("@workspace/notification-engine").NotificationGoal | null,
      sentAt: r.sentAt,
      openedAt: r.openedAt,
      outcomeEvent: (o?.outcomeEvent ?? null) as import("@workspace/notification-engine").OutcomeEventType | null,
      outcomeAt: o?.outcomeAt ?? null,
    };
  });

  const summary = computeOutcomeAnalytics(analyticsRows, windowDays);
  res.json({ windowDays, ...summary });
});

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

/**
 * GET /api/notifications/analytics/executive
 * Admin executive dashboard — ROI by category and goal.
 */
router.get("/notifications/analytics/executive", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const windowDays = Math.min(Number(req.query["days"]) || 30, 90);
  const cutoff = new Date(Date.now() - windowDays * 86400000);

  const {
    computeOutcomeAnalytics,
    computeExecutiveDashboard,
    aggregateExperimentResults,
  } = await import("@workspace/notification-engine");
  const { notificationOutcomeEventsTable } = await import("@workspace/db");

  const logRows = await db
    .select()
    .from(notificationLogTable)
    .where(gte(notificationLogTable.sentAt, cutoff))
    .limit(5000);

  const outcomeRows = await db
    .select()
    .from(notificationOutcomeEventsTable)
    .where(gte(notificationOutcomeEventsTable.outcomeAt, cutoff));

  const outcomeByLog = new Map(outcomeRows.map((o) => [o.notificationLogId, o]));

  const analyticsRows = logRows.map((r) => {
    const o = outcomeByLog.get(r.id);
    return {
      notificationLogId: r.id,
      category: r.category,
      goal: r.goal as import("@workspace/notification-engine").NotificationGoal | null,
      sentAt: r.sentAt,
      openedAt: r.openedAt,
      outcomeEvent: (o?.outcomeEvent ?? null) as import("@workspace/notification-engine").OutcomeEventType | null,
      outcomeAt: o?.outcomeAt ?? null,
    };
  });

  const outcomeAnalytics = computeOutcomeAnalytics(analyticsRows, windowDays);
  const experiments = aggregateExperimentResults(
    logRows.map((r) => ({
      experimentId: r.experimentId,
      experimentVariant: r.experimentVariant,
      openedAt: r.openedAt,
      outcomeAt: outcomeByLog.get(r.id)?.outcomeAt ?? null,
    })),
  );
  const dashboard = computeExecutiveDashboard(outcomeAnalytics, experiments, windowDays);
  res.json(dashboard);
});

/**
 * POST /api/notifications/cron/ping
 * Optional Render Cron / external scheduler — runs per-task routine reminders.
 * Header: x-cron-secret: <NOTIFICATION_CRON_SECRET>
 */
router.post("/notifications/cron/ping", async (req, res): Promise<void> => {
  const expected = process.env["NOTIFICATION_CRON_SECRET"];
  const provided = req.headers["x-cron-secret"];
  if (!expected || provided !== expected) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { runNotificationCronPing } = await import("../lib/notificationCron.js");
    const result = await runNotificationCronPing();
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Notification cron ping failed");
    res.status(500).json({ error: "Cron ping failed" });
  }
});

export default router;
