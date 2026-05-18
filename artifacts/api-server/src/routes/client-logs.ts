import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ClientLogBody = z.object({
  type: z.enum(["crash", "slow_api", "failed_routine", "warning", "info"]),
  message: z.string().min(1).max(4000),
  context: z.string().max(256).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  durationMs: z.number().optional(),
  route: z.string().max(256).optional(),
});

const MAX_BUFFER = 200;
const recentLogs: Array<{
  ts: number;
  userId: string | null;
  type: string;
  message: string;
}> = [];

async function ingestClientLog(req: Request, res: Response): Promise<void> {
  const parsed = ClientLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = getAuth(req);
  const meta =
    parsed.data.meta && typeof parsed.data.meta === "object"
      ? JSON.parse(JSON.stringify(parsed.data.meta).slice(0, 4000))
      : undefined;

  const entry = {
    ts: Date.now(),
    userId: userId ?? null,
    type: parsed.data.type,
    message: parsed.data.message.slice(0, 4000),
    context: parsed.data.context?.slice(0, 256),
    route: parsed.data.route?.slice(0, 256),
    durationMs: parsed.data.durationMs,
    meta,
  };

  recentLogs.push({
    ts: entry.ts,
    userId: entry.userId,
    type: entry.type,
    message: entry.message,
  });
  if (recentLogs.length > MAX_BUFFER) recentLogs.shift();

  const logFn =
    parsed.data.type === "crash" || parsed.data.type === "failed_routine"
      ? logger.error.bind(logger)
      : parsed.data.type === "slow_api" || parsed.data.type === "warning"
        ? logger.warn.bind(logger)
        : logger.info.bind(logger);

  logFn({ kind: "client_log", ...entry }, `[client:${parsed.data.type}] ${parsed.data.message}`);

  res.status(204).end();
}

router.post("/logs", ingestClientLog);
/** Alias for web error boundary / onboarding crash reports. */
router.post("/log-client-error", ingestClientLog);

/** Ops/debug: last N client logs (auth required — mounted after requireAuth). */
router.get("/logs/recent", (_req, res) => {
  res.json({ logs: recentLogs.slice(-50) });
});

export default router;
