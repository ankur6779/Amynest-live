import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { startupFunnelBatchBodySchema } from "@workspace/analytics-taxonomy";
import { requireAdmin } from "../lib/admin-auth.js";
import {
  getStartupFunnelDashboardStats,
  ingestStartupFunnelEvents,
} from "../services/startup-funnel-service.js";
import { PUBLIC_BEACON_RATE, rejectIfIpRateLimited } from "../lib/endpoint-rate-limit.js";

const publicRouter: IRouter = Router();
const adminRouter: IRouter = Router();

/** Public — pre-auth startup funnel ingest (mount before requireAuth). */
publicRouter.post("/startup-funnel-events", async (req: Request, res: Response) => {
  if (await rejectIfIpRateLimited(req, res, "startup-funnel-events", PUBLIC_BEACON_RATE)) {
    return;
  }

  const parsed = startupFunnelBatchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const summary = await ingestStartupFunnelEvents(parsed.data.events);
  res.status(202).json(summary);
});

adminRouter.use(requireAdmin);

adminRouter.get("/admin/startup-funnel-dashboard", async (req: Request, res: Response) => {
  const daysRaw = req.query.days;
  const daysParsed = z.coerce.number().int().min(1).max(90).safeParse(daysRaw);
  const days = daysParsed.success ? daysParsed.data : 7;

  const stats = await getStartupFunnelDashboardStats(days);
  res.json(stats);
});

export { publicRouter as startupFunnelPublicRouter, adminRouter as startupFunnelAdminRouter };
