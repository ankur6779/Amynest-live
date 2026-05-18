import { chatCompletionWithTimeout } from "../openai-chat.js";
import {
  getAgeBand,
  buildAgeSafetyPromptBlock,
  validateAndEnrichMeal,
} from "../../lib/meal-safety.js";

const REGION_LABEL: Record<string, string> = {
  north: "north",
  south: "south",
  west: "west",
  east: "east",
  all: "all",
  north_indian: "north",
  south_indian: "south",
  maharashtrian: "west",
  gujarati: "west",
  bengali: "east",
  punjabi: "north",
  pan_indian: "all",
  global: "all",
  western: "western",
  asian: "asian",
  middle_eastern: "middle_eastern",
  vegetarian: "vegetarian",
  mixed: "all",
  indian: "all",
};

const ALLOWED_TYPES = new Set(["breakfast", "lunch", "snack", "tiffin"]);

function buildCuisineLabel(region: string): string {
  const MAP: Record<string, string> = {
    north_indian: "North Indian",
    south_indian: "South Indian",
    bengali: "Bengali",
    gujarati: "Gujarati",
    maharashtrian: "Maharashtrian",
    punjabi: "Punjabi",
    pan_indian: "Pan-Indian",
    indian: "Indian",
    global: "Global / Continental",
    western: "Western",
    asian: "Asian",
    middle_eastern: "Middle Eastern",
    vegetarian: "Vegetarian",
    mixed: "Mixed",
  };
  return MAP[region] ?? region;
}

function parseCuisines(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function buildMealPrompt(
  count: number,
  region: string,
  type: string,
  isVeg?: boolean,
  country?: string,
): string {
  const vegLine =
    isVeg === true
      ? "\n- All meals must be strictly vegetarian (no egg, no meat)."
      : isVeg === false
        ? "\n- Include non-vegetarian options where natural."
        : "";
  const cuisines = parseCuisines(region);
  const primaryLabel = buildCuisineLabel(cuisines[0] ?? "pan_indian");
  const countryLine = country ? `\n- User country: ${country}` : "";
  return `Generate meal dataset for a parenting app "AmyNest".
Output ONLY valid JSON object with a meals array. Count: ${count}. Type: ${type}. Cuisine: ${primaryLabel}${countryLine}${vegLine}`;
}

export async function runMealsGenerateAi(input: {
  count: number;
  region: string;
  type: string;
  isVeg?: boolean;
}): Promise<{ meals: unknown[]; cached: false }> {
  const prompt = buildMealPrompt(input.count, input.region, input.type, input.isVeg);
  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_completion_tokens: 2000,
      response_format: { type: "json_object" },
    },
    25_000,
  );
  if (!outcome.content) throw new Error(outcome.error ?? "ai_empty");

  let parsed: unknown = JSON.parse(outcome.content);
  let meals: unknown[] = [];
  if (Array.isArray(parsed)) meals = parsed;
  else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const found = Object.values(obj).find((v) => Array.isArray(v));
    meals = (found as unknown[]) ?? [];
  }
  if (meals.length === 0) throw new Error("no_meals");

  const SAFE_TAGS = new Set([
    "quick",
    "healthy",
    "veg",
    "non-veg",
    "protein",
    "sweet",
    "spicy",
    "light",
    "heavy",
    "kids",
    "tiffin",
  ]);
  const type = ALLOWED_TYPES.has(input.type) ? input.type : "breakfast";
  const sanitised = meals.slice(0, 8).map((m) => {
    if (!m || typeof m !== "object") return null;
    const o = m as Record<string, unknown>;
    return {
      title: String(o.title ?? "").slice(0, 80),
      type: ALLOWED_TYPES.has(String(o.type)) ? String(o.type) : type,
      region: String(o.region ?? input.region).slice(0, 40),
      ingredients: (Array.isArray(o.ingredients) ? o.ingredients : [])
        .slice(0, 7)
        .map((i) => String(i).slice(0, 40)),
      time: String(o.time ?? "").slice(0, 20),
      calories: Math.min(1200, Math.max(50, Number(o.calories) || 200)),
      tags: (Array.isArray(o.tags) ? o.tags : [])
        .slice(0, 6)
        .map((t) => String(t).toLowerCase().slice(0, 20))
        .filter((t) => SAFE_TAGS.has(t)),
      steps: (Array.isArray(o.steps) ? o.steps : [])
        .slice(0, 5)
        .map((s) => String(s).slice(0, 300)),
      imageKeyword: String(o.imageKeyword ?? "").slice(0, 60),
    };
  }).filter(Boolean);

  return { meals: sanitised, cached: false };
}

