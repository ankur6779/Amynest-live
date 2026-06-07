import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/** Propagate x-request-id or assign one for log correlation. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers["x-request-id"];
  const requestId =
    typeof incoming === "string" && incoming.trim().length > 0
      ? incoming.trim().slice(0, 128)
      : randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
