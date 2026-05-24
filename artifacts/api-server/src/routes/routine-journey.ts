import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  getRoutineJourneyStatus,
  syncLegacyRoutineUsage,
} from "../services/routineJourneyService.js";

const router: IRouter = Router();

/**
 * GET /api/routine-journey/status
 * Returns routine 3-day journey access + completed generations.
 */
router.get("/routine-journey/status", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const status = await getRoutineJourneyStatus(userId);
    res.json(status);
  } catch (err) {
    logger.error(
      `routine-journey GET failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/routine-journey/sync-legacy
 * One-time migration from usage_daily lifetime counter.
 */
router.post("/routine-journey/sync-legacy", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const status = await syncLegacyRoutineUsage(userId);
    res.json({ ok: true, status });
  } catch (err) {
    logger.error(
      `routine-journey sync failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
