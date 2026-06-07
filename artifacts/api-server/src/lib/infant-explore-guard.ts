import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, childrenTable, childCaregiversTable } from "@workspace/db";
import { canAccessChild } from "./child-access.js";
import { isInfantAgeMonths, totalAgeMonths } from "./infant-age.js";

export const INFANT_EXPLORE_PREVIEW_ONLY_ERROR = "infant_explore_preview_only" as const;

export type InfantExploreGuardResult =
  | { ok: true }
  | {
      ok: false;
      status: 403;
      error: typeof INFANT_EXPLORE_PREVIEW_ONLY_ERROR;
      message: string;
      childAgeMonths: number;
    };

export function infantExploreGuardFailureBody(
  gate: Extract<InfantExploreGuardResult, { ok: false }>,
): Record<string, unknown> {
  return {
    error: gate.error,
    message: gate.message,
    childAgeMonths: gate.childAgeMonths,
  };
}

export function assertInfantExploreMutationAllowedByAgeMonths(
  ageMonths: number,
): InfantExploreGuardResult {
  if (!isInfantAgeMonths(ageMonths)) return { ok: true };
  return {
    ok: false,
    status: 403,
    error: INFANT_EXPLORE_PREVIEW_ONLY_ERROR,
    message:
      "This module is preview-only for children under 24 months. Browse and view content, but progress, streaks, and AI are available from age 2.",
    childAgeMonths: ageMonths,
  };
}

/**
 * Blocks mutations when the child is under 24 months (DB age only).
 */
export async function assertInfantExploreMutationAllowed(
  userId: string,
  childId: number,
): Promise<InfantExploreGuardResult> {
  const child = await canAccessChild(childId, userId);
  if (!child) {
    return { ok: true };
  }
  return assertInfantExploreMutationAllowedByAgeMonths(child.ageMonths);
}

/** True when every child in the household is under 24 months. */
export async function userHasOnlyInfantChildren(userId: string): Promise<boolean> {
  const rows = await db
    .select({
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId));

  const caregiverRows = await db
    .select({
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childCaregiversTable)
    .innerJoin(childrenTable, eq(childrenTable.id, childCaregiversTable.childId))
    .where(
      and(
        eq(childCaregiversTable.userId, userId),
        eq(childCaregiversTable.status, "active"),
      ),
    );

  const all = [...rows, ...caregiverRows];
  if (all.length === 0) return false;
  return all.every((row) =>
    isInfantAgeMonths(totalAgeMonths(row.age ?? 0, row.ageMonths ?? 0)),
  );
}

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

function resolveChildAgeMonthsFromBody(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.childAgeMonths === "number" && Number.isFinite(b.childAgeMonths)) {
    return Math.max(0, Math.floor(b.childAgeMonths));
  }
  if (typeof b.childAge === "number" && Number.isFinite(b.childAge)) {
    return totalAgeMonths(Math.floor(b.childAge), 0);
  }
  return null;
}

/**
 * Sends 403 when the request targets an infant child. Returns true when blocked.
 */
export async function rejectInfantExploreMutation(
  res: Response,
  userId: string,
  childId: number,
): Promise<boolean> {
  const gate = await assertInfantExploreMutationAllowed(userId, childId);
  if (!gate.ok) {
    res.status(gate.status).json(infantExploreGuardFailureBody(gate));
    return true;
  }
  return false;
}

/**
 * Sends 403 when body carries an infant age. Returns true when blocked.
 */
export function rejectInfantExploreMutationByBodyAge(
  res: Response,
  body: unknown,
): boolean {
  const ageMonths = resolveChildAgeMonthsFromBody(body);
  if (ageMonths == null) return false;
  const gate = assertInfantExploreMutationAllowedByAgeMonths(ageMonths);
  if (!gate.ok) {
    res.status(gate.status).json(infantExploreGuardFailureBody(gate));
    return true;
  }
  return false;
}

export { resolveChildIdFromRequest, resolveChildAgeMonthsFromBody };
