import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  completeHubJourneyPath,
  getHubJourneyStatus,
  useHubJourneyPeekAhead,
} from "../services/parentHubJourneyService.js";
import { infantExploreMutationGate } from "../middlewares/infantExploreMutationGate.js";

const router: IRouter = Router();

const ChildQuery = z.object({
  childId: z.coerce.number().int().positive(),
});

/**
 * GET /api/hub-journey/status?childId=
 * Returns journey access, Today's Path steps, progress snapshot, peek-ahead.
 */
router.get("/hub-journey/status", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = ChildQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }
  try {
    const status = await getHubJourneyStatus(userId, parsed.data.childId);
    if (!status) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    res.json(status);
  } catch (err) {
    logger.error(
      `hub-journey GET failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

const CompleteBody = z.object({
  childId: z.number().int().positive(),
  stepIds: z.array(z.string().min(1)).min(1),
});

/**
 * POST /api/hub-journey/complete-path
 * Marks the current journey day's Today's Path as complete.
 */
router.post("/hub-journey/complete-path", infantExploreMutationGate(), async (req, res): Promise<void> => {
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
    const result = await completeHubJourneyPath(
      userId,
      parsed.data.childId,
      parsed.data.stepIds,
    );
    if (!result.ok) {
      res.status(400).json({ error: "incomplete_path" });
      return;
    }
    const status = await getHubJourneyStatus(userId, parsed.data.childId);
    res.json({ ...result, status });
  } catch (err) {
    logger.error(
      `hub-journey complete failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

const PeekBody = z.object({
  childId: z.number().int().positive(),
});

/**
 * POST /api/hub-journey/peek-ahead
 * Unlocks a one-time preview of tomorrow's content for the current journey day.
 */
router.post("/hub-journey/peek-ahead", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = PeekBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  try {
    const result = await useHubJourneyPeekAhead(userId, parsed.data.childId);
    if (!result.ok) {
      res.status(400).json({ error: "peek_unavailable" });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error(
      `hub-journey peek failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
