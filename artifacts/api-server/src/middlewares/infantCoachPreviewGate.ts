import type { Request, Response, NextFunction } from "express";
import { getAuth } from "../lib/auth";
import {
  assertInfantCoachPreviewMutationAllowed,
  infantCoachPreviewGuardFailureBody,
  resolveChildIdFromRequest,
} from "../lib/infant-coach-preview-guard.js";

/**
 * Blocks Amy Coach mutations for children under 24 months (preview-only infants).
 * Accepts optional childId on query or body; falls back to infant-only household.
 */
export function infantCoachPreviewGate() {
  return async function infantCoachPreviewGateMw(
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
    const gate = await assertInfantCoachPreviewMutationAllowed(userId, childId);
    if (!gate.ok) {
      res.status(gate.status).json(infantCoachPreviewGuardFailureBody(gate));
      return;
    }

    next();
  };
}
