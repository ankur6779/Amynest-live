/** Deterministic meal → nutrient mapping via normalized keywords. No AI. */

export interface MealNutrientRule {
  keywords: string[];
  nutrients: string[];
}

const RULES: MealNutrientRule[] = [
  { keywords: ["khichdi", "dal khichdi", "moong dal"], nutrients: ["iron", "protein"] },
  { keywords: ["ragi", "finger millet"], nutrients: ["calcium", "iron"] },
  { keywords: ["dal", "lentil", "sambar", "sambhar", "toor", "moong", "masoor"], nutrients: ["protein", "iron"] },
  { keywords: ["palak", "spinach", "saag", "greens"], nutrients: ["iron", "vitamin_a"] },
  { keywords: ["paneer", "curd", "dahi", "yogurt", "milk", "kheer", "lassi"], nutrients: ["calcium", "protein"] },
  { keywords: ["egg", "omelette", "bhurji"], nutrients: ["protein", "vitamin_b12"] },
  { keywords: ["chicken", "mutton", "fish", "prawn", "meat"], nutrients: ["protein", "iron"] },
  { keywords: ["rajma", "chole", "chickpea", "bean"], nutrients: ["protein", "iron"] },
  { keywords: ["fruit", "banana", "mango", "apple", "papaya", "orange", "guava"], nutrients: ["vitamin_c"] },
  { keywords: ["carrot", "pumpkin", "sweet potato", "beet"], nutrients: ["vitamin_a"] },
  { keywords: ["idli", "dosa", "upma", "poha", "paratha", "roti", "chapati", "rice"], nutrients: ["protein", "iron"] },
  { keywords: ["oats", "oat", "porridge", "cereal"], nutrients: ["iron", "protein"] },
  { keywords: ["peanut", "groundnut", "til", "sesame", "nut"], nutrients: ["protein", "iron"] },
  { keywords: ["breast milk", "formula"], nutrients: ["protein"] },
];

const NUTRIENT_LABELS: Record<string, string> = {
  protein: "Protein",
  iron: "Iron",
  calcium: "Calcium",
  vitamin_a: "Vitamin A",
  vitamin_c: "Vitamin C",
  vitamin_b12: "Vitamin B12",
  vitamin_b: "B Vitamins",
};

export function normalizeMealName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s/+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapMealToNutrients(mealName: string): string[] {
  if (!mealName.trim()) return [];
  const normalized = normalizeMealName(mealName);
  const found = new Set<string>();

  for (const rule of RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      for (const n of rule.nutrients) found.add(n);
    }
  }

  if (found.size === 0) {
    found.add("protein");
    found.add("iron");
  }

  return [...found].slice(0, 4);
}

export function nutrientBenefitLabels(nutrientIds: string[]): string[] {
  return nutrientIds.map((id) => NUTRIENT_LABELS[id] ?? id.replace(/_/g, " "));
}

export function getPrimaryMealPhrase(mealName: string): string {
  const parts = mealName.split(/[+/,]/).map((p) => p.trim()).filter(Boolean);
  return parts[0] ?? mealName;
}
