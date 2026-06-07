import type { Request, Response } from "express";
import { canAccessChild } from "./child-access.js";
import { isInfantAgeMonths } from "./infant-age.js";
import {
  resolveChildIdFromRequest,
  userHasOnlyInfantChildren,
} from "./infant-explore-guard.js";

export const INFANT_COACH_PREVIEW_ONLY_ERROR = "infant_coach_preview_only" as const;

const COACH_PREVIEW_MESSAGE =
  "Amy Coach is preview-only for children under 24 months. Browse goals and sample wins, but plan generation and progress unlock from age 2.";

export type InfantCoachPreviewGuardResult =
  | { ok: true }
  | {
      ok: false;
      status: 403;
      error: typeof INFANT_COACH_PREVIEW_ONLY_ERROR;
      message: string;
      childAgeMonths?: number;
    };

export function infantCoachPreviewGuardFailureBody(
  gate: Extract<InfantCoachPreviewGuardResult, { ok: false }>,
): Record<string, unknown> {
  return {
    error: gate.error,
    message: gate.message,
    ...(gate.childAgeMonths != null ? { childAgeMonths: gate.childAgeMonths } : {}),
  };
}

/**
 * Blocks Amy Coach mutations when the active child is under 24 months.
 * When childId is omitted, blocks households with only infant children.
 */
export async function assertInfantCoachPreviewMutationAllowed(
  userId: string,
  childId?: number | null,
): Promise<InfantCoachPreviewGuardResult> {
  if (childId != null && childId > 0) {
    const child = await canAccessChild(childId, userId);
    if (child && isInfantAgeMonths(child.ageMonths)) {
      return {
        ok: false,
        status: 403,
        error: INFANT_COACH_PREVIEW_ONLY_ERROR,
        message: COACH_PREVIEW_MESSAGE,
        childAgeMonths: child.ageMonths,
      };
    }
    return { ok: true };
  }

  if (await userHasOnlyInfantChildren(userId)) {
    return {
      ok: false,
      status: 403,
      error: INFANT_COACH_PREVIEW_ONLY_ERROR,
      message: COACH_PREVIEW_MESSAGE,
    };
  }

  return { ok: true };
}

/** Sends 403 when the request targets an infant preview context. Returns true when blocked. */
export async function rejectInfantCoachPreviewMutation(
  res: Response,
  userId: string,
  childId?: number | null,
): Promise<boolean> {
  const gate = await assertInfantCoachPreviewMutationAllowed(userId, childId);
  if (!gate.ok) {
    res.status(gate.status).json(infantCoachPreviewGuardFailureBody(gate));
    return true;
  }
  return false;
}

export { resolveChildIdFromRequest };
