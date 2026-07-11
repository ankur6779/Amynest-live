import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { startupFunnelBatchBodySchema } from "@workspace/analytics-taxonomy";
import { getAuth } from "../lib/auth.js";
import {
  getStartupFunnelDashboardStats,
  ingestStartupFunnelEvents,
} from "../services/startup-funnel-service.js";

const publicRouter: IRouter = Router();
const adminRouter: IRouter = Router();

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

/** Public — pre-auth startup funnel ingest (mount before requireAuth). */
publicRouter.post("/startup-funnel-events", async (req: Request, res: Response) => {
  const parsed = startupFunnelBatchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const summary = await ingestStartupFunnelEvents(parsed.data.events);
  res.status(202).json(summary);
});

adminRouter.get("/admin/startup-funnel-dashboard", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const daysRaw = req.query.days;
  const daysParsed = z.coerce.number().int().min(1).max(90).safeParse(daysRaw);
  const days = daysParsed.success ? daysParsed.data : 7;

  const stats = await getStartupFunnelDashboardStats(days);
  res.json(stats);
});

export { publicRouter as startupFunnelPublicRouter, adminRouter as startupFunnelAdminRouter };
