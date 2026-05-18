import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ClientLogBody = z.object({
  type: z.enum(["crash", "slow_api", "failed_routine", "warning", "info"]),
  message: z.string().min(1).max(4000),
  context: z.string().max(256).optional(),
  meta: z.record(z.unknown()).optional(),
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

router.post("/logs", async (req, res): Promise<void> => {
  const parsed = ClientLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = getAuth(req);
  const entry = {
    ts: Date.now(),
    userId: userId ?? null,
    type: parsed.data.type,
    message: parsed.data.message,
    context: parsed.data.context,
    route: parsed.data.route,
    durationMs: parsed.data.durationMs,
    meta: parsed.data.meta,
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
});

/** Ops/debug: last N client logs (auth required — mounted after requireAuth). */
router.get("/logs/recent", (_req, res) => {
  res.json({ logs: recentLogs.slice(-50) });
});

export default router;
