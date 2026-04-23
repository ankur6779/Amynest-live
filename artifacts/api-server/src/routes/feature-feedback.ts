import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { z } from "zod";
import { db, featureFeedbackTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ALLOWED_FEATURES = new Set(["kids_control_center"]);
const ALLOWED_FEEDBACK = new Set(["interested", "not_interested"]);

const submitSchema = z.object({
  feature: z.string().min(1).max(64),
  feedback: z.enum(["interested", "not_interested"]),
  comment: z.string().max(1000).optional(),
});

/**
 * GET /api/feature-feedback?feature=kids_control_center
 * Returns the current user's existing feedback for a feature, if any.
 */
router.get("/feature-feedback", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const feature = String(req.query.feature ?? "");
  if (!ALLOWED_FEATURES.has(feature)) {
    res.status(400).json({ error: "invalid_feature" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(featureFeedbackTable)
      .where(and(eq(featureFeedbackTable.userId, userId), eq(featureFeedbackTable.feature, feature)))
      .limit(1);
    const row = rows[0];
    res.json({
      feedback: row?.feedback ?? null,
      comment: row?.comment ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    logger.error(`feature-feedback GET failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/feature-feedback
 * Body: { feature, feedback: "interested" | "not_interested", comment? }
 * Upserts on (userId, feature).
 */
router.post("/feature-feedback", async (req, res): Promise<void> => {
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
  const { feature, feedback, comment } = parsed.data;
  if (!ALLOWED_FEATURES.has(feature)) {
    res.status(400).json({ error: "invalid_feature" });
    return;
  }
  if (!ALLOWED_FEEDBACK.has(feedback)) {
    res.status(400).json({ error: "invalid_feedback" });
    return;
  }
  const trimmedComment = comment?.trim() ? comment.trim() : null;
  try {
    await db
      .insert(featureFeedbackTable)
      .values({ userId, feature, feedback, comment: trimmedComment })
      .onConflictDoUpdate({
        target: [featureFeedbackTable.userId, featureFeedbackTable.feature],
        set: { feedback, comment: trimmedComment, updatedAt: sql`now()` },
      });
    res.json({ ok: true, feedback, comment: trimmedComment });
  } catch (err) {
    logger.error(`feature-feedback POST failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
