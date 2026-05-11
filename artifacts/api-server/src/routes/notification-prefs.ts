import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import {
  childrenTable,
  db,
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
    // Schedule / limits
    timezone: prefs.timezone,
    quietHoursStart: prefs.quietHoursStart,
    quietHoursEnd: prefs.quietHoursEnd,
    dailyCap: effectiveDailyCap(prefs),
    notificationIntensity: prefs.notificationIntensity,
    engagementScore: prefs.engagementScore,
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

const TestSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES),
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
  });
  logger.info({ userId, category, result }, "Test notification dispatched");
  res.json(result);
});

/**
 * POST /api/notifications/opened
 * Called by client when a push notification is tapped/opened, to update
 * the engagement score for smarter adaptive frequency.
 */
router.post("/notifications/opened", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  // Best-effort score update — no strict schema needed
  const { opened = true } = (req.body ?? {}) as { opened?: boolean };
  try {
    const { updateEngagementScore } = await import("../services/notificationDispatchService.js");
    await updateEngagementScore(userId, opened);
  } catch (err) {
    logger.warn({ err, userId }, "Failed to update engagement score via route");
  }
  res.json({ ok: true });
});

export default router;
