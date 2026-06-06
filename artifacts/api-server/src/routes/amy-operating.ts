import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import { applyFeatureGate } from "../middlewares/featureGate.js";
import { userHasInfantChild } from "../lib/infant-child-access.js";
import {
  getAmyOperatingContext,
  getAmyDailyBriefing,
  getAmyWeeklyReview,
  getAmyExecutiveMode,
  getHubDashboard,
  askAmyOperatingLayer,
  recordAmyDecisionFeedback,
} from "../services/amyOperatingService.js";

const router: IRouter = Router();

/** GET /api/amy/operating-context — full Amy OS context */
router.get("/amy/operating-context", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    res.json(await getAmyOperatingContext(userId));
  } catch (err) {
    logger.error({ err, userId }, "Amy operating context failed");
    res.status(500).json({ error: "operating_context_failed" });
  }
});

/** GET /api/amy/daily-briefing */
router.get("/amy/daily-briefing", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    res.json(await getAmyDailyBriefing(userId));
  } catch (err) {
    logger.error({ err, userId }, "Amy daily briefing failed");
    res.status(500).json({ error: "briefing_failed" });
  }
});

/** GET /api/amy/weekly-review */
router.get("/amy/weekly-review", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    res.json(await getAmyWeeklyReview(userId));
  } catch (err) {
    logger.error({ err, userId }, "Amy weekly review failed");
    res.status(500).json({ error: "weekly_review_failed" });
  }
});

/** GET /api/amy/executive-mode — narrated executive dashboard */
router.get("/amy/executive-mode", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    res.json(await getAmyExecutiveMode(userId));
  } catch (err) {
    logger.error({ err, userId }, "Amy executive mode failed");
    res.status(500).json({ error: "executive_mode_failed" });
  }
});

/** GET /api/amy/hub-dashboard — Parent Hub executive control center (single payload) */
router.get("/amy/hub-dashboard", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    res.json(await getHubDashboard(userId));
  } catch (err) {
    logger.error({ err, userId }, "Amy hub dashboard failed");
    res.status(500).json({ error: "hub_dashboard_failed" });
  }
});

/** POST /api/amy/ask — natural language command center */
router.post("/amy/ask", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const question = String(req.body?.question ?? "").trim();
  if (!question) { res.status(400).json({ error: "question_required" }); return; }

  const infantPremiumOn =
    process.env.INFANT_PREMIUM_ENABLED !== "0" &&
    process.env.INFANT_PREMIUM_ENABLED !== "false";
  if (infantPremiumOn && (await userHasInfantChild(userId))) {
    let allowed = false;
    await applyFeatureGate(req, res, "infant_ai_query", () => {
      allowed = true;
    });
    if (!allowed) return;
  }

  try {
    res.json(await askAmyOperatingLayer(userId, question));
  } catch (err) {
    logger.error({ err, userId }, "Amy ask failed");
    res.status(500).json({ error: "ask_failed" });
  }
});

/** POST /api/amy/decision-feedback */
router.post("/amy/decision-feedback", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { recommendationId, recommendationTitle, userResponse, outcomeAchieved } = req.body ?? {};
  if (!recommendationId || !recommendationTitle || !userResponse) {
    res.status(400).json({ error: "invalid_feedback" });
    return;
  }
  try {
    await recordAmyDecisionFeedback(userId, {
      recommendationId: String(recommendationId),
      recommendationTitle: String(recommendationTitle),
      userResponse,
      outcomeAchieved: outcomeAchieved === true,
    });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, userId }, "Amy decision feedback failed");
    res.status(500).json({ error: "feedback_failed" });
  }
});

/** GET /api/amy/proactive — proactive messages Amy should surface */
router.get("/amy/proactive", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const ctx = await getAmyOperatingContext(userId);
    res.json({ messages: ctx.proactiveMessages, activePlaybook: ctx.activePlaybook });
  } catch (err) {
    logger.error({ err, userId }, "Amy proactive failed");
    res.status(500).json({ error: "proactive_failed" });
  }
});

export default router;
