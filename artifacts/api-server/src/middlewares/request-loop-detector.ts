import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getAuth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

/**
 * Diagnostic middleware: warn (or block) on identical API hits within <2s
 * by the same caller. Used to identify infinite-loop request storms from
 * mobile/web that could be the underlying cause of memory pressure or
 * SIGTERM cascades.
 *
 * Opt-in via DIAG_LOOP_DETECT=1. To additionally short-circuit offending
 * requests with 429 set DIAG_LOOP_DETECT=block.
 *
 * Tracks a bounded ring of timestamps per (userId|ip, method, path).
 */

const WINDOW_MS = Number(process.env["DIAG_LOOP_WINDOW_MS"] ?? "2000");
const THRESHOLD = Number(process.env["DIAG_LOOP_THRESHOLD"] ?? "5");
const MAP_CAP = 5_000;

interface HitRing {
  hits: number[];
  loggedAt: number;
}

const hits = new Map<string, HitRing>();

function callerKey(req: Request): string {
  const { userId } = getAuth(req);
  if (userId) return `u:${userId}`;
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  return `ip:${ip}`;
}

function evict(): void {
  if (hits.size <= MAP_CAP) return;
  const drop = hits.size - MAP_CAP + 100;
  let n = 0;
  for (const k of hits.keys()) {
    hits.delete(k);
    if (++n >= drop) break;
  }
}

export function requestLoopDetector(opts?: { block?: boolean }): RequestHandler {
  const blockMode =
    opts?.block ?? process.env["DIAG_LOOP_DETECT"]?.trim().toLowerCase() === "block";

  return function detectLoop(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    const path = req.originalUrl?.split("?")[0] ?? req.path;
    const key = `${callerKey(req)}|${req.method} ${path}`;

    const ring = hits.get(key) ?? { hits: [], loggedAt: 0 };
    ring.hits = ring.hits.filter((t) => now - t < WINDOW_MS);
    ring.hits.push(now);
    hits.set(key, ring);

    logger.debug(
      {
        evt: "request.hit",
        method: req.method,
        path,
        caller: callerKey(req),
        at: now,
        countInWindow: ring.hits.length,
      },
      "request hit",
    );

    if (ring.hits.length >= THRESHOLD) {
      const shouldLog = now - ring.loggedAt > WINDOW_MS;
      if (shouldLog) {
        ring.loggedAt = now;
        logger.warn(
          {
            evt: "request.loop_detected",
            method: req.method,
            path,
            caller: callerKey(req),
            count: ring.hits.length,
            windowMs: WINDOW_MS,
            ua: req.headers["user-agent"],
            referer: req.headers["referer"],
          },
          `Request loop: ${ring.hits.length} calls to ${req.method} ${path} in ${WINDOW_MS}ms`,
        );
      }

      if (blockMode) {
        res
          .status(429)
          .setHeader("Retry-After", "2")
          .json({ error: "loop_blocked", message: "Too many identical requests" });
        return;
      }
    }

    evict();
    next();
  };
}
