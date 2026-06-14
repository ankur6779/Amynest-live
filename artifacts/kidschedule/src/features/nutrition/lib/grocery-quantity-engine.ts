import type { GroceryCategory } from "@/features/nutrition/lib/operations-constants";
import {
  countIngredientMentions,
  type GroceryUnit,
  type IngredientMentionTotals,
} from "@/features/nutrition/lib/grocery-ingredients";
import { MAX_HOUSEHOLD_SIZE, MIN_HOUSEHOLD_SIZE } from "@/features/nutrition/lib/grocery-household-size";

export interface ScaledGroceryLine {
  item: string;
  category: GroceryCategory;
  quantity: number;
  unit: GroceryUnit;
}

/** Household multiplier: sub-linear scaling for shared staples (C3/H2). */
export function householdMultiplier(familySize: number): number {
  const fs = Math.max(MIN_HOUSEHOLD_SIZE, Math.min(MAX_HOUSEHOLD_SIZE, familySize));
  return 0.45 + fs * 0.2;
}

/** Weekly egg count from household size and egg-meal frequency (C1). */
export function weeklyEggCount(familySize: number, eggMealDays: number): number {
  if (eggMealDays <= 0) return 0;
  const fs = Math.max(MIN_HOUSEHOLD_SIZE, Math.min(MAX_HOUSEHOLD_SIZE, familySize));
  const base = Math.round(fs * 2 + eggMealDays * 0.5);
  return Math.min(36, Math.max(6, base));
}

/** Weekly milk volume in liters (C2). */
export function weeklyMilkLiters(familySize: number, milkMealDays: number): number {
  if (milkMealDays <= 0) return 0;
  const fs = Math.max(MIN_HOUSEHOLD_SIZE, Math.min(MAX_HOUSEHOLD_SIZE, familySize));
  const liters = fs * 1.25 + milkMealDays * 0.1;
  return Math.min(14, Math.max(2, Math.round(liters * 2) / 2));
}

function roundKg(kg: number): number {
  return Math.max(0.5, Math.round(kg * 2) / 2);
}

function roundCount(n: number): number {
  return Math.max(1, Math.round(n));
}

export function scaleMentionTotals(
  totals: IngredientMentionTotals,
  familySize: number,
): ScaledGroceryLine[] {
  const mult = householdMultiplier(familySize);
  const lines: ScaledGroceryLine[] = [];

  const eggs = weeklyEggCount(familySize, totals.eggMealDays);
  if (eggs > 0) {
    lines.push({ item: "Eggs", category: "proteins", quantity: eggs, unit: "count" });
  }

  const milkL = weeklyMilkLiters(familySize, totals.milkMealDays);
  if (milkL > 0) {
    lines.push({ item: "Milk", category: "dairy", quantity: milkL, unit: "L" });
  }

  for (const entry of totals.mentionCounts.values()) {
    const raw = entry.mentions * entry.perMention * mult;
    if (raw <= 0) continue;

    if (entry.unit === "kg") {
      lines.push({
        item: entry.item,
        category: entry.category,
        quantity: roundKg(raw),
        unit: "kg",
      });
    } else {
      lines.push({
        item: entry.item,
        category: entry.category,
        quantity: roundCount(raw),
        unit: "count",
      });
    }
  }

  return lines;
}

export function computeWeeklyGroceryQuantities(
  weekMeals: string[],
  familySize: number,
): ScaledGroceryLine[] {
  return scaleMentionTotals(countIngredientMentions(weekMeals), familySize);
}
