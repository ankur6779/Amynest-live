import type { GroceryCategory } from "@/features/nutrition/lib/operations-constants";
import { normalizeMealName } from "@/features/nutrition/lib/meal-nutrient-map";
import type { NutritionCountryProfile } from "@workspace/nutrition-localization";

export type GroceryUnit = "kg" | "L" | "count";

export interface IngredientRule {
  keywords: string[];
  item: string;
  category: GroceryCategory;
  unit: GroceryUnit;
  /** Per meal-mention contribution before household scaling (not used for eggs). */
  perMention: number;
}

/**
 * Rules ordered most-specific first. Paneer appears only under dairy (H1).
 * Generic fruit/vegetable keywords removed (H4).
 */
export const INGREDIENT_RULES: IngredientRule[] = [
  { keywords: ["tomato"], item: "Tomato", category: "vegetables", unit: "count", perMention: 0.5 },
  { keywords: ["onion"], item: "Onion", category: "vegetables", unit: "count", perMention: 0.35 },
  { keywords: ["palak", "spinach", "saag"], item: "Spinach / Greens", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["potato", "aloo"], item: "Potato", category: "vegetables", unit: "count", perMention: 0.4 },
  { keywords: ["carrot", "gajar"], item: "Carrot", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["bhindi", "okra"], item: "Bhindi", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["gobi", "cauliflower"], item: "Cauliflower", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["cabbage"], item: "Cabbage", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["green beans", "french beans"], item: "Green beans", category: "vegetables", unit: "count", perMention: 0.2 },
  { keywords: ["mixed vegetable", "vegetable khichdi", "vegetable pulao"], item: "Mixed vegetables", category: "vegetables", unit: "count", perMention: 0.3 },
  { keywords: ["pumpkin", "lauki", "dudhi"], item: "Bottle gourd / Pumpkin", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["cucumber", "kheera"], item: "Cucumber", category: "vegetables", unit: "count", perMention: 0.2 },
  { keywords: ["banana"], item: "Banana", category: "fruits", unit: "count", perMention: 0.4 },
  { keywords: ["apple"], item: "Apple", category: "fruits", unit: "count", perMention: 0.35 },
  { keywords: ["mango"], item: "Mango", category: "fruits", unit: "count", perMention: 0.35 },
  { keywords: ["papaya"], item: "Papaya", category: "fruits", unit: "count", perMention: 0.25 },
  { keywords: ["orange"], item: "Orange", category: "fruits", unit: "count", perMention: 0.3 },
  { keywords: ["guava"], item: "Guava", category: "fruits", unit: "count", perMention: 0.25 },
  { keywords: ["seasonal fruit"], item: "Seasonal fruit", category: "fruits", unit: "count", perMention: 0.25 },
  { keywords: ["watermelon"], item: "Watermelon", category: "fruits", unit: "count", perMention: 0.2 },
  { keywords: ["dal", "lentil", "moong", "toor", "masoor", "sambar", "sambhar", "rajma", "chole", "chickpea"], item: "Dal / Pulses", category: "proteins", unit: "kg", perMention: 0.18 },
  { keywords: ["chicken", "mutton", "fish", "prawn", "meat"], item: "Protein (chicken / fish / meat)", category: "proteins", unit: "kg", perMention: 0.12 },
  { keywords: ["peanut", "groundnut", "sprout"], item: "Peanuts / Sprouts", category: "proteins", unit: "count", perMention: 0.2 },
  { keywords: ["rice", "chawal"], item: "Rice", category: "grains", unit: "kg", perMention: 0.35 },
  { keywords: ["roti", "chapati", "paratha", "wheat", "atta"], item: "Whole wheat flour (atta)", category: "grains", unit: "kg", perMention: 0.12 },
  { keywords: ["ragi", "millet", "oats", "poha", "upma", "idli", "dosa", "khichdi"], item: "Grains / millets", category: "grains", unit: "kg", perMention: 0.1 },
  { keywords: ["bread", "toast"], item: "Bread", category: "grains", unit: "count", perMention: 0.15 },
  { keywords: ["curd", "dahi", "yogurt", "lassi"], item: "Curd (dahi)", category: "dairy", unit: "count", perMention: 0.2 },
  { keywords: ["paneer", "cheese"], item: "Paneer", category: "dairy", unit: "kg", perMention: 0.08 },
  { keywords: ["ghee", "butter"], item: "Ghee / Butter", category: "dairy", unit: "count", perMention: 0.15 },
];

export function getIngredientRulesForProfile(profile: NutritionCountryProfile): IngredientRule[] {
  return profile.groceryKeywordPack.map((pack) => ({
    keywords: pack.keywords,
    item: pack.item,
    category: pack.category,
    unit: pack.unit,
    perMention: pack.perMention,
  }));
}

export interface IngredientMentionTotals {
  /** Item → number of meal slots that mentioned this ingredient. */
  mentionCounts: Map<string, { item: string; category: GroceryCategory; unit: GroceryUnit; perMention: number; mentions: number }>;
  eggMealDays: number;
  milkMealDays: number;
}

function mealMentionsEgg(normalized: string): boolean {
  return /\begg\b|omelette|bhurji/.test(normalized);
}

function mealMentionsMilk(normalized: string): boolean {
  return /\bmilk\b/.test(normalized);
}

export function countIngredientMentions(
  weekMeals: string[],
  rules: IngredientRule[] = INGREDIENT_RULES,
): IngredientMentionTotals {
  const mentionCounts = new Map<
    string,
    { item: string; category: GroceryCategory; unit: GroceryUnit; perMention: number; mentions: number }
  >();
  let eggMealDays = 0;
  let milkMealDays = 0;

  for (const mealText of weekMeals) {
    if (!mealText.trim()) continue;
    const normalized = normalizeMealName(mealText);
    if (mealMentionsEgg(normalized)) eggMealDays += 1;
    if (mealMentionsMilk(normalized)) milkMealDays += 1;

    const matchedThisMeal = new Set<string>();
    for (const rule of rules) {
      if (!rule.keywords.some((kw) => normalized.includes(kw))) continue;
      if (matchedThisMeal.has(rule.item)) continue;
      matchedThisMeal.add(rule.item);

      const existing = mentionCounts.get(rule.item);
      if (existing) {
        existing.mentions += 1;
      } else {
        mentionCounts.set(rule.item, {
          item: rule.item,
          category: rule.category,
          unit: rule.unit,
          perMention: rule.perMention,
          mentions: 1,
        });
      }
    }
  }

  return { mentionCounts, eggMealDays, milkMealDays };
}

/** @deprecated Use countIngredientMentions — kept for legacy tests during migration. */
export function extractIngredientsFromMeal(mealText: string): Array<{
  item: string;
  category: GroceryCategory;
  qty: number;
  unit: GroceryUnit;
}> {
  const { mentionCounts } = countIngredientMentions([mealText]);
  return [...mentionCounts.values()].map((m) => ({
    item: m.item,
    category: m.category,
    qty: m.perMention,
    unit: m.unit,
  }));
}

/** @deprecated Use countIngredientMentions — kept for legacy tests during migration. */
export function extractIngredientsFromWeek(meals: string[]): ReturnType<typeof extractIngredientsFromMeal> {
  const { mentionCounts } = countIngredientMentions(meals);
  return [...mentionCounts.values()].map((m) => ({
    item: m.item,
    category: m.category,
    qty: m.mentions * m.perMention,
    unit: m.unit,
  }));
}
