import type { Request, Response, NextFunction } from "express";
import { getAuth } from "../lib/auth";
import {
  assertInfantExploreMutationAllowed,
  infantExploreGuardFailureBody,
  resolveChildIdFromRequest,
} from "../lib/infant-explore-guard.js";

/**
 * Blocks POST/PUT/PATCH mutations for children under 24 months on
 * Explore-the-next-stage modules (preview-only infants).
 */
export function infantExploreMutationGate() {
  return async function infantExploreMutationGateMw(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const childId = resolveChildIdFromRequest(req);
    if (childId == null) {
      next();
      return;
    }

    const gate = await assertInfantExploreMutationAllowed(userId, childId);
    if (!gate.ok) {
      res.status(gate.status).json(infantExploreGuardFailureBody(gate));
      return;
    }

    next();
  };
}
