/**
 * Admin analytics readouts — retention measurement + ingest data quality.
 * No dashboard UI; JSON only, gated to ADMIN_USER_IDS (same pattern as
 * infant-analytics-admin).
 */
import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { computeRetention } from "../services/retentionService";
import { getAnalyticsQuality } from "../services/analyticsIngestService";

const router: IRouter = Router();

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

/** GET /api/admin/analytics/retention?days=30 */
router.get("/admin/analytics/retention", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const days = Number(req.query["days"]) || 30;
  const report = await computeRetention(days);
  res.json({ ok: true, ...report });
});

/** GET /api/admin/analytics/quality — ingest data-quality snapshot. */
router.get("/admin/analytics/quality", (req, res): void => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  res.json({ ok: true, ...getAnalyticsQuality() });
});

export default router;
