import type { Request, Response, NextFunction } from "express";
import { getAuth } from "../lib/auth";
import {
  getOrCreateSubscription,
  isPremiumNow,
  incrementFeatureUsage,
  FREE_FEATURE_LIMITS,
  nextResetAtFor,
  type FeatureKey,
} from "../services/subscriptionService.js";

/**
 * Generic per-feature lifetime gate. Same atomic reserve-then-check
 * strategy as `aiUsageGate`, but parameterised so the same middleware
 * powers the Global Paywall: routine generation, behavior log, Amy AI,
 * etc. Premium users bypass entirely.
 *
 * On exceed: returns 402 with a structured payload the frontend can use
 * to open the paywall modal:
 *   { error: "feature_locked", feature, message, limit, used }
 */
export function featureGate(feature: FeatureKey) {
  return async function featureGateMw(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const sub = await getOrCreateSubscription(userId);
    if (isPremiumNow(sub)) {
      next();
      return;
    }

    const limit = FREE_FEATURE_LIMITS[feature];
    const newCount = await incrementFeatureUsage(userId, feature, 1);
    if (newCount > limit) {
      // Roll back the reservation — over the lifetime cap.
      await incrementFeatureUsage(userId, feature, -1).catch(() => undefined);
      const resetsAt = nextResetAtFor(feature);
      res.status(402).json({
        error: "feature_locked",
        feature,
        message: resetsAt
          ? "Daily limit reached. Upgrade for unlimited access."
          : "Free trial used. Upgrade to unlock unlimited access.",
        limit,
        used: limit,
        resetsAt,
      });
      return;
    }

    // Refund the reservation if the downstream handler ends up non-2xx,
    // so a server error doesn't burn the user's one free shot.
    const origEnd = res.end.bind(res);
    let settled = false;
    res.end = function (...args: unknown[]) {
      if (!settled) {
        settled = true;
        if (res.statusCode < 200 || res.statusCode >= 300) {
          void incrementFeatureUsage(userId, feature, -1).catch(() => undefined);
        }
      }
      // @ts-expect-error - express.end has multiple overloads
      return origEnd(...args);
    };
    next();
  };
}
