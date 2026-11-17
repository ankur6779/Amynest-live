/**
 * Canonical total-month age for Hub / Rooms / discovery.
 *
 * The children table stores `age` (whole years) + `ageMonths` (0–11 remainder).
 * Some API DTOs (AccessibleChild) already put TOTAL months in `ageMonths`.
 * Double-counting that field classifies a 12–23 month child as 24+ and hides
 * Infant Care. When `dob` is present, live calendar age is authoritative.
 */

export type ChildAgeInput = {
  age?: number | null;
  ageMonths?: number | null;
  dob?: string | null;
};

export function monthsFromDob(dob: string, now = new Date()): number | null {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  const total = years * 12 + months;
  if (!Number.isFinite(total)) return null;
  return Math.max(0, total);
}

function safeInt(value: number | null | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

/** Total months from stored profile fields — never double-count a total. */
export function storedTotalAgeMonths(child: ChildAgeInput): number {
  const years = safeInt(child.age);
  const monthsField = safeInt(child.ageMonths);
  if (monthsField >= 12) return monthsField;
  return years * 12 + monthsField;
}

export function resolveTotalAgeMonths(
  child: ChildAgeInput,
  now = new Date(),
): number {
  if (child.dob) {
    const fromDob = monthsFromDob(child.dob, now);
    if (fromDob != null) return fromDob;
  }
  return storedTotalAgeMonths(child);
}

export function agePartsFromTotalMonths(total: number): {
  years: number;
  months: number;
} {
  const safe = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  return { years: Math.floor(safe / 12), months: safe % 12 };
}

/** Hub / Care infant window — 0–23 months inclusive. */
export function isHubInfantAgeMonths(totalMonths: number): boolean {
  return Number.isFinite(totalMonths) && totalMonths >= 0 && totalMonths < 24;
}
