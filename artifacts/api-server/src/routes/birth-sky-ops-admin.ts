/**
 * Admin ops dashboard for Amy Astro Intelligence production readiness.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "../lib/auth.js";
import { getBirthSkyOpsDashboard } from "../services/birth-sky/runtime-bridge.js";
import { getBirthSkyRouterDashboard } from "../services/birth-sky/ai-router-telemetry.js";

const adminRouter: IRouter = Router();

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

adminRouter.get("/admin/birth-sky/ops", (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const ops = getBirthSkyOpsDashboard();
  const router = getBirthSkyRouterDashboard();
  res.json({
    ...ops,
    routerTelemetry: router,
  });
});

export default adminRouter;
