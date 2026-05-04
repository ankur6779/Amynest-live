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
  type NotificationCategory,
} from "@workspace/db";
import {
  dispatchNotification,
  getNotificationHistory,
  getOrCreatePreferences,
} from "../services/notificationDispatchService";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * GET /api/notifications/categories
 * Returns the user's per-category toggles, timezone, quiet hours, daily cap.
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
    routineEnabled: prefs.routineEnabled,
    routineItemEnabled: prefs.routineItemEnabled,
    nutritionEnabled: prefs.nutritionEnabled,
    insightsEnabled: prefs.insightsEnabled,
    weeklyEnabled: prefs.weeklyEnabled,
    engagementEnabled: prefs.engagementEnabled,
    goodNightEnabled: prefs.goodNightEnabled,
    timezone: prefs.timezone,
    quietHoursStart: prefs.quietHoursStart,
    quietHoursEnd: prefs.quietHoursEnd,
    dailyCap: prefs.dailyCap,
  });
});

// HH:MM 24h, validates each component. "00:00"–"23:59".
const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// Validate IANA timezone via Intl. Throws for unknown IDs in modern Node.
function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const PatchSchema = z.object({
  routineEnabled: z.boolean().optional(),
  routineItemEnabled: z.boolean().optional(),
  nutritionEnabled: z.boolean().optional(),
  insightsEnabled: z.boolean().optional(),
  weeklyEnabled: z.boolean().optional(),
  engagementEnabled: z.boolean().optional(),
  goodNightEnabled: z.boolean().optional(),
  timezone: z
    .string()
    .min(1)
    .max(64)
    .refine(isValidTimezone, { message: "Invalid IANA timezone" })
    .optional(),
  quietHoursStart: z.string().regex(HHMM_REGEX).optional(),
  quietHoursEnd: z.string().regex(HHMM_REGEX).optional(),
  dailyCap: z.number().int().min(1).max(20).optional(),
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
  await db
    .update(notificationPreferencesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(notificationPreferencesTable.userId, userId));
  const updated = await getOrCreatePreferences(userId);
  res.json(updated);
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
 * Read-only health check for the calling user. Surfaces:
 *   - registered push tokens (platform / lastSeen)
 *   - last 10 delivery attempts with status + error
 *   - whether the user is currently in quiet hours
 *   - daily cap status
 * Used by the in-app "Why didn't I get my notifications?" screen and by
 * support tooling.
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

  // In quiet hours? Mirror the dispatch service logic so the diagnostic
  // matches what real sends would see.
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

  // ── Next scheduled notification ──────────────────────────────────────────
  // For per-task reminders we look at today's routine for this user and
  // surface the next non-completed item whose reminder time (item time minus
  // 5 minutes) is still in the future. For the fixed daily category crons
  // we compute the next firing of any *enabled* category, in user-local
  // time. Whichever lands first is the "next" scheduled push.
  const fixedCategorySchedule: Array<{ category: NotificationCategory; hhmm: string; enabled: boolean }> = [
    { category: "routine",    hhmm: "07:30", enabled: prefs.routineEnabled    },
    { category: "insights",   hhmm: "12:30", enabled: prefs.insightsEnabled   },
    { category: "nutrition",  hhmm: "15:30", enabled: prefs.nutritionEnabled  },
    { category: "nutrition",  hhmm: "18:30", enabled: prefs.nutritionEnabled  },
    { category: "engagement", hhmm: "19:00", enabled: prefs.engagementEnabled },
    { category: "good_night", hhmm: "21:00", enabled: prefs.goodNightEnabled  },
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

  // Fixed daily category crons (only enabled ones, only future-today).
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

  // Per-task routine reminders (only when enabled and we have a routine for today).
  if (prefs.routineItemEnabled) {
    try {
      const rows = await db
        .select({ routine: routinesTable })
        .from(routinesTable)
        .innerJoin(childrenTable, eq(childrenTable.id, routinesTable.childId))
        .where(and(eq(childrenTable.userId, userId), eq(routinesTable.date, localDate)));
      for (const { routine } of rows) {
        // Per-routine opt-in mirrors the cron filter: if the user hasn't
        // flipped on the per-task reminder toggle for this routine, the cron
        // won't push for it, so the diagnostics screen shouldn't claim a
        // "next scheduled" item for it either.
        const uiPrefs = routine.uiPrefs as { pushReminders?: unknown } | null;
        if (!uiPrefs || uiPrefs.pushReminders !== true) continue;
        const items = (routine.items ?? []) as Array<{ time?: string; activity?: string; status?: string }>;
        for (const item of items) {
          if (!item.time || !item.activity) continue;
          if (item.status === "completed" || item.status === "skipped") continue;
          // Inline 12-hour parser to avoid coupling routes to the cron module.
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
    dailyCap: prefs.dailyCap,
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
 * Body: { category: NotificationCategory }
 * Sends a self-service delivery test to every registered device for the
 * current user. Bypasses quiet hours, daily cap, and category-enabled gate so
 * that parents can always confirm their device is set up correctly regardless
 * of time or preferences. Uses a hardcoded title/body so it never fails due to
 * missing personalized content.
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
  // Include Date.now() so the same user can fire it multiple times in a row
  // without hitting the dedup window.
  const dedupKey = `test:${userId}:${category}:${Date.now()}`;
  const result = await dispatchNotification({
    userId,
    category,
    title: "KidSchedule — test notification",
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

export default router;
