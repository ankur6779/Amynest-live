/**
 * Deterministic meal-option validator + auto-corrector for routine meal blocks.
 * Priority: Safety > Diet > Structure > Variety > Creativity
 */
import { mealOptionViolatesAllergies, parseAllergyList } from "./meal-safety.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";

export type MealOptionsSanitizeCtx = {
  dietType: string;
  allergies?: string | null;
  ageInMonths?: number;
  ageGroup?: string;
  foodStyle?: string | null;
  subCuisine?: string | null;
  goals?: string | null;
  /** Force high-protein rules (also inferred from diet/goals when omitted). */
  highProtein?: boolean;
};

const MEAT_FISH_RE =
  /\b(chicken|mutton|beef|pork|lamb|fish|prawn|shrimp|seafood|salmon|tuna|turkey|keema|bacon|ham|sausage|meat)\b/i;
const EGG_RE =
  /\b(egg|eggs|omelette|omelet|bhurji|anda|mayo|mayonnaise|pancake|waffle)\b/i;
const DAIRY_RE =
  /\b(milk|curd|dahi|paneer|cheese|butter|ghee|yogurt|yoghurt|cream|lassi|kheer|khoya|mawa|whey|ricotta|mozzarella)\b/i;
const HONEY_RE = /\bhoney\b/i;
const GLUTEN_RE =
  /\b(wheat|maida|atta|bread|roti|chapati|paratha|naan|pasta|noodle|semolina|suji|rava|sandwich|biscuit|pizza|burger bun|macaroni|spaghetti|couscous|toast|pancake|waffle)\b/i;
const PLAIN_OATS_RE = /\boats\b/i;
const CERTIFIED_GF_OATS_RE = /\bcertified gf oats\b/i;

const PRIMARY_PROTEIN_RE =
  /\b(egg|paneer|chicken|fish|salmon|cod|turkey|keema|tikka|omelette|bhurji|dal|rajma|chana|chole|lentil|tofu|sattu|sprout|curd|yogurt|milk|grilled|mince|beef|lamb|mutton|cheela|hummus|chickpea|bean|sambar|hung curd|yoghurt|edamame|falafel|salmon|prawn|soya|soy chunk)\b/i;

const OPTIONS_PREFIX_RE = /^([\s\S]*?)Options:\s*/i;

export function parseMealOptionsFromNotes(notes: string | undefined): {
  prefix: string;
  options: string[];
} | null {
  if (!notes || !/Options:/i.test(notes)) return null;
  const match = notes.match(OPTIONS_PREFIX_RE);
  if (!match) return null;
  const prefix = match[1] ?? "";
  const tail = notes.slice(match[0].length);
  const options = tail.split("|").map((s) => s.trim()).filter(Boolean);
  return { prefix, options };
}

export function formatMealOptionsNotes(
  options: string[],
  prefix = "",
): string {
  const head = prefix.trim();
  const body = `Options: ${options.slice(0, 4).join(" | ")}`;
  return head ? `${head} ${body}` : body;
}

function normalizeDiet(dietType: string): string {
  return (dietType ?? "vegetarian").toLowerCase().replace(/-/g, "_").trim();
}

export function isHighProteinMode(ctx: MealOptionsSanitizeCtx): boolean {
  if (ctx.highProtein === true) return true;
  const d = normalizeDiet(ctx.dietType);
  if (d === "high_protein" || d === "high_protein_mixed") return true;
  const g = (ctx.goals ?? "").toLowerCase();
  return /\bhigh[\s-]?protein\b/.test(g);
}

function violatesGluten(text: string, ctx: MealOptionsSanitizeCtx): boolean {
  const lower = text.toLowerCase();
  const allergyGluten = parseAllergyList(ctx.allergies ?? "").includes("gluten");
  const dietGlutenFree =
    normalizeDiet(ctx.dietType) === "gluten_free" || normalizeDiet(ctx.dietType) === "glutenfree";
  if (!allergyGluten && !dietGlutenFree) return false;
  if (GLUTEN_RE.test(lower)) return true;
  if (PLAIN_OATS_RE.test(lower) && !CERTIFIED_GF_OATS_RE.test(lower)) return true;
  return false;
}

