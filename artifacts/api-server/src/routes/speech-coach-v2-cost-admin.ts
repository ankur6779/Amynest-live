/**
 * Admin Speech Coach V2 Realtime cost analytics.
 */
import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { asyncRoute } from "../middlewares/async-route.js";
import { computeSpeechCoachV2CostAnalytics } from "../services/speechCoachV2CostService.js";

const router: IRouter = Router();

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

/**
 * GET /api/admin/speech-coach-v2/cost-analytics?days=30
 */
router.get(
  "/admin/speech-coach-v2/cost-analytics",
  asyncRoute(async (req, res) => {
    const { userId } = getAuth(req);
    if (!isAdminUser(userId)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const days = Math.min(Math.max(Number(req.query["days"]) || 30, 7), 90);
    const dashboard = await computeSpeechCoachV2CostAnalytics(days);
    res.json({ ok: true, ...dashboard });
  }),
);

export default router;
