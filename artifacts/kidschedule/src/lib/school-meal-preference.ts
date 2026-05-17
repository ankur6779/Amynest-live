/**
 * Global school meal UX: two parent-facing options mapped to API schoolMealMode.
 */

export type SchoolMealPreference = "meals_from_home" | "school_provides_meals";

/** API values used by GenerateRoutineBody.schoolMealMode */
export type ApiSchoolMealMode =
  | "disabled"
  | "snack_only"
  | "packed_lunch_only"
  | "snack_and_packed_lunch";

export function schoolMealPreferenceToApiMode(
  pref: SchoolMealPreference,
): ApiSchoolMealMode {
  return pref === "school_provides_meals" ? "disabled" : "snack_and_packed_lunch";
}

export function apiModeToSchoolMealPreference(
  mode: ApiSchoolMealMode | undefined,
): SchoolMealPreference {
  if (mode === "disabled") return "school_provides_meals";
  return "meals_from_home";
}

const PACKED_LUNCH_COUNTRIES = new Set([
  "IN",
  "INDIA",
  "AE",
  "UAE",
  "UNITED ARAB EMIRATES",
]);

const SCHOOL_MEAL_COUNTRIES = new Set([
  "US",
  "USA",
  "UNITED STATES",
  "GB",
  "UK",
  "UNITED KINGDOM",
  "AU",
  "AUSTRALIA",
  "NZ",
  "NEW ZEALAND",
  "CA",
  "CANADA",
  "IE",
  "IRELAND",
]);

export function defaultSchoolMealPreference(
  country?: string | null,
  region?: string | null,
): SchoolMealPreference {
  const c = (country ?? "").trim().toUpperCase();
  if (c && SCHOOL_MEAL_COUNTRIES.has(c)) return "school_provides_meals";
  if (c && PACKED_LUNCH_COUNTRIES.has(c)) return "meals_from_home";

  const r = (region ?? "").toLowerCase();
  if (
    r.includes("western") ||
    r.includes("global") ||
    r === "mixed"
  ) {
    return "school_provides_meals";
  }
  if (
    r.includes("indian") ||
    r.includes("pan_indian") ||
    r.includes("middle_eastern") ||
    r.includes("south_indian") ||
    r.includes("north_indian")
  ) {
    return "meals_from_home";
  }

  return "meals_from_home";
}