function violatesDiet(text: string, ctx: MealOptionsSanitizeCtx): boolean {
  const d = normalizeDiet(ctx.dietType);
  if (violatesGluten(text, ctx)) return true;

  const landMeat =
    /\b(chicken|mutton|beef|pork|lamb|keema|bacon|ham|sausage|meat)\b/i;
  const fishSeafood = /\b(fish|prawn|shrimp|seafood|salmon|tuna|cod)\b/i;

  switch (d) {
    case "vegan":
      return (
        MEAT_FISH_RE.test(text) ||
        EGG_RE.test(text) ||
        DAIRY_RE.test(text) ||
        HONEY_RE.test(text)
      );
    case "vegetarian":
    case "veg":
    case "jain":
    case "sattvik":
      return MEAT_FISH_RE.test(text) || EGG_RE.test(text);
    case "eggetarian":
      return landMeat.test(text) || fishSeafood.test(text);
    case "pescatarian":
      return landMeat.test(text);
    default:
      return false;
  }
}

function isWeakProteinMeal(option: string): boolean {
  const lower = option.toLowerCase();
  const dense =
    /\b(egg|paneer|chicken|fish|rajma|chana|chole|keema|tikka|mutton|beef|lamb|salmon|turkey|sattu|sprout|tofu|hummus|chickpea|omelette|bhurji|grilled|mince|salmon|cod|prawn)\b/i.test(
      lower,
    );
  const dalRice =
    /\b(rice|chawal)\b.*\b(dal|lentil)\b/i.test(lower) ||
    /\b(dal|lentil)\b.*\b(rice|chawal)\b/i.test(lower);
  if (dalRice && !dense) return true;
  const curryBread =
    /\b(naan|roti|chapati|paratha|bread)\b.*\bcurry\b/i.test(lower) ||
    /\bcurry\b.*\b(naan|roti|chapati|paratha|bread)\b/i.test(lower);
  if (curryBread && !dense) return true;
  return false;
}

function lacksPrimaryProtein(option: string): boolean {
  return !PRIMARY_PROTEIN_RE.test(option);
}

/** True when the option is safe for the child's diet, allergies, and protein mode. */
export function isMealOptionCompliant(
  option: string,
  ctx: MealOptionsSanitizeCtx,
): boolean {
  const trimmed = option.trim();
  if (!trimmed) return false;
  if (mealOptionViolatesAllergies(trimmed, ctx.allergies ?? "")) return false;
  if (violatesDiet(trimmed, ctx)) return false;
  if (isHighProteinMode(ctx)) {
    if (lacksPrimaryProtein(trimmed)) return false;
    if (isWeakProteinMeal(trimmed)) return false;
  }
  return true;
}

function safeFallbackPool(ctx: MealOptionsSanitizeCtx): string[] {
  const d = normalizeDiet(ctx.dietType);
  const indian =
    (ctx.foodStyle ?? "").toLowerCase() === "indian" ||
    /\b(indian|north_indian|south_indian|pan_indian|punjabi|gujarati|bengali|maharashtrian)\b/i.test(
      ctx.subCuisine ?? "",
    );

  if (isHighProteinMode(ctx)) {
    if (d === "vegan") {
      return [
        "Tofu scramble with vegetables",
        "Chickpea salad bowl",
        "Lentil soup with rice",
        "Roasted chickpeas with hummus",
      ];
    }
    if (d === "vegetarian" || d === "veg" || d === "eggetarian") {
      return indian
        ? [
            "Moong dal cheela with mint chutney",
            "Paneer bhurji with tomatoes",
            "Boiled chana chaat with lemon",
            "Hung curd with fruits and seeds",
          ]
        : [
            "Scrambled eggs with vegetables",
            "Grilled cheese with tomato",
            "Greek yogurt with berries",
            "Hummus with veggie sticks",
          ];
    }
    return indian
      ? [
          "Egg bhurji with soft vegetables",
          "Chicken tikka with cucumber raita",
          "Grilled paneer cubes with chutney",
          "Fish curry with salad",
        ]
      : [
          "Scrambled eggs with vegetables",
          "Grilled chicken strips",
          "Baked salmon with broccoli",
          "Greek yogurt with berries",
        ];
  }

  if (d === "vegan") {
    return [
      "Oat milk porridge with banana",
      "Lentil soup with rice",
      "Hummus with cucumber sticks",
      "Fruit salad (no honey)",
    ];
  }

  if (d === "vegetarian" || d === "veg" || d === "jain" || d === "sattvik") {
    return indian
      ? [
          "Soft vegetable khichdi",
          "Soft dal with rice",
          "Soft idli with sambar",
          "Fruit with curd",
        ]
      : [
          "Fruit and yogurt bowl",
          "Vegetable soup with rice",
          "Cheese and fruit plate",
          "Mashed potato with vegetables",
        ];
  }

  if (violatesGluten("x", ctx) || parseAllergyList(ctx.allergies ?? "").includes("gluten")) {
    return [
      "Certified GF oats porridge with banana",
      "Scrambled eggs with rice cakes",
      "Grilled chicken with steamed rice",
      "Baked potato with baked beans",
    ];
  }

  return indian
    ? [
        "Soft vegetable khichdi",
        "Soft dal with rice",
        "Fruit with curd",
        "Mashed banana",
      ]
    : [
        "Scrambled eggs with toast",
        "Chicken soup with vegetables",
        "Fruit and yogurt bowl",
        "Mashed potato with peas",
      ];
}

