import type { GroceryCategory } from "@/features/nutrition/lib/operations-constants";
import { GROCERY_CATEGORIES } from "@/features/nutrition/lib/operations-constants";
import type { GroceryUnit } from "@/features/nutrition/lib/grocery-ingredients";
import { computeWeeklyGroceryQuantities } from "@/features/nutrition/lib/grocery-quantity-engine";
import type { MealMemoryEntry } from "@/features/nutrition/lib/nutrition-memory";
import { isMealDeprioritized, mealPreferenceScore } from "@/features/nutrition/lib/meal-recommendation";

export interface GroceryItem {
  id: string;
  name: string;
  category: GroceryCategory;
  quantity: number;
  unit: GroceryUnit;
  display: string;
}

export interface GroupedGroceryList {
  category: GroceryCategory;
  label: string;
  items: GroceryItem[];
}

const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  vegetables: "Vegetables",
  fruits: "Fruits",
  proteins: "Proteins",
  grains: "Grains",
  dairy: "Dairy",
};

export interface GroceryGeneratorInput {
  weekMeals: string[];
  familySize: number;
  memoryEntries?: MealMemoryEntry[];
}

function memoryScaleFactor(entries: MealMemoryEntry[], weekMeals: string[]): number {
  if (!entries.length || !weekMeals.length) return 1;
  let score = 0;
  for (const meal of weekMeals) {
    score += mealPreferenceScore(meal, entries);
    if (isMealDeprioritized(meal, entries)) score -= 2;
  }
  const avg = score / weekMeals.length;
  if (avg >= 2) return 1.1;
  if (avg <= -2) return 0.85;
  return 1;
}

/** Format quantity with explicit units (C2/H3). */
export function formatGroceryDisplay(name: string, quantity: number, unit: GroceryUnit): string {
  if (unit === "kg") {
    const kg = Number.isInteger(quantity) ? quantity : quantity.toFixed(1).replace(/\.0$/, "");
    return `${name} × ${kg} kg`;
  }
  if (unit === "L") {
    const liters = Number.isInteger(quantity) ? quantity : quantity.toFixed(1).replace(/\.0$/, "");
    return `${name} × ${liters} L`;
  }
  return `${name} × ${Math.round(quantity)}`;
}

function itemId(name: string, category: GroceryCategory): string {
  return `${category}:${name.toLowerCase().replace(/\s+/g, "-")}`;
}

function applyMemoryScale(quantity: number, factor: number, unit: GroceryUnit): number {
  if (factor === 1) return quantity;
  if (unit === "kg" || unit === "L") {
    return Math.max(unit === "kg" ? 0.5 : 1, Math.round(quantity * factor * 2) / 2);
  }
  return Math.max(1, Math.round(quantity * factor));
}

export function generateGroceryList(input: GroceryGeneratorInput): GroupedGroceryList[] {
  const { weekMeals, familySize, memoryEntries = [] } = input;
  const memoryFactor = memoryScaleFactor(memoryEntries, weekMeals);
  const scaled = computeWeeklyGroceryQuantities(weekMeals, familySize);

  const byCategory = new Map<GroceryCategory, GroceryItem[]>();

  for (const line of scaled) {
    const quantity = applyMemoryScale(line.quantity, memoryFactor, line.unit);
    const item: GroceryItem = {
      id: itemId(line.item, line.category),
      name: line.item,
      category: line.category,
      quantity,
      unit: line.unit,
      display: formatGroceryDisplay(line.item, quantity, line.unit),
    };
    const list = byCategory.get(line.category) ?? [];
    list.push(item);
    byCategory.set(line.category, list);
  }

  return GROCERY_CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: (byCategory.get(category) ?? []).sort((a, b) => b.quantity - a.quantity),
  })).filter((g) => g.items.length > 0);
}

export function mergeGroceryLists(listSets: GroupedGroceryList[][]): GroupedGroceryList[] {
  const map = new Map<string, GroceryItem>();

  for (const group of listSets.flat()) {
    for (const item of group.items) {
      const existing = map.get(item.id);
      if (existing) {
        existing.quantity += item.quantity;
        existing.display = formatGroceryDisplay(existing.name, existing.quantity, existing.unit);
      } else {
        map.set(item.id, { ...item });
      }
    }
  }

  const byCategory = new Map<GroceryCategory, GroceryItem[]>();
  for (const item of map.values()) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  return GROCERY_CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: (byCategory.get(category) ?? []).sort((a, b) => b.quantity - a.quantity),
  })).filter((g) => g.items.length > 0);
}
