/**
 * Household member count for grocery scaling.
 * Default: 2 adults + listed children (capped 1–8).
 */

export const DEFAULT_HOUSEHOLD_SIZE = 4;
export const DEFAULT_ADULT_COUNT = 2;
export const MIN_HOUSEHOLD_SIZE = 1;
export const MAX_HOUSEHOLD_SIZE = 8;

/** Resolve eaters for grocery scaling when only child list length is known. */
export function resolveHouseholdSize(
  childrenCount: number,
  adultCount: number = DEFAULT_ADULT_COUNT,
): number {
  const total = Math.max(0, adultCount) + Math.max(0, childrenCount);
  return Math.max(MIN_HOUSEHOLD_SIZE, Math.min(MAX_HOUSEHOLD_SIZE, total));
}
