import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  getJourneyStatus,
  tryCompleteJourneyTask,
  type JourneyTaskId,
} from "../services/journeyService";

const router: IRouter = Router();

const TASK_IDS = [
  "routine_generate",
  "routine_task_complete",
  "hub_explore",
  "behavior_log",
  "child_activity",
  "amy_coach",
  "weekly_review",
] as const satisfies readonly JourneyTaskId[];

/**
 * GET /api/journey/status
 * Returns the user's 7-day activation journey progress.
 * Creates the journey row lazily when the user has at least one child.
 */
router.get("/journey/status", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const status = await getJourneyStatus(userId);
    if (!status) {
      res.json({ active: false, reason: "no_child" });
      return;
    }
    res.json(status);
  } catch (err) {
    logger.error(
      `journey GET failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

const completeSchema = z.object({
  taskId: z.enum(TASK_IDS),
});

/**
 * POST /api/journey/complete-task  { taskId }
 * Client-side fallback to mark a task (server hooks are preferred).
 */
router.post("/journey/complete-task", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const result = await tryCompleteJourneyTask(userId, parsed.data.taskId);
    const status = await getJourneyStatus(userId);
    res.json({ ok: true, ...result, status });
  } catch (err) {
    logger.error(
      `journey POST failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
