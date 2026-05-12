import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { z } from "zod";
import { db, userFeedbackTable } from "@workspace/db";
import { desc, eq, sql, and, arrayContains } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const AUTO_TAG_RULES: [RegExp, string][] = [
  [/bug|crash|broken|error|not working|doesn'?t work|fix/i, "bug"],
  [/feature|add|would like|wish|want|should have/i, "feature_request"],
  [/urgent|asap|critical|immediately|please/i, "urgent"],
  [/design|ui|ux|look|color|colour|layout|button|font|icon/i, "ui_issue"],
  [/ai|amy|assistant|smart|generate|gpt|intelligence/i, "ai_issue"],
];

function autoTag(message: string, categories: string[]): string[] {
  const tags = new Set<string>();
  if (categories.includes("bug_report")) tags.add("bug");
  if (categories.includes("feature_request")) tags.add("feature_request");
  if (categories.includes("ai_feedback")) tags.add("ai_issue");
  if (categories.includes("ui_feedback")) tags.add("ui_issue");
  for (const [pattern, tag] of AUTO_TAG_RULES) {
    if (pattern.test(message)) tags.add(tag);
  }
  return Array.from(tags);
}

const submitSchema = z.object({
  categories: z.array(z.string().max(64)).min(1).max(5),
  message: z.string().min(10).max(5000),
  rating: z.number().int().min(1).max(4).optional(),
  screenshotUrl: z.string().max(600_000).optional(),
  platform: z.string().max(32).optional(),
  appVersion: z.string().max(32).optional(),
  deviceType: z.string().max(64).optional(),
  country: z.string().max(8).optional(),
});

/**
 * POST /api/user-feedback
 * Submit app feedback with optional screenshot, rating, and category chips.
 */
router.post("/user-feedback", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { categories, message, rating, screenshotUrl, platform, appVersion, deviceType, country } = parsed.data;
  const autoTags = autoTag(message, categories);
  try {
    const [row] = await db
      .insert(userFeedbackTable)
      .values({
        userId,
        categories,
        message: message.trim(),
        rating: rating ?? null,
        screenshotUrl: screenshotUrl ?? null,
        platform: platform ?? "web",
        appVersion: appVersion ?? null,
        deviceType: deviceType ?? null,
        country: country ?? null,
        autoTags,
      })
      .returning({ id: userFeedbackTable.id });
    req.log.info({ feedbackId: row?.id, categories, rating, autoTags }, "user-feedback submitted");
    res.status(201).json({ ok: true, id: row?.id });
  } catch (err) {
    logger.error(`user-feedback POST failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * GET /api/user-feedback?limit=50&offset=0
 * Returns the current user's own submitted feedback (for "my history" views).
 */
router.get("/user-feedback", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const offset = Number(req.query.offset ?? 0);
  try {
    const rows = await db
      .select({
        id: userFeedbackTable.id,
        categories: userFeedbackTable.categories,
        message: userFeedbackTable.message,
        rating: userFeedbackTable.rating,
        autoTags: userFeedbackTable.autoTags,
        platform: userFeedbackTable.platform,
        createdAt: userFeedbackTable.createdAt,
      })
      .from(userFeedbackTable)
      .where(eq(userFeedbackTable.userId, userId))
      .orderBy(desc(userFeedbackTable.createdAt))
      .limit(limit)
      .offset(offset);
    res.json({ items: rows, limit, offset });
  } catch (err) {
    logger.error(`user-feedback GET failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

// ── Admin helpers ─────────────────────────────────────────────────────────────

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

/**
 * GET /api/admin/feedback
 * Admin-only: returns ALL feedback with filters, pagination, and summary stats.
 * Query params: limit, offset, category, rating, tag
 */
router.get("/admin/feedback", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const offset = Number(req.query.offset ?? 0);
  const filterCategory = req.query.category ? String(req.query.category) : null;
  const filterRating   = req.query.rating   ? Number(req.query.rating)   : null;
  const filterTag      = req.query.tag      ? String(req.query.tag)      : null;

  try {
    // Build where conditions
    const conditions = [];
    if (filterCategory) conditions.push(arrayContains(userFeedbackTable.categories, [filterCategory]));
    if (filterRating)   conditions.push(eq(userFeedbackTable.rating, filterRating));
    if (filterTag)      conditions.push(arrayContains(userFeedbackTable.autoTags, [filterTag]));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [totals]] = await Promise.all([
      db
        .select({
          id:           userFeedbackTable.id,
          userId:       userFeedbackTable.userId,
          categories:   userFeedbackTable.categories,
          message:      userFeedbackTable.message,
          rating:       userFeedbackTable.rating,
          screenshotUrl: userFeedbackTable.screenshotUrl,
          autoTags:     userFeedbackTable.autoTags,
          platform:     userFeedbackTable.platform,
          appVersion:   userFeedbackTable.appVersion,
          deviceType:   userFeedbackTable.deviceType,
          country:      userFeedbackTable.country,
          createdAt:    userFeedbackTable.createdAt,
        })
        .from(userFeedbackTable)
        .where(where)
        .orderBy(desc(userFeedbackTable.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({
          total:     sql<number>`count(*)::int`,
          avgRating: sql<number>`round(avg(${userFeedbackTable.rating})::numeric, 1)`,
          withScreenshot: sql<number>`count(*) filter (where ${userFeedbackTable.screenshotUrl} is not null)::int`,
        })
        .from(userFeedbackTable)
        .where(where),
    ]);

    res.json({
      items,
      total: totals?.total ?? 0,
      avgRating: totals?.avgRating ?? null,
      withScreenshot: totals?.withScreenshot ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    logger.error(`admin/feedback GET failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
