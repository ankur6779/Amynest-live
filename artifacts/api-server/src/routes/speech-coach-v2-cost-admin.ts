/**
 * Admin Speech Coach V2 Realtime cost analytics.
 */
import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/admin-auth.js";
import { asyncRoute } from "../middlewares/async-route.js";
import { computeSpeechCoachV2CostAnalytics } from "../services/speechCoachV2CostService.js";

const router: IRouter = Router();

router.use(requireAdmin);

/**
 * GET /api/admin/speech-coach-v2/cost-analytics?days=30
 */
router.get(
  "/admin/speech-coach-v2/cost-analytics",
  asyncRoute(async (req, res) => {
    const days = Math.min(Math.max(Number(req.query["days"]) || 30, 7), 90);
    const dashboard = await computeSpeechCoachV2CostAnalytics(days);
    res.json({ ok: true, ...dashboard });
  }),
);

export default router;
