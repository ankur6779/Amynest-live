import type { GroceryCategory } from "@/features/nutrition/lib/operations-constants";
import { normalizeMealName } from "@/features/nutrition/lib/meal-nutrient-map";

export interface IngredientRule {
  keywords: string[];
  item: string;
  category: GroceryCategory;
  /** Base units added per meal mention. */
  baseQty: number;
  heavyUnit?: "kg";
}

export const INGREDIENT_RULES: IngredientRule[] = [
  { keywords: ["tomato"], item: "Tomato", category: "vegetables", baseQty: 2 },
  { keywords: ["onion"], item: "Onion", category: "vegetables", baseQty: 1 },
  { keywords: ["palak", "spinach", "saag", "greens"], item: "Spinach / Greens", category: "vegetables", baseQty: 1 },
  { keywords: ["potato", "aloo"], item: "Potato", category: "vegetables", baseQty: 2 },
  { keywords: ["carrot", "gajar"], item: "Carrot", category: "vegetables", baseQty: 1 },
  { keywords: ["bhindi", "okra"], item: "Bhindi", category: "vegetables", baseQty: 1 },
  { keywords: ["beans", "gobi", "cauliflower", "cabbage", "sabzi", "vegetable"], item: "Mixed vegetables", category: "vegetables", baseQty: 1 },
  { keywords: ["pumpkin", "lauki", "dudhi"], item: "Bottle gourd / Pumpkin", category: "vegetables", baseQty: 1 },
  { keywords: ["cucumber", "kheera"], item: "Cucumber", category: "vegetables", baseQty: 1 },
  { keywords: ["banana"], item: "Banana", category: "fruits", baseQty: 3 },
  { keywords: ["apple"], item: "Apple", category: "fruits", baseQty: 2 },
  { keywords: ["mango"], item: "Mango", category: "fruits", baseQty: 2 },
  { keywords: ["papaya"], item: "Papaya", category: "fruits", baseQty: 1 },
  { keywords: ["orange", "guava", "fruit", "seasonal fruit"], item: "Seasonal fruit", category: "fruits", baseQty: 2 },
  { keywords: ["watermelon"], item: "Watermelon", category: "fruits", baseQty: 1 },
  { keywords: ["dal", "lentil", "moong", "toor", "masoor", "sambar", "sambhar", "rajma", "chole", "chickpea"], item: "Dal / Pulses", category: "proteins", baseQty: 1, heavyUnit: "kg" },
  { keywords: ["egg"], item: "Eggs", category: "proteins", baseQty: 6 },
  { keywords: ["chicken", "mutton", "fish", "prawn", "meat", "paneer"], item: "Protein (paneer / egg / meat)", category: "proteins", baseQty: 1, heavyUnit: "kg" },
  { keywords: ["peanut", "groundnut", "sprout"], item: "Peanuts / Sprouts", category: "proteins", baseQty: 1 },
  { keywords: ["rice", "chawal"], item: "Rice", category: "grains", baseQty: 1, heavyUnit: "kg" },
  { keywords: ["roti", "chapati", "paratha", "wheat", "atta"], item: "Whole wheat flour (atta)", category: "grains", baseQty: 1, heavyUnit: "kg" },
  { keywords: ["ragi", "millet", "oats", "poha", "upma", "idli", "dosa", "khichdi"], item: "Grains / millets", category: "grains", baseQty: 1, heavyUnit: "kg" },
  { keywords: ["bread", "toast"], item: "Bread", category: "grains", baseQty: 1 },
  { keywords: ["milk"], item: "Milk", category: "dairy", baseQty: 2 },
  { keywords: ["curd", "dahi", "yogurt", "lassi"], item: "Curd (dahi)", category: "dairy", baseQty: 1 },
  { keywords: ["paneer", "cheese"], item: "Paneer", category: "dairy", baseQty: 1 },
  { keywords: ["ghee", "butter"], item: "Ghee / Butter", category: "dairy", baseQty: 1 },
];

export function extractIngredientsFromMeal(mealText: string): Array<{ item: string; category: GroceryCategory; qty: number; heavyUnit?: "kg" }> {
  if (!mealText.trim()) return [];
  const normalized = normalizeMealName(mealText);
  const found = new Map<string, { item: string; category: GroceryCategory; qty: number; heavyUnit?: "kg" }>();

  for (const rule of INGREDIENT_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      const existing = found.get(rule.item);
      if (existing) {
        existing.qty += rule.baseQty;
      } else {
        found.set(rule.item, {
          item: rule.item,
          category: rule.category,
          qty: rule.baseQty,
          heavyUnit: rule.heavyUnit,
        });
      }
    }
  }

  return [...found.values()];
}

export function extractIngredientsFromWeek(meals: string[]): ReturnType<typeof extractIngredientsFromMeal> {
  const aggregated = new Map<string, { item: string; category: GroceryCategory; qty: number; heavyUnit?: "kg" }>();

  for (const meal of meals) {
    for (const ing of extractIngredientsFromMeal(meal)) {
      const existing = aggregated.get(ing.item);
      if (existing) existing.qty += ing.qty;
      else aggregated.set(ing.item, { ...ing });
    }
  }

  return [...aggregated.values()];
}
