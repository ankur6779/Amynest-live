/**
 * Nutrition Phase 2 — living room hierarchy helpers.
 * Presentation only. No meal logic / API / entitlement changes.
 */

import type { NutritionTab } from "@/features/nutrition/types/nutrition-hub.types";

export type NutritionRecommend = {
  tab: NutritionTab;
  label: string;
  title: string;
  purpose: string;
};

export type NutritionQuietPath = {
  tab: NutritionTab;
  title: string;
  purpose: string;
};

/** Primary quiet destinations — Care-room opening target set. */
export const NUTRITION_QUIET_PATHS: readonly NutritionQuietPath[] = [
  {
    tab: "today",
    title: "Today's meal",
    purpose: "One calm plate for this body",
  },
  {
    tab: "plan",
    title: "Week plan",
    purpose: "Gentle meals ahead",
  },
  {
    tab: "learn",
    title: "Learn",
    purpose: "Understand nutrients calmly",
  },
  {
    tab: "track",
    title: "Notice",
    purpose: "See patterns without pressure",
  },
  {
    tab: "family",
    title: "Family",
    purpose: "Meals we share together",
  },
] as const;

/**
 * One recommended Care act for a tired parent.
 * Time-aware; never scores the parent.
 */
export function recommendNutritionAction(
  hour: number = new Date().getHours(),
): NutritionRecommend {
  if (hour >= 15) {
    return {
      tab: "today",
      label: "Start here",
      title: "Tonight's meal",
      purpose: "One calm plate for this evening",
    };
  }
  if (hour < 11) {
    return {
      tab: "today",
      label: "Start here",
      title: "Today's meal",
      purpose: "One calm plate for this body",
    };
  }
  return {
    tab: "plan",
    label: "Today's care",
    title: "Week plan",
    purpose: "See meals ahead gently",
  };
}

/** Flag — Nutrition living room manufacturing. Default ON. */
export function isNutritionLivingV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FF_NUTRITION_LIVING_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}
