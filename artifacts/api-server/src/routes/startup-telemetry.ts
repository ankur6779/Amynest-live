import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { getAuth } from "../lib/auth.js";
import {
  ingestStartupEvent,
  getStartupTelemetryStats,
} from "../services/startup-telemetry-store.js";

const publicRouter: IRouter = Router();
const adminRouter: IRouter = Router();

const StartupEventBody = z.object({
  event: z.enum([
    "startup_phase_entered",
    "startup_phase_completed",
    "startup_timeout",
    "startup_deadlock_detected",
    "startup_recovery_used",
    "boot_timeout",
  ]),
  phase: z.string().max(64).optional(),
  app_version: z.string().max(128),
  previous_version: z.string().max(128).optional(),
  platform: z.string().max(32),
  browser: z.string().max(32),
  route: z.string().max(256),
  react_rendered: z.boolean().optional(),
  app_core_ready: z.boolean().optional(),
  ts: z.number().optional(),
  href: z.string().max(512).optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

/** Public — pre-auth startup beacon (mount before requireAuth). */
publicRouter.post("/startup-events", (req: Request, res: Response) => {
  const parsed = StartupEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  ingestStartupEvent({
    ts: data.ts ?? Date.now(),
    event: data.event,
    phase: data.phase,
    app_version: data.app_version,
    previous_version: data.previous_version,
    platform: data.platform,
    browser: data.browser,
    route: data.route,
    react_rendered: data.react_rendered,
    app_core_ready: data.app_core_ready,
    meta: {
      ...data.meta,
      href: data.href,
    },
  });

  res.status(204).end();
});

adminRouter.get("/admin/startup-stats", (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  res.json(getStartupTelemetryStats());
});

export { publicRouter as startupTelemetryPublicRouter, adminRouter as startupTelemetryAdminRouter };