export async function runMealsAiGenerate(input: {
  prompt: string;
  region: string;
  audience: string;
  childAgeMonths?: number;
  allergies: string;
  dietType: string;
}): Promise<{ meals: unknown[]; amyMessage: string; ageBand?: string }> {
  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Amy, a helpful cooking assistant for parents. You only generate meal recipes. You output strict JSON only.",
        },
        { role: "user", content: input.prompt },
      ],
      temperature: 0.85,
      max_completion_tokens: 2500,
      response_format: { type: "json_object" },
    },
    30_000,
  );
  if (!outcome.content) throw new Error(outcome.error ?? "ai_empty");

  const parsed = JSON.parse(outcome.content) as Record<string, unknown>;
  const rawMeals = Array.isArray(parsed.meals)
    ? parsed.meals
    : (Object.values(parsed).find((v) => Array.isArray(v)) as unknown[]) ?? [];
  if (rawMeals.length === 0) throw new Error("no_meals");

  let amyMessage = "Amy has suggested these meals just for you!";
  if (typeof parsed.amyMessage === "string" && parsed.amyMessage.trim()) {
    amyMessage = String(parsed.amyMessage).slice(0, 180);
  }

  const meals = rawMeals.slice(0, 6).map((m, idx) => {
    if (!m || typeof m !== "object") return null;
    const o = m as Record<string, unknown>;
    const title = String(o.title ?? "Meal").slice(0, 80);
    const enrichment =
      input.childAgeMonths != null
        ? validateAndEnrichMeal(
            {
              title,
              ingredients: (Array.isArray(o.ingredients) ? o.ingredients : []).map(String),
              tags: (Array.isArray(o.tags) ? o.tags : []).map(String),
              isVeg: o.isVeg === true,
            },
            input.childAgeMonths,
            input.allergies,
            input.dietType,
          )
        : { safetyBadges: [] as string[], whyThisMeal: "", safetyWarning: undefined };
    return {
      id: `meal-${idx}`,
      title,
      emoji: typeof o.emoji === "string" ? o.emoji.slice(0, 4) : "🍱",
      ingredients: (Array.isArray(o.ingredients) ? o.ingredients : []).slice(0, 8),
      steps: (Array.isArray(o.steps) ? o.steps : []).slice(0, 6),
      prepMinutes: Number(o.prepMinutes) || 15,
      calories: Number(o.calories) || 200,
      tags: Array.isArray(o.tags) ? o.tags : [],
      isVeg: o.isVeg === true,
      region: input.region,
      category: input.audience,
      safetyBadges: enrichment.safetyBadges,
      whyThisMeal: enrichment.whyThisMeal,
      ...(enrichment.safetyWarning ? { safetyWarning: enrichment.safetyWarning } : {}),
    };
  }).filter(Boolean);

  const ageBand =
    input.childAgeMonths != null ? getAgeBand(input.childAgeMonths) : undefined;
  return { meals, amyMessage, ...(ageBand ? { ageBand } : {}) };
}

export async function runMealsWeekPlan(input: {
  prompt: string;
}): Promise<{ plan: unknown[]; cached: false }> {
  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a pediatric nutrition AI. Output ONLY strict JSON, no prose.",
        },
        { role: "user", content: input.prompt },
      ],
      temperature: 0.7,
      max_completion_tokens: 3000,
      response_format: { type: "json_object" },
    },
    35_000,
  );
  if (!outcome.content) throw new Error(outcome.error ?? "ai_empty");
  const obj = JSON.parse(outcome.content) as Record<string, unknown>;
  const weekPlan = Array.isArray(obj.week_plan) ? obj.week_plan : [];
  if (!weekPlan.length) throw new Error("empty_plan");
  return { plan: weekPlan, cached: false };
}

export async function runMealsFamilyPortions(input: {
  prompt: string;
  mealName: string;
}): Promise<Record<string, unknown> & { cached: false }> {
  const outcome = await chatCompletionWithTimeout(
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a pediatric nutrition expert. Output ONLY strict JSON.",
        },
        { role: "user", content: input.prompt },
      ],
      temperature: 0.3,
      max_completion_tokens: 500,
      response_format: { type: "json_object" },
    },
    15_000,
  );
  if (!outcome.content) throw new Error(outcome.error ?? "ai_empty");
  const obj = JSON.parse(outcome.content) as Record<string, unknown>;
  const portions = (obj.portions ?? {}) as Record<string, Record<string, unknown>>;
  return {
    meal: String(obj.meal ?? input.mealName).slice(0, 100),
    portions: {
      "6_12m": {
        amount: String(portions["6_12m"]?.amount ?? "—").slice(0, 80),
        texture: portions["6_12m"]?.texture
          ? String(portions["6_12m"]?.texture).slice(0, 60)
          : null,
      },
      "1_3y": {
        amount: String(portions["1_3y"]?.amount ?? "—").slice(0, 80),
        texture: portions["1_3y"]?.texture
          ? String(portions["1_3y"]?.texture).slice(0, 60)
          : null,
      },
      "4_8y": {
        amount: String(portions["4_8y"]?.amount ?? "—").slice(0, 80),
        texture: portions["4_8y"]?.texture
          ? String(portions["4_8y"]?.texture).slice(0, 60)
          : null,
      },
      adult: {
        amount: String(portions.adult?.amount ?? "—").slice(0, 80),
        texture: null,
      },
    },
    feeding_tip: obj.feeding_tip ? String(obj.feeding_tip).slice(0, 150) : null,
    allergy_note: obj.allergy_note ? String(obj.allergy_note).slice(0, 250) : null,
    cached: false,
  };
}
