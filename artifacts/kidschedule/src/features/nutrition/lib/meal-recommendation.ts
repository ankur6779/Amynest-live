import { normalizeMealKey, countSkippedRecently, countLoved } from "@/features/nutrition/lib/nutrition-memory";
import type { MealMemoryEntry } from "@/features/nutrition/lib/nutrition-memory";
import type { DayPlan } from "@/lib/nutrition-data";

export function mealPreferenceScore(mealName: string, entries: MealMemoryEntry[]): number {
  const key = normalizeMealKey(mealName);
  const loved = countLoved(entries, key);
  const skipped = countSkippedRecently(entries, key);
  return loved * 2 - skipped * 3;
}

export function isMealDeprioritized(mealName: string, entries: MealMemoryEntry[]): boolean {
  const key = normalizeMealKey(mealName);
  return countSkippedRecently(entries, key) >= 2;
}

export function pickPreferredMeal(
  candidates: string[],
  entries: MealMemoryEntry[],
): string | null {
  const viable = candidates.filter((c) => c && !isMealDeprioritized(c, entries));
  const pool = viable.length > 0 ? viable : candidates.filter(Boolean);
  if (pool.length === 0) return null;

  return pool.sort(
    (a, b) => mealPreferenceScore(b, entries) - mealPreferenceScore(a, entries),
  )[0]!;
}

export function pickTonightDinner(
  days: DayPlan[],
  dayIdx: number,
  isVeg: boolean,
  entries: MealMemoryEntry[],
): { mealName: string | null; dayLabel: string | null; dayIndex: number } {
  if (!days.length) return { mealName: null, dayLabel: null, dayIndex: dayIdx };

  const candidates: Array<{ mealName: string; dayLabel: string; dayIndex: number }> = [];

  for (let offset = 0; offset < days.length; offset++) {
    const idx = (dayIdx + offset) % days.length;
    const day = days[idx]!;
    const meal = isVeg ? day.veg : day.nonVeg;
    const dinner = meal.dinner;
    if (dinner) {
      candidates.push({ mealName: dinner, dayLabel: day.day, dayIndex: idx });
    }
  }

  const names = candidates.map((c) => c.mealName);
  const preferred = pickPreferredMeal(names, entries);
  const match = candidates.find((c) => c.mealName === preferred) ?? candidates[0];

  return match
    ? { mealName: match.mealName, dayLabel: match.dayLabel, dayIndex: match.dayIndex }
    : { mealName: null, dayLabel: null, dayIndex: dayIdx };
}

export function reorderMealSlotOptions(
  meals: string[],
  entries: MealMemoryEntry[],
): string[] {
  return [...meals].sort(
    (a, b) => mealPreferenceScore(b, entries) - mealPreferenceScore(a, entries),
  );
}

export function filterPlanDayMeals(
  dayMeals: Record<string, string | undefined>,
  entries: MealMemoryEntry[],
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = { ...dayMeals };

  for (const [slot, name] of Object.entries(dayMeals)) {
    if (!name || !isMealDeprioritized(name, entries)) continue;
    out[slot] = `${name} (try a smaller portion)`;
  }

  return out;
}
