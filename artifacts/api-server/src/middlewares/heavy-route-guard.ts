import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getAuth } from "../lib/auth.js";
import {
  buildSubscriptionFallbackResponse,
  getDashboardFallbackForPath,
} from "../lib/api-fallbacks.js";
import {
  clearHeavyRouteInFlight,
  evaluateHeavyRouteRequest,
  isHeavyRouteInFlight,
  isMemoryPressureMode,
  markHeavyRouteInFlight,
  setCachedHeavyResponse,
  waitForHeavyRouteCache,
  type HeavyRouteGroup,
} from "../lib/production-route-guard.js";

function requestPath(req: Request): string {
  return (req.originalUrl ?? req.url ?? req.path).split("?")[0] ?? req.path;
}

function respondCached(res: Response, body: unknown, reason: string): void {
  res.setHeader("X-Amynest-Cache", reason);
  res.status(200).json(body);
}

function respondFallback(res: Response, group: HeavyRouteGroup, path: string): void {
  const body =
    group === "subscription"
      ? buildSubscriptionFallbackResponse()
      : getDashboardFallbackForPath(path);
  res.setHeader("X-Amynest-Degraded", "1");
  res.status(200).json(body);
}

/**
 * Rate limit, dedupe in-flight GETs, cache responses, and degrade under memory pressure.
 */
export function heavyRouteGuard(group: HeavyRouteGroup): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== "GET") {
      next();
      return;
    }

    const { userId } = getAuth(req);
    if (!userId) {
      next();
      return;
    }

    const path = requestPath(req);

    void (async () => {
      if (isHeavyRouteInFlight(userId, path)) {
        const waited = await waitForHeavyRouteCache(userId, path);
        if (waited != null) {
          respondCached(res, waited, "dedupe_wait");
          return;
        }
        if (isMemoryPressureMode()) {
          respondFallback(res, group, path);
          return;
        }
      }

      const decision = evaluateHeavyRouteRequest(group, userId, path);
      if (decision.action === "respond") {
        respondCached(res, decision.body, decision.reason);
        return;
      }
      if (decision.action === "fallback") {
        respondFallback(res, group, path);
        return;
      }

      if (isMemoryPressureMode()) {
        respondFallback(res, group, path);
        return;
      }

      const flightKey = markHeavyRouteInFlight(userId, path);
      res.on("finish", () => clearHeavyRouteInFlight(flightKey));

      const originalJson = res.json.bind(res);
      res.json = function cacheJsonBody(body: unknown) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCachedHeavyResponse(userId, path, body, group);
        }
        return originalJson(body);
      };

      next();
    })().catch(() => {
      if (!res.headersSent) respondFallback(res, group, path);
    });
  };
}
