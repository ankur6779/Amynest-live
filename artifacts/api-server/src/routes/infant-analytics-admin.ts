/**
 * Admin infant parenting product analytics dashboard.
 */
import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/admin-auth.js";
import { computeInfantParentingDashboard } from "../services/infantParentingDashboardService";

const router: IRouter = Router();

router.use(requireAdmin);

/**
 * GET /api/admin/infant-parenting-analytics?days=30
 */
router.get("/admin/infant-parenting-analytics", async (req, res): Promise<void> => {
  const days = Math.min(Math.max(Number(req.query["days"]) || 30, 7), 90);
  const dashboard = await computeInfantParentingDashboard(days);
  res.json({ ok: true, ...dashboard });
});

export default router;
