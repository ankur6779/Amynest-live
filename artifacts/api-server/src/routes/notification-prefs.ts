import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import {
  db,
  notificationPreferencesTable,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@workspace/db";
import {
  dispatchNotification,
  getNotificationHistory,
  getOrCreatePreferences,
} from "../services/notificationDispatchService";
import { contentBuilders } from "../services/notificationContentBuilder";
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

const TestSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES),
});

/**
 * POST /api/notifications/test
 * Body: { category: NotificationCategory }
 * Sends the personalized notification for that category to the current user
 * immediately, bypassing nothing else (still respects quiet hours / cap /
 * dedup so it behaves like a real send). Useful for the in-app "Send test"
 * button on the settings screen.
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
  const prefs = await getOrCreatePreferences(userId);
  const builder = contentBuilders[category];
  const built = await builder(userId, prefs.timezone);
  if (!built) {
    res.status(400).json({ error: "No content available for this category yet" });
    return;
  }
  // For test sends we append a salt to the dedupKey so users can fire it
  // multiple times in a row to verify the integration.
  const dedupKey = `${built.dedupKey}:test:${Date.now()}`;
  const result = await dispatchNotification({
    userId,
    category,
    title: built.title,
    body: built.body,
    deepLink: built.deepLink,
    data: { ...built.data, test: true },
    dedupKey,
  });
  logger.info({ userId, category, result }, "Test notification dispatched");
  res.json(result);
});

export default router;
