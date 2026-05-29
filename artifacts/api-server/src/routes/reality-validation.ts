import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import {
  getRealityDashboard,
  getAmyEvidenceAnswer,
  getStrategyProfile,
  recordInterventionDispatched,
  recordInterventionAction,
  getRealityValidationAnalytics,
} from "../services/realityValidationService.js";
import type { InterventionSurface } from "@workspace/reality-validation";

const router: IRouter = Router();

/** GET /api/reality-validation/dashboard — reality validation summary */
router.get("/reality-validation/dashboard", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    res.json(await getRealityDashboard(userId));
  } catch (err) {
    logger.error({ err, userId }, "Reality dashboard failed");
    res.status(500).json({ error: "reality_dashboard_failed" });
  }
});

/** GET /api/reality-validation/strategy-profile — family-specific learning */
router.get("/reality-validation/strategy-profile", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    res.json(await getStrategyProfile(userId));
  } catch (err) {
    logger.error({ err, userId }, "Strategy profile failed");
    res.status(500).json({ error: "strategy_profile_failed" });
  }
});

/** GET /api/reality-validation/analytics — recommendation chain analytics */
router.get("/reality-validation/analytics", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const windowDays = Math.min(Number(req.query.days) || 30, 90);
  try {
    res.json(await getRealityValidationAnalytics(userId, windowDays));
  } catch (err) {
    logger.error({ err, userId }, "Reality analytics failed");
    res.status(500).json({ error: "reality_analytics_failed" });
  }
});

/** POST /api/reality-validation/amy-evidence — Amy explains with evidence */
router.post("/reality-validation/amy-evidence", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const question = String(req.body?.question ?? "").trim();
  if (!question) { res.status(400).json({ error: "question_required" }); return; }
  try {
    res.json(await getAmyEvidenceAnswer(userId, question));
  } catch (err) {
    logger.error({ err, userId }, "Amy evidence failed");
    res.status(500).json({ error: "amy_evidence_failed" });
  }
});

/** POST /api/reality-validation/record — log recommendation dispatched */
router.post("/reality-validation/record", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const body = req.body ?? {};
  if (!body.recommendationKey || !body.recommendationTitle || !body.interventionType) {
    res.status(400).json({ error: "invalid_record" });
    return;
  }
  try {
    const entry = await recordInterventionDispatched(userId, {
      childId: body.childId ?? null,
      interventionId: body.interventionId ?? body.recommendationKey,
      interventionType: body.interventionType,
      surface: (body.surface ?? "parent_hub") as InterventionSurface,
      recommendationTitle: body.recommendationTitle,
      recommendationKey: body.recommendationKey,
      experimentId: body.experimentId ?? null,
      experimentVariant: body.experimentVariant ?? null,
    });
    res.json(entry);
  } catch (err) {
    logger.error({ err, userId }, "Record intervention failed");
    res.status(500).json({ error: "record_intervention_failed" });
  }
});

/** POST /api/reality-validation/action-by-key — user acted on latest recommendation */
router.post("/reality-validation/action-by-key", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const key = String(req.body?.recommendationKey ?? "").trim();
  if (!key) { res.status(400).json({ error: "key_required" }); return; }
  try {
    const { recordInterventionActionByKey } = await import("../services/realityValidationService.js");
    await recordInterventionActionByKey(userId, key);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, userId }, "Record action by key failed");
    res.status(500).json({ error: "record_action_failed" });
  }
});

/** POST /api/reality-validation/:ledgerId/action — user acted on recommendation */
router.post("/reality-validation/:ledgerId/action", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const entry = await recordInterventionAction(userId, req.params.ledgerId!);
    if (!entry) { res.status(404).json({ error: "not_found" }); return; }
    res.json(entry);
  } catch (err) {
    logger.error({ err, userId }, "Record action failed");
    res.status(500).json({ error: "record_action_failed" });
  }
});

export default router;
