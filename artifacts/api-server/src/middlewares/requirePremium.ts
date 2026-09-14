import type { Request, Response, NextFunction } from "express";
import { getAuth } from "../lib/auth";
import {
  isPremiumAuthorized,
  premiumDenialBody,
  resolveEntitlementDecision,
} from "../services/entitlement-authorization.js";

/**
 * Server-side premium gate. Fail-closed: lookup errors and expired/free
 * accounts receive 403. Client-supplied isPremium / role / entitlement
 * fields are ignored.
 */
export function requirePremium(feature?: string) {
  return async function requirePremiumMw(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const decision = await resolveEntitlementDecision(userId);
    if (!isPremiumAuthorized(decision)) {
      res.status(403).json(premiumDenialBody(decision, feature));
      return;
    }

    next();
  };
}
