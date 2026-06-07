import { logger } from "./logger.js";
import {
  validateAndEnrichMeal,
  assessMealAgeSafety,
} from "./meal-safety.js";

const AI_GENERATE_GRADIENTS: [string, string][] = [
  ["#FF9A9E", "#FECFEF"],
  ["#A18CD1", "#FBC2EB"],
  ["#FFECD2", "#FCB69F"],
  ["#A1C4FD", "#C2E9FB"],
  ["#D4FC79", "#96E6A1"],
  ["#FBC2EB", "#A6C1EE"],
  ["#FDDB92", "#D1FDFF"],
  ["#E0C3FC", "#8EC5FC"],
];

const DEFAULT_EMOJIS = ["🍱", "🥘", "🍛", "🥗", "🫓", "🥙", "🍲", "🥚", "🧆", "🥞", "🫕", "🥣", "🍜", "🥦", "🫔"];
const SAFE_TAGS = new Set(["quick", "healthy", "veg", "non-veg", "protein", "sweet", "spicy", "light", "heavy", "kids", "tiffin"]);

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "meal";
}

export type MealsAiGeneratePollContext = {
  childAgeMonths?: number | null;
  allergies: string;
  dietType: string;
  region: string;
  audience: string;
};

/** Shared sync + poll response shaping (age safety + enrichment). */
export function buildMealsAiGenerateApiBody(
  rawResult: unknown,
  ctx: MealsAiGeneratePollContext,
): Record<string, unknown> {
  const ai = rawResult as { meals: Array<Record<string, unknown>>; amyMessage: string; ageBand?: string };
  const { childAgeMonths, allergies, dietType, region, audience } = ctx;
  const meals = ai.meals.slice(0, 6).flatMap((o, idx) => {
    const title = String(o.title ?? "").slice(0, 80) || "Meal";
    const emoji =
      typeof o.emoji === "string" && o.emoji.trim()
        ? o.emoji.trim().slice(0, 4)
        : DEFAULT_EMOJIS[idx % DEFAULT_EMOJIS.length];
    const ingredients = (Array.isArray(o.ingredients) ? o.ingredients : []).slice(0, 8).map(String);
    const steps = (Array.isArray(o.steps) ? o.steps : []).slice(0, 6).map(String);
    const prepMinutes = Number(o.prepMinutes) || 15;
    const calories = Math.min(1200, Math.max(50, Number(o.calories) || 200));
    const tags = (Array.isArray(o.tags) ? o.tags : [])
      .slice(0, 4)
      .map((t) => String(t).toLowerCase().trim().slice(0, 20))
      .filter((t) => SAFE_TAGS.has(t));
    const isVegMeal = o.isVeg === true || tags.includes("veg");
    const bgGradient = AI_GENERATE_GRADIENTS[idx % AI_GENERATE_GRADIENTS.length] as [string, string];

    if (childAgeMonths != null) {
      const verdict = assessMealAgeSafety({ title, ingredients }, childAgeMonths);
      if (!verdict.allowed) {
        logger.warn(
          { title, childAgeMonths, reason: verdict.reason },
          "[meals/ai-generate] blocked unsafe meal",
        );
        return [];
      }
    } else {
      logger.warn({ title }, "[meals/ai-generate] skipped meal — child age unknown");
      return [];
    }

    const enrichment = validateAndEnrichMeal(
      { title, ingredients, tags, isVeg: isVegMeal },
      childAgeMonths,
      allergies,
      dietType,
    );
    return [
      {
        id: slugify(title) + "-" + idx,
        title,
        emoji,
        bgGradient,
        region,
        category: audience,
        ingredients,
        steps,
        calories,
        tags,
        prepMinutes,
        audioText: `${title}. Ingredients: ${ingredients.join(", ")}.`,
        isVeg: isVegMeal,
        matchedIngredients: [] as string[],
        missingIngredients: [] as string[],
        safetyBadges: enrichment.safetyBadges,
        whyThisMeal: enrichment.whyThisMeal,
        ...(enrichment.safetyWarning ? { safetyWarning: enrichment.safetyWarning } : {}),
      },
    ];
  });

  return {
    meals,
    amyMessage: ai.amyMessage,
    ...(ai.ageBand ? { ageBand: ai.ageBand } : {}),
  };
}
