import type { GroceryCategory } from "@/features/nutrition/lib/operations-constants";
import { GROCERY_CATEGORIES } from "@/features/nutrition/lib/operations-constants";
import { extractIngredientsFromWeek } from "@/features/nutrition/lib/grocery-ingredients";
import type { MealMemoryEntry } from "@/features/nutrition/lib/nutrition-memory";
import { isMealDeprioritized, mealPreferenceScore } from "@/features/nutrition/lib/meal-recommendation";

export interface GroceryItem {
  id: string;
  name: string;
  category: GroceryCategory;
  quantity: number;
  display: string;
  heavyUnit?: "kg";
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

function formatQuantity(name: string, qty: number, heavyUnit?: "kg"): string {
  const rounded = Math.max(1, Math.round(qty));
  if (heavyUnit === "kg" && rounded >= 3) {
    const kg = Math.max(1, Math.round(rounded / 3));
    return `${name} × ${kg} kg`;
  }
  return `${name} × ${rounded}`;
}

function itemId(name: string, category: GroceryCategory): string {
  return `${category}:${name.toLowerCase().replace(/\s+/g, "-")}`;
}

export function generateGroceryList(input: GroceryGeneratorInput): GroupedGroceryList[] {
  const { weekMeals, familySize, memoryEntries = [] } = input;
  const scale = Math.max(1, familySize) * memoryScaleFactor(memoryEntries, weekMeals);
  const raw = extractIngredientsFromWeek(weekMeals);

  const byCategory = new Map<GroceryCategory, GroceryItem[]>();

  for (const ing of raw) {
    const quantity = Math.max(1, Math.round(ing.qty * scale));
    const item: GroceryItem = {
      id: itemId(ing.item, ing.category),
      name: ing.item,
      category: ing.category,
      quantity,
      heavyUnit: ing.heavyUnit,
      display: formatQuantity(ing.item, quantity, ing.heavyUnit),
    };
    const list = byCategory.get(ing.category) ?? [];
    list.push(item);
    byCategory.set(ing.category, list);
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
        existing.display = formatQuantity(existing.name, existing.quantity, existing.heavyUnit);
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
