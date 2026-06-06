/** Infant experience age ceiling (0–24 months). */
export const INFANT_MAX_AGE_MONTHS = 24;

export function totalAgeMonths(ageYears: number, ageMonthsPart = 0): number {
  return Math.max(0, ageYears * 12 + ageMonthsPart);
}

export function isInfantAgeMonths(totalMonths: number): boolean {
  return totalMonths >= 0 && totalMonths < INFANT_MAX_AGE_MONTHS;
}

/** Parse a positive childId from a request body (never trust age fields). */
export function parseChildIdFromBody(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const childId = (body as Record<string, unknown>).childId;
  if (typeof childId === "number" && Number.isFinite(childId) && childId > 0) {
    return Math.floor(childId);
  }
  return null;
}

export function parseChildAgeMonthsFromBody(body: unknown): number | null {
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
