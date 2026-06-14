import type { DayPlan } from "@/features/nutrition/types/nutrition-hub.types";

export const MEAL_TIME_KEYS: {
  key: keyof DayPlan["meals"];
  labelKey: string;
  emoji: string;
}[] = [
  { key: "breakfast", labelKey: "nutrition_hub.meals.breakfast", emoji: "🌅" },
  { key: "mid_morning", labelKey: "nutrition_hub.meals.mid_morning", emoji: "🍎" },
  { key: "lunch", labelKey: "nutrition_hub.meals.lunch", emoji: "🌞" },
  { key: "snack", labelKey: "nutrition_hub.meals.snack", emoji: "🍪" },
  { key: "dinner", labelKey: "nutrition_hub.meals.dinner", emoji: "🌙" },
];

export const AGE_SLOT_CONFIG: {
  key: "6_12m" | "1_3y" | "4_8y" | "adult";
  icon: string;
  labelKey: string;
}[] = [
  { key: "6_12m", icon: "👶", labelKey: "nutrition_hub.family.age_6_12m" },
  { key: "1_3y", icon: "🧒", labelKey: "nutrition_hub.family.age_1_3y" },
  { key: "4_8y", icon: "👦", labelKey: "nutrition_hub.family.age_4_8y" },
  { key: "adult", icon: "👨", labelKey: "nutrition_hub.family.age_adult" },
];
