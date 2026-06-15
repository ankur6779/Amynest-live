import { describe, expect, it } from "vitest";
import { getMealPlan } from "@/lib/nutrition-data";
import {
  getNutritionCountryProfile,
  NUTRITION_COUNTRY_PROFILES,
  resolveNutritionCountryProfile,
} from "@workspace/nutrition-localization";
import { collectWeekMeals, collectWeekLunches } from "@/features/nutrition/lib/household-grocery";
import { planSchoolTiffinWeek, schoolLunchLabel } from "@/features/nutrition/lib/tiffin-planner";
import { generateGroceryList } from "@/features/nutrition/lib/grocery-generator";
import { getSeasonForCountry, seasonalMealScore } from "@/features/nutrition/lib/seasonal-foods";
import { localizePortionNote } from "@workspace/nutrition-localization";
import { buildNutritionPremiumPreview } from "@/features/nutrition/lib/nutrition-premium-preview";

const AGE = "school_6_10" as const;

describe("nutrition country profile regression", () => {
  const countries = ["IN", "US", "GB", "AU", "NZ", "AE"] as const;

  it.each(countries)("meal plan for %s avoids wrong-culture defaults", (code) => {
    const profile = getNutritionCountryProfile(code);
    const plan = getMealPlan(AGE, profile.defaultFoodStyle, profile);
    expect(plan).toBeDefined();
    const mondayDinner = plan!.days[0]!.veg.dinner.toLowerCase();
    if (code === "IN") {
      expect(mondayDinner).toMatch(/dal|roti|chapati|khichdi|paneer|sabzi|rice/);
    } else if (code === "US") {
      expect(mondayDinner).not.toMatch(/khichdi|idli|dal rice/);
      expect(mondayDinner).toMatch(/pasta|soup|stir|burger|tacos|curry|salad/);
    } else if (code === "GB") {
      expect(mondayDinner).toMatch(/fish pie|pasta|chilli|curry|pizza|soup/);
    } else if (code === "AU" || code === "NZ") {
      expect(mondayDinner).toMatch(/rice|pasta|tacos|pizza|soup|stir|fish/);
    } else if (code === "AE") {
      expect(mondayDinner).not.toMatch(/khichdi/);
    }
  });

  it("US tonight meal is not khichdi for mixed foodStyle", () => {
    const us = getNutritionCountryProfile("US");
    const plan = getMealPlan(AGE, "mixed", us);
    const dinners = plan!.days.map((d) => d.veg.dinner.toLowerCase()).join(" ");
    expect(dinners).not.toMatch(/khichdi/);
  });

  it.each([
    ["US", "School Lunch"],
    ["GB", "Packed Lunch"],
    ["AU", "Lunchbox"],
    ["NZ", "Lunchbox"],
    ["IN", "Tiffin"],
    ["AE", "School Lunch"],
    ["SG", "School Lunch"],
  ] as const)("school lunch label for %s is %s", (code, label) => {
    expect(schoolLunchLabel(getNutritionCountryProfile(code))).toBe(label);
  });

  it("US parent with Hindi UI keeps US nutrition profile", () => {
    const profile = resolveNutritionCountryProfile({ country: "US", language: "hi" });
    expect(profile.country).toBe("US");
    const plan = getMealPlan(AGE, "mixed", profile);
    const dinners = plan!.days.map((d) => d.veg.dinner.toLowerCase()).join(" ");
    expect(dinners).not.toMatch(/khichdi|idli dal/);
  });

  it("Singapore school-age plan uses local meal vocabulary", () => {
    const sg = getNutritionCountryProfile("SG");
    const plan = getMealPlan(AGE, "mixed", sg);
    const joined = plan!.days.flatMap((d) => [d.veg.lunch, d.veg.dinner]).join(" ").toLowerCase();
    expect(joined).toMatch(/chicken rice|mee|jasmine|bok choy|kaya|tofu/);
    expect(joined).not.toMatch(/khichdi|fish pie|vegemite/);
  });

  it("Singapore December maps to tropical summer", () => {
    const sg = getNutritionCountryProfile("SG");
    expect(getSeasonForCountry(sg, new Date("2026-12-15"))).toBe("summer");
  });

  it("Singapore grocery list uses local staples not atta", () => {
    const sg = getNutritionCountryProfile("SG");
    const meals = collectWeekMeals(AGE, "mixed", true, sg);
    const list = generateGroceryList({ weekMeals: meals, familySize: 3, countryProfile: sg });
    const names = list.flatMap((g) => g.items.map((i) => i.name)).join(" ").toLowerCase();
    expect(names).toMatch(/jasmine rice|tofu|asian greens/);
    expect(names).not.toMatch(/atta|dal \/ pulses/);
  });

  it("GB caregiver share snapshot uses UK meal plan", () => {
    const gb = getNutritionCountryProfile("GB");
    const plan = getMealPlan(AGE, "western", gb);
    const wednesdayDinner = plan!.days[2]!.veg.dinner.toLowerCase();
    expect(wednesdayDinner).toMatch(/lentil soup|fish pie|curry/);
    expect(wednesdayDinner).not.toMatch(/pasta with tomato-lentil sauce/);
  });

  it("AU premium preview uses country meal plan and grocery profile", () => {
    const au = getNutritionCountryProfile("AU");
    const preview = buildNutritionPremiumPreview({
      householdRows: [],
      ageGroupId: AGE,
      foodStyle: "western",
      memoryEntries: [],
      familySize: 3,
      isVeg: true,
      countryProfile: au,
    });
    expect(preview.shareMealPreview?.toLowerCase()).toMatch(/rice|pasta|tacos|soup|stir|fish/);
    expect(preview.shareMealPreview?.toLowerCase()).not.toMatch(/khichdi/);
    expect(preview.groceryHighlights.join(" ").toLowerCase()).toMatch(/wrap|milk|egg|fruit|yogurt/);
    expect(preview.groceryHighlights.join(" ").toLowerCase()).not.toMatch(/atta/);
  });

  it("US grocery list uses US staples not atta", () => {
    const us = getNutritionCountryProfile("US");
    const meals = collectWeekMeals(AGE, "western", true, us);
    const list = generateGroceryList({ weekMeals: meals, familySize: 3, countryProfile: us });
    const names = list.flatMap((g) => g.items.map((i) => i.name)).join(" ").toLowerCase();
    expect(names).toMatch(/bread|milk|egg|apple|oat|yogurt/);
    expect(names).not.toMatch(/atta|dal \/ pulses/);
  });

  it("India grocery list includes dal and atta", () => {
    const india = getNutritionCountryProfile("IN");
    const meals = collectWeekMeals(AGE, "indian", true, india);
    const list = generateGroceryList({ weekMeals: meals, familySize: 3, countryProfile: india });
    const names = list.flatMap((g) => g.items.map((i) => i.name)).join(" ").toLowerCase();
    expect(names).toMatch(/dal|atta|rice/);
  });

  it("Australia December maps to summer", () => {
    const au = getNutritionCountryProfile("AU");
    expect(getSeasonForCountry(au, new Date("2026-12-15"))).toBe("summer");
  });

  it("UK December maps to winter", () => {
    const gb = getNutritionCountryProfile("GB");
    expect(getSeasonForCountry(gb, new Date("2026-12-15"))).toBe("winter");
  });

  it("US portion note replaces katori with cup", () => {
    const us = getNutritionCountryProfile("US");
    const note = localizePortionNote("1 small katori per item", us);
    expect(note).toMatch(/cup/i);
    expect(note).not.toMatch(/katori/i);
  });

  it("India retains katori portion language", () => {
    const india = getNutritionCountryProfile("IN");
    const note = localizePortionNote("1 small katori per item", india);
    expect(note).toMatch(/katori/i);
  });

  it("US tiffin fallbacks use sandwiches not idli", () => {
    const us = getNutritionCountryProfile("US");
    const days = planSchoolTiffinWeek({
      ageGroupId: AGE,
      foodStyle: "western",
      weekLunches: [],
      countryProfile: us,
    });
    const joined = days.map((d) => d.suggestion.toLowerCase()).join(" ");
    expect(joined).toMatch(/sandwich|wrap|parfait|quesadilla/);
    expect(joined).not.toMatch(/idli|poha|paratha/);
  });

  it("India tiffin uses Indian fallbacks", () => {
    const india = getNutritionCountryProfile("IN");
    const days = planSchoolTiffinWeek({
      ageGroupId: AGE,
      foodStyle: "indian",
      weekLunches: [],
      countryProfile: india,
    });
    const joined = days.map((d) => d.suggestion.toLowerCase()).join(" ");
    expect(joined).toMatch(/idli|paratha|poha|roti|curd/);
  });

  it("UK school lunches prefer cheese sandwich patterns", () => {
    const gb = getNutritionCountryProfile("GB");
    const lunches = collectWeekLunches(AGE, "western", true, gb);
    expect(lunches.join(" ").toLowerCase()).toMatch(/cheese.*sandwich|porridge|hummus wrap|cheese & salad wrap/);
  });

  it("global fallback is not India", () => {
    expect(NUTRITION_COUNTRY_PROFILES.GLOBAL.country).toBe("GLOBAL");
    expect(NUTRITION_COUNTRY_PROFILES.GLOBAL.defaultFoodStyle).not.toBe("indian");
    const plan = getMealPlan(AGE, "mixed", NUTRITION_COUNTRY_PROFILES.GLOBAL);
    expect(plan!.days[0]!.veg.dinner.toLowerCase()).not.toMatch(/khichdi|idli dal/);
  });

  it("seasonal scoring uses country keywords", () => {
    const us = getNutritionCountryProfile("US");
    const winterScore = seasonalMealScore("Warm oatmeal porridge", "winter", us);
    const summerScore = seasonalMealScore("Warm oatmeal porridge", "summer", us);
    expect(winterScore).toBeGreaterThan(summerScore);
  });
});
