/**
 * Activity-category icon-map contract tests
 *
 * The dashboard ("Today's activities" carousel) and the routine detail
 * timeline both render an Ionicons glyph for each routine item based on
 * the item's `category` string. Both screens import the shared map from
 * `constants/categoryIcons.ts` — but it would still be easy to add a new
 * category on the server (e.g. `screen_time`) and forget to register an
 * icon for it. When that happens both screens silently fall back to the
 * default `ellipse-outline`, which is a poor user experience.
 *
 * This test pins the contract by running `generateRuleBasedRoutine`
 * across every age group and a school / no-school day, collecting every
 * distinct category it emits, and asserting each one has an explicit
 * entry in the shared icon map.
 */
import { describe, it, expect } from "vitest";
import {
  generateRuleBasedRoutine,
  type AgeGroup,
  type RoutineParams,
} from "@api-lib/routine-templates";
import {
  CATEGORY_ICON_PAIRS,
  KNOWN_CATEGORIES,
  categoryIcon,
  categoryOutlineIcon,
} from "../constants/categoryIcons";

const AGE_GROUPS: { ageGroup: AgeGroup; totalAgeMonths: number }[] = [
  { ageGroup: "infant", totalAgeMonths: 8 },
  { ageGroup: "toddler", totalAgeMonths: 30 },
  { ageGroup: "preschool", totalAgeMonths: 54 },
  { ageGroup: "early_school", totalAgeMonths: 84 },
  { ageGroup: "pre_teen", totalAgeMonths: 132 },
];

function baseParams(
  ageGroup: AgeGroup,
  totalAgeMonths: number,
  hasSchool: boolean,
): RoutineParams {
  return {
    childName: "TestChild",
    ageGroup,
    totalAgeMonths,
    wakeUpTime: "07:00 AM",
    sleepTime: "09:00 PM",
    schoolStartTime: "09:00 AM",
    schoolEndTime: "03:00 PM",
    travelMode: "car",
    hasSchool,
    mood: "balanced",
    foodType: "veg",
    region: "pan_indian",
    caregiver: "mom",
    weatherOutdoor: "yes",
    date: "2026-05-02",
  };
}

function collectEmittedCategories(): Set<string> {
  const seen = new Set<string>();
  for (const { ageGroup, totalAgeMonths } of AGE_GROUPS) {
    for (const hasSchool of [true, false]) {
      const { items } = generateRuleBasedRoutine(
        baseParams(ageGroup, totalAgeMonths, hasSchool),
      );
      for (const it of items) {
        if (it.category) seen.add(it.category.toLowerCase());
      }
    }
  }
  return seen;
}

describe("categoryIconMap", () => {
  it("includes a default fallback entry", () => {
    expect(CATEGORY_ICON_PAIRS.default).toBeDefined();
    expect(CATEGORY_ICON_PAIRS.default.solid).toBeTruthy();
    expect(CATEGORY_ICON_PAIRS.default.outline).toBeTruthy();
  });

  it("maps every category emitted by generateRuleBasedRoutine", () => {
    const emitted = collectEmittedCategories();
    expect(emitted.size).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const cat of emitted) {
      if (!CATEGORY_ICON_PAIRS[cat]) missing.push(cat);
    }
    expect(missing, `Missing icons for categories: ${missing.join(", ")}`).toEqual([]);
  });

  it("provides both solid and outline glyphs for every entry", () => {
    for (const [key, pair] of Object.entries(CATEGORY_ICON_PAIRS)) {
      expect(pair.solid, `solid icon missing for ${key}`).toBeTruthy();
      expect(pair.outline, `outline icon missing for ${key}`).toBeTruthy();
    }
  });

  it("exposes KNOWN_CATEGORIES without the default fallback", () => {
    expect(KNOWN_CATEGORIES).not.toContain("default");
    for (const cat of KNOWN_CATEGORIES) {
      expect(CATEGORY_ICON_PAIRS[cat]).toBeDefined();
    }
  });

  it("categoryIcon helper falls back to the default for unknown values", () => {
    expect(categoryIcon("definitely-not-a-real-category")).toBe(
      CATEGORY_ICON_PAIRS.default.solid,
    );
    expect(categoryIcon(undefined)).toBe(CATEGORY_ICON_PAIRS.default.solid);
    expect(categoryIcon(null)).toBe(CATEGORY_ICON_PAIRS.default.solid);
  });

  it("categoryOutlineIcon helper falls back to the default for unknown values", () => {
    expect(categoryOutlineIcon("nope")).toBe(CATEGORY_ICON_PAIRS.default.outline);
    expect(categoryOutlineIcon(undefined)).toBe(
      CATEGORY_ICON_PAIRS.default.outline,
    );
  });

  it("categoryIcon helper is case-insensitive", () => {
    expect(categoryIcon("MEAL")).toBe(CATEGORY_ICON_PAIRS.meal.solid);
    expect(categoryOutlineIcon("Wind-Down")).toBe(
      CATEGORY_ICON_PAIRS["wind-down"].outline,
    );
  });
});
