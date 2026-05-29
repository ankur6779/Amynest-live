import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import {
  createUserIntent,
  transitionUserIntent,
  interruptActiveIntent,
  getContinueJourney,
  getIntentAnalytics,
} from "../services/intentRecoveryService.js";
import type { IntentState } from "@workspace/intent-recovery";

const router: IRouter = Router();

/** GET /api/intent-recovery/continue-journey — top unfinished task + Amy line */
router.get("/intent-recovery/continue-journey", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    res.json(await getContinueJourney(userId));
  } catch (err) {
    logger.error({ err, userId }, "Continue journey failed");
    res.status(500).json({ error: "continue_journey_failed" });
  }
});

/** GET /api/intent-recovery/analytics — intent ROI by type */
router.get("/intent-recovery/analytics", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const windowDays = Math.min(Number(req.query.days) || 30, 90);
  try {
    res.json(await getIntentAnalytics(userId, windowDays));
  } catch (err) {
    logger.error({ err, userId }, "Intent analytics failed");
    res.status(500).json({ error: "intent_analytics_failed" });
  }
});

/** POST /api/intent-recovery — create or refresh an intent */
router.post("/intent-recovery", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const body = req.body ?? {};
  if (!body.intentType || !body.title || !body.href || !body.actionTarget) {
    res.status(400).json({ error: "invalid_intent" });
    return;
  }
  try {
    const intent = await createUserIntent({
      userId,
      childId: body.childId ?? null,
      intentType: body.intentType,
      intentSource: body.intentSource ?? "deep_link",
      intentPriority: body.intentPriority,
      title: body.title,
      subtitle: body.subtitle,
      amyContinuationLine: body.amyContinuationLine,
      actionTarget: body.actionTarget,
      entityId: body.entityId,
      href: body.href,
      progressPct: body.progressPct,
      progressJson: body.progressJson,
      deviceId: body.deviceId,
      ttlHours: body.ttlHours,
    });
    res.json(intent);
  } catch (err) {
    logger.error({ err, userId }, "Create intent failed");
    res.status(500).json({ error: "create_intent_failed" });
  }
});

/** POST /api/intent-recovery/:intentId/transition — state machine */
router.post("/intent-recovery/:intentId/transition", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const toState = String(req.body?.state ?? "") as IntentState;
  const valid: IntentState[] = ["pending", "started", "in_progress", "completed", "abandoned", "expired"];
  if (!valid.includes(toState)) {
    res.status(400).json({ error: "invalid_state" });
    return;
  }
  try {
    const intent = await transitionUserIntent(userId, req.params.intentId!, toState);
    if (!intent) { res.status(404).json({ error: "not_found" }); return; }
    res.json(intent);
  } catch (err) {
    logger.error({ err, userId }, "Intent transition failed");
    res.status(400).json({ error: "transition_failed" });
  }
});

/** POST /api/intent-recovery/:intentId/interrupt — persist on background/close */
router.post("/intent-recovery/:intentId/interrupt", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const intent = await interruptActiveIntent(userId, req.params.intentId!);
    if (!intent) { res.status(404).json({ error: "not_found" }); return; }
    res.json(intent);
  } catch (err) {
    logger.error({ err, userId }, "Intent interrupt failed");
    res.status(500).json({ error: "interrupt_failed" });
  }
});

export default router;
