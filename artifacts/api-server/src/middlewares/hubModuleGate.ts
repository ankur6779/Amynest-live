import type { Request, Response, NextFunction } from "express";
import { getAuth } from "../lib/auth";
import type { ParentHubFeatureId } from "../services/featureUsageService.js";
import { getOrCreateSubscription, isPremiumNow } from "../services/subscriptionService.js";
import {
  assertHubModuleAccess,
  hubModuleGateFailureBody,
} from "../services/hubModuleGateService.js";

function resolveChildIdFromRequest(req: Request): number | undefined {
  const rawQuery = req.query?.childId;
  if (rawQuery != null) {
    const n = Number(Array.isArray(rawQuery) ? rawQuery[0] : rawQuery);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const body = req.body as { childId?: unknown } | undefined;
  if (body && typeof body.childId === "number" && body.childId > 0) {
    return body.childId;
  }
  return undefined;
}

/**
 * Enforces Parent Hub module entitlement on API routes (defense in depth).
 * Pairs with client `HubModuleGateWrap` / `useHubModuleGate`.
 */
export function hubModuleGate(
  featureId: ParentHubFeatureId,
  opts: { premiumOnly?: boolean; denyStatus?: 402 | 403 } = {},
) {
  return async function hubModuleGateMw(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    if (opts.premiumOnly) {
      const sub = await getOrCreateSubscription(userId);
      if (!isPremiumNow(sub)) {
        res.status(opts.denyStatus ?? 403).json({
          error: "premium_required",
          feature: featureId,
          message: "Upgrade to use this premium learning action.",
        });
        return;
      }
      next();
      return;
    }

    const childId = resolveChildIdFromRequest(req);
    const gate = await assertHubModuleAccess(userId, featureId, childId);
    if (!gate.ok) {
      res.status(402).json(hubModuleGateFailureBody(gate));
      return;
    }

    next();
  };
}
