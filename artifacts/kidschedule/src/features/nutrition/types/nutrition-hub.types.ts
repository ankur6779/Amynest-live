import type { AgeGroupId } from "@/lib/nutrition-data";

export type NutritionTab = "today" | "plan" | "track" | "learn" | "family";

export type PlanSource = "classic" | "smart";

export type MealEntry = {
  name: string;
  protein_g: number;
  carbs_g: number;
  fiber_g: number;
  calories: number;
};

export type DayPlan = {
  day: string;
  meals: {
    breakfast: MealEntry;
    mid_morning: MealEntry;
    lunch: MealEntry;
    snack: MealEntry;
    dinner: MealEntry;
  };
};

export type WeatherType = "hot" | "cold" | "moderate";

export type PortionEntry = { amount: string; texture: string | null };

export type FamilyPortionResult = {
  meal: string;
  portions: {
    "6_12m": PortionEntry;
    "1_3y": PortionEntry;
    "4_8y": PortionEntry;
    adult: PortionEntry;
  };
  feeding_tip: string | null;
  allergy_note: string | null;
};

export type NutritionActiveChild = {
  ageMonths: number | null;
  name: string | null;
};

export type { AgeGroupId };
