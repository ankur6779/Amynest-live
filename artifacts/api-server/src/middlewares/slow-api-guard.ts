import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const SLOW_API_MS = Number(process.env.SLOW_API_THRESHOLD_MS ?? "3000");

export function slowApiGuard(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - started;
    if (ms <= SLOW_API_MS) return;
    logger.warn(
      {
        kind: "slow_api",
        method: req.method,
        path: req.originalUrl?.split("?")[0],
        statusCode: res.statusCode,
        durationMs: ms,
      },
      "Slow API",
    );
  });
  next();
}