/**
 * Replace invalid options only; pad to exactly 4 compliant options.
 * Never returns partially valid blocks.
 */
export function sanitizeMealOptions(
  options: string[],
  ctx: MealOptionsSanitizeCtx,
  usedNames: Set<string> = new Set(),
): string[] {
  const pool = safeFallbackPool(ctx);
  const out: string[] = [];

  for (const raw of options) {
    const opt = raw.trim();
    if (
      opt &&
      isMealOptionCompliant(opt, ctx) &&
      !usedNames.has(opt.toLowerCase()) &&
      out.length < 4
    ) {
      out.push(opt);
      usedNames.add(opt.toLowerCase());
    }
  }

  for (const fb of pool) {
    if (out.length >= 4) break;
    if (
      isMealOptionCompliant(fb, ctx) &&
      !usedNames.has(fb.toLowerCase()) &&
      !out.some((o) => o.toLowerCase() === fb.toLowerCase())
    ) {
      out.push(fb);
      usedNames.add(fb.toLowerCase());
    }
  }

  // Last-resort: generic safe names (always diet/allergy re-checked)
  const generic = [
    "Soft vegetable khichdi",
    "Fruit mash",
    "Soft dal with rice",
    "Steamed vegetables",
  ];
  for (const g of generic) {
    if (out.length >= 4) break;
    if (isMealOptionCompliant(g, ctx) && !usedNames.has(g.toLowerCase())) {
      out.push(g);
      usedNames.add(g.toLowerCase());
    }
  }

  return out.slice(0, 4);
}

export function sanitizeMealOptionsInRoutineItems<
  T extends Pick<RoutineScheduleItem, "activity" | "category" | "notes" | "dishes">,
>(
  items: T[],
  ctx: MealOptionsSanitizeCtx,
): { items: T[]; corrections: string[] } {
  if (ctx.ageGroup === "infant") {
    return { items, corrections: [] };
  }

  const corrections: string[] = [];
  const usedDayNames = new Set<string>();

  const next = items.map((it) => {
    const cat = (it.category ?? "").toLowerCase();
    if (cat !== "meal" && cat !== "tiffin") return it;

    const parsed = parseMealOptionsFromNotes(it.notes ?? "");
    const fromDishes = (it.dishes ?? []).map(String);
    const source = parsed?.options.length ? parsed.options : fromDishes;

    if (!source.length) return it;

    const sanitized = sanitizeMealOptions(source, ctx, usedDayNames);
    if (sanitized.length < 4) {
      corrections.push(`meal-safety: could not fill 4 options for "${it.activity}"`);
    }

    for (const s of sanitized) usedDayNames.add(s.toLowerCase());

    const changed =
      sanitized.length !== source.length ||
      sanitized.some((s, i) => s.toLowerCase() !== (source[i] ?? "").toLowerCase());

    if (changed) {
      corrections.push(`meal-safety: corrected options for "${it.activity}"`);
    }

    const notes = formatMealOptionsNotes(sanitized, parsed?.prefix ?? "");
    return { ...it, notes, dishes: sanitized };
  });

  return { items: next, corrections };
}
