import type { EnvAgeGroup } from "./types.js";

/**
 * Map AmyNest's standard AgeGroup string ("infant" | "toddler" | …) to
 * the EnvAgeGroup keys used inside the environment datasets.
 */
export function mapAgeGroupToEnvAgeGroup(
  ageGroup: "infant" | "toddler" | "preschool" | "early_school" | "pre_teen",
): EnvAgeGroup {
  switch (ageGroup) {
    case "infant":
      return "infant_0_1";
    case "toddler":
      return "toddler_1_3";
    case "preschool":
      return "preschool_3_5";
    case "early_school":
      return "early_school_5_10";
    case "pre_teen":
      return "preteen_10_15";
  }
}
