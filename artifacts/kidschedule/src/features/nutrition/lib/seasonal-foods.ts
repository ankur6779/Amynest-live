import type { NutritionCountryProfile, NutritionSeason } from "@workspace/nutrition-localization";
import { getSeasonForProfile } from "@workspace/nutrition-localization";
import { normalizeMealName } from "@/features/nutrition/lib/meal-nutrient-map";

/** @deprecated Use getSeasonForProfile — kept for India regression tests. */
export type IndiaSeason = "summer" | "monsoon" | "winter";

export { getIndiaSeason } from "@workspace/nutrition-localization";

export function getSeasonForCountry(profile: NutritionCountryProfile, date = new Date()): NutritionSeason {
  return getSeasonForProfile(profile, date);
}

export function seasonalMealScore(
  mealName: string,
  season: NutritionSeason,
  profile: NutritionCountryProfile,
): number {
  const normalized = normalizeMealName(mealName);
  const keywords = profile.seasonalKeywords[season] ?? [];
  let score = 0;
  for (const kw of keywords) {
    if (normalized.includes(kw)) score += 2;
  }
  return score;
}

export function prioritizeMealsBySeason(
  meals: string[],
  season: NutritionSeason,
  profile: NutritionCountryProfile,
): string[] {
  return [...meals].sort(
    (a, b) => seasonalMealScore(b, season, profile) - seasonalMealScore(a, season, profile),
  );
}

export function seasonalHighlight(
  mealName: string,
  season: NutritionSeason,
  profile: NutritionCountryProfile,
): string | null {
  const score = seasonalMealScore(mealName, season, profile);
  if (score === 0) return null;
  return profile.seasonalHighlightLabels[season] ?? null;
}

export function getSeasonalFoodTips(season: NutritionSeason, profile: NutritionCountryProfile): string[] {
  return profile.seasonalTips[season] ?? [];
}

export function seasonDisplayKey(season: NutritionSeason): string {
  return season;
}
