import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { z } from "zod";
import { db, userFeedbackTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
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

export default router;
