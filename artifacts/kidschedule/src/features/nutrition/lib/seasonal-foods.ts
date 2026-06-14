import type { IndiaSeason } from "@/features/nutrition/lib/operations-constants";
import { normalizeMealName } from "@/features/nutrition/lib/meal-nutrient-map";

/** Northern-India oriented month → season (deterministic). */
export function getIndiaSeason(date = new Date()): IndiaSeason {
  const month = date.getMonth() + 1;
  if (month >= 4 && month <= 6) return "summer";
  if (month >= 7 && month <= 9) return "monsoon";
  return "winter";
}

const SEASONAL_KEYWORDS: Record<IndiaSeason, string[]> = {
  summer: ["watermelon", "cucumber", "curd", "dahi", "lassi", "mango", "buttermilk", "coconut"],
  monsoon: ["corn", "bhutta", "soup", "khichdi", "ginger", "turmeric", "pakora", "tea"],
  winter: ["carrot", "gajar", "spinach", "palak", "mustard", "sarson", "peas", "methi", "paratha"],
};

export function seasonalMealScore(mealName: string, season: IndiaSeason): number {
  const normalized = normalizeMealName(mealName);
  const keywords = SEASONAL_KEYWORDS[season];
  let score = 0;
  for (const kw of keywords) {
    if (normalized.includes(kw)) score += 2;
  }
  return score;
}

export function prioritizeMealsBySeason(meals: string[], season: IndiaSeason): string[] {
  return [...meals].sort(
    (a, b) => seasonalMealScore(b, season) - seasonalMealScore(a, season),
  );
}

export function seasonalHighlight(mealName: string, season: IndiaSeason): string | null {
  const score = seasonalMealScore(mealName, season);
  if (score === 0) return null;
  const labels: Record<IndiaSeason, string> = {
    summer: "Cooling & hydrating — great for summer",
    monsoon: "Comfort food — suits monsoon appetites",
    winter: "Warm & nourishing — ideal for winter",
  };
  return labels[season];
}

export function getSeasonalFoodTips(season: IndiaSeason): string[] {
  const tips: Record<IndiaSeason, string[]> = {
    summer: [
      "Prioritise curd, seasonal fruit, and light meals.",
      "Keep hydration foods on the grocery list.",
    ],
    monsoon: [
      "Warm, easy-to-digest meals work well in monsoon.",
      "Include ginger and turmeric in home cooking.",
    ],
    winter: [
      "Root vegetables and greens are in season.",
      "Hearty breakfasts support active school days.",
    ],
  };
  return tips[season];
}
