/**
 * Admin ops dashboard for Amy Astro Intelligence production readiness.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { requireAdmin } from "../lib/admin-auth.js";
import { getBirthSkyOpsDashboard } from "../services/birth-sky/runtime-bridge.js";
import { getBirthSkyRouterDashboard } from "../services/birth-sky/ai-router-telemetry.js";

const adminRouter: IRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get("/admin/birth-sky/ops", (req: Request, res: Response) => {
  const ops = getBirthSkyOpsDashboard();
  const router = getBirthSkyRouterDashboard();
  res.json({
    ...ops,
    routerTelemetry: router,
  });
});

export default adminRouter;
