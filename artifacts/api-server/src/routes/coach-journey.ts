import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  getCoachJourneyStatus,
  recordCoachPlanCompleted,
  syncLegacyCoachUsage,
} from "../services/coachJourneyService.js";
import { infantCoachPreviewGate } from "../middlewares/infantCoachPreviewGate.js";

const router: IRouter = Router();

/**
 * GET /api/coach-journey/status
 * Returns Amy Coach free-sample access + completed topics.
 */
router.get("/coach-journey/status", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const status = await getCoachJourneyStatus(userId);
    res.json(status);
  } catch (err) {
    logger.error(
      `coach-journey GET failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

const CompleteBody = z.object({
  goalId: z.string().min(1),
  sessionId: z.string().min(1),
  childId: z.number().int().positive().optional(),
});

/**
 * POST /api/coach-journey/complete-plan
 * Records a successfully generated plan and advances the free journey day.
 */
router.post("/coach-journey/complete-plan", infantCoachPreviewGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = CompleteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const status = await recordCoachPlanCompleted(
      userId,
      parsed.data.goalId,
      parsed.data.sessionId,
    );
    res.json({ ok: true, status });
  } catch (err) {
    logger.error(
      `coach-journey complete failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

const LegacySyncBody = z.object({
  blockUsedIds: z.array(z.string()).default([]),
  childId: z.number().int().positive().optional(),
});

/**
 * POST /api/coach-journey/sync-legacy
 * One-time migration from client localStorage section usage.
 */
router.post("/coach-journey/sync-legacy", infantCoachPreviewGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = LegacySyncBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const status = await syncLegacyCoachUsage(userId, parsed.data.blockUsedIds);
    res.json({ ok: true, status });
  } catch (err) {
    logger.error(
      `coach-journey sync failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
