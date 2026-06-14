import type { AgeGroupId } from "@/lib/nutrition-data";
import type { MealMemoryEntry } from "@/features/nutrition/lib/nutrition-memory";
import { isMealDeprioritized, mealPreferenceScore, pickPreferredMeal } from "@/features/nutrition/lib/meal-recommendation";
import { getIndiaSeason, prioritizeMealsBySeason } from "@/features/nutrition/lib/seasonal-foods";
import { normalizeMealKey } from "@/features/nutrition/lib/nutrition-memory";

export interface TiffinDay {
  dayLabel: string;
  dayIndex: number;
  suggestion: string;
  note?: string;
}

const SCHOOL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

const REGION_TIFFIN_FALLBACK: Record<string, string[]> = {
  indian: [
    "Vegetable paratha + fruit",
    "Idli with chutney",
    "Poha with peanuts",
    "Roti roll with paneer",
    "Curd rice with pickle",
  ],
  south_indian: [
    "Mini idli + sambar",
    "Lemon rice + papad",
    "Dosa fingers + chutney",
    "Curd rice + fruit",
    "Upma + banana",
  ],
  north_indian: [
    "Stuffed paratha + curd",
    "Roti + aloo sabzi",
    "Paneer sandwich",
    "Besan chilla",
    "Dal paratha + fruit",
  ],
  default: [
    "Whole grain wrap + veggies",
    "Rice + dal in insulated box",
    "Pasta with vegetables",
    "Hummus wrap + fruit",
    "Egg or paneer sandwich",
  ],
};

function lunchCandidatesFromPlan(weekLunches: string[]): string[] {
  return weekLunches.filter(Boolean);
}

function fallbackForRegion(foodStyle: string): string[] {
  const key = foodStyle.toLowerCase();
  if (key.includes("south")) return REGION_TIFFIN_FALLBACK.south_indian!;
  if (key.includes("north") || key === "indian" || key === "pan_indian") return REGION_TIFFIN_FALLBACK.north_indian!;
  if (REGION_TIFFIN_FALLBACK[key]) return REGION_TIFFIN_FALLBACK[key]!;
  return REGION_TIFFIN_FALLBACK.default!;
}

function ageAppropriateNote(ageGroupId: AgeGroupId): string | undefined {
  if (ageGroupId.startsWith("infant")) return "Soft textures only — caregiver-led.";
  if (ageGroupId === "toddler_1_3") return "Cut into small pieces; avoid whole nuts.";
  if (ageGroupId === "preschool_3_6") return "Easy-to-open box; include fruit.";
  return "Balanced box: grain + protein + fruit.";
}

export interface TiffinPlannerInput {
  ageGroupId: AgeGroupId;
  foodStyle: string;
  weekLunches: string[];
  memoryEntries?: MealMemoryEntry[];
  refDate?: Date;
}

export function planSchoolTiffinWeek(input: TiffinPlannerInput): TiffinDay[] {
  const { ageGroupId, foodStyle, weekLunches, memoryEntries = [], refDate = new Date() } = input;
  const season = getIndiaSeason(refDate);
  const planPool = prioritizeMealsBySeason(lunchCandidatesFromPlan(weekLunches), season);
  const fallbacks = fallbackForRegion(foodStyle);
  const usedKeys = new Set<string>();
  const ageNote = ageAppropriateNote(ageGroupId);

  return SCHOOL_DAYS.map((dayLabel, dayIndex) => {
    const candidates = [...planPool, ...fallbacks].filter((c) => {
      const key = normalizeMealKey(c);
      if (usedKeys.has(key)) return false;
      if (isMealDeprioritized(c, memoryEntries)) return false;
      return true;
    });

    const picked =
      pickPreferredMeal(candidates, memoryEntries) ??
      candidates[0] ??
      fallbacks[dayIndex % fallbacks.length]!;

    usedKeys.add(normalizeMealKey(picked));

    const score = mealPreferenceScore(picked, memoryEntries);
    const note =
      score >= 2
        ? "Child enjoyed similar meals before"
        : ageNote;

    return { dayLabel, dayIndex, suggestion: picked, note };
  });
}

export function isSchoolAgeBand(ageGroupId: AgeGroupId): boolean {
  return (
    ageGroupId === "preschool_3_6" ||
    ageGroupId === "school_6_10" ||
    ageGroupId === "preteen_10_15"
  );
}
