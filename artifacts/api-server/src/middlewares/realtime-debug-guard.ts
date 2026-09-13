import type { Request, Response, NextFunction } from "express";
import { getAuth } from "../lib/auth.js";
import { isAdminUser } from "../lib/admin-auth.js";
import { isProductionDeployment } from "../queue/mode.js";
import { checkDistributedRateLimit } from "../lib/distributed-rate-limit.js";
import { logger } from "../lib/logger.js";

const REALTIME_DEBUG_RATE = { limit: 10, windowMs: 60_000 };

/**
 * Guards OpenAI Realtime debug/token mint routes.
 * Production: always 404 (disabled).
 * Non-production: require auth + admin + rate limit.
 */
export async function realtimeDebugGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (isProductionDeployment()) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const rate = await checkDistributedRateLimit(
    `realtime-debug:${userId}`,
    REALTIME_DEBUG_RATE.limit,
    REALTIME_DEBUG_RATE.windowMs,
  );
  if (!rate.allowed) {
    res.status(429).json({
      error: "rate_limited",
      retryAfterSeconds: rate.retryAfterSeconds ?? 60,
    });
    return;
  }

  logger.info(
    { evt: "realtime_debug.access", userId, path: req.path },
    "Realtime debug route accessed",
  );
  next();
}
