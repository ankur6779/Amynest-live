/**
 * Admin analytics readouts — retention measurement + ingest data quality.
 * No dashboard UI; JSON only, gated to ADMIN_USER_IDS (same pattern as
 * infant-analytics-admin).
 */
import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/admin-auth.js";
import { computeRetention } from "../services/retentionService";
import { getAnalyticsQuality } from "../services/analyticsIngestService";

const router: IRouter = Router();

router.use(requireAdmin);

/** GET /api/admin/analytics/retention?days=30 */
router.get("/admin/analytics/retention", async (req, res): Promise<void> => {
  const days = Number(req.query["days"]) || 30;
  const report = await computeRetention(days);
  res.json({ ok: true, ...report });
});

/** GET /api/admin/analytics/quality — ingest data-quality snapshot. */
router.get("/admin/analytics/quality", (req, res): void => {
  res.json({ ok: true, ...getAnalyticsQuality() });
});

/** GET /api/admin/analytics/device-metrics?period=day|week */
router.get("/admin/analytics/device-metrics", async (req, res): Promise<void> => {
  const period = req.query["period"] === "week" ? "week" : "day";
  const { computeDeviceMetrics } = await import("../services/deviceMetricsService.js");
  const report = await computeDeviceMetrics(period);
  res.json({ ok: true, ...report });
});

/** GET /api/admin/analytics/device-strict-readiness */
router.get("/admin/analytics/device-strict-readiness", async (req, res): Promise<void> => {
  const { assessStrictReadiness } = await import("../services/deviceMetricsService.js");
  const snapshot = await assessStrictReadiness();
  res.json({ ok: true, ...snapshot });
});

export default router;
