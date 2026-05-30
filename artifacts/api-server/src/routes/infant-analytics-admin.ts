/**
 * Admin infant parenting product analytics dashboard.
 */
import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { computeInfantParentingDashboard } from "../services/infantParentingDashboardService";

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
 * GET /api/admin/infant-parenting-analytics?days=30
 */
router.get("/admin/infant-parenting-analytics", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const days = Math.min(Math.max(Number(req.query["days"]) || 30, 7), 90);
  const dashboard = await computeInfantParentingDashboard(days);
  res.json({ ok: true, ...dashboard });
});

export default router;
