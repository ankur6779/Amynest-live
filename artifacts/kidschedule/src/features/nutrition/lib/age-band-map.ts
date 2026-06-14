import type { AgeGroupId } from "@/lib/nutrition-data";

/** Map child age in months to the closest nutrition age band. */
export function monthsToAgeGroupId(months: number | null | undefined): AgeGroupId {
  if (months == null || months < 0) return "toddler_1_3";
  if (months < 6) return "infant_0_6";
  if (months < 12) return "infant_6_12";
  if (months < 36) return "toddler_1_3";
  if (months < 72) return "preschool_3_6";
  if (months < 120) return "school_6_10";
  if (months < 180) return "preteen_10_15";
  return "preteen_10_15";
}

/** Monday-based day index (0 = Mon … 6 = Sun) for static meal plans. */
export function getMondayBasedDayIndex(date = new Date()): number {
  const dow = date.getDay();
  return dow === 0 ? 6 : dow - 1;
}
