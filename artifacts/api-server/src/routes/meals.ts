import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";
import { suggestMeals, type MealRegion } from "../lib/meal-suggestions";
import { logger } from "../lib/logger.js";
import { db } from "@workspace/db";
import { childrenTable, parentProfilesTable } from "@workspace/db/schema";
import {
  getAgeBand,
  buildAgeSafetyPromptBlock,
  validateAndEnrichMeal,
  buildInfantFeedingCards,
} from "../lib/meal-safety.js";
import { submitRouteAiJob } from "../lib/route-ai-queue.js";

const router: IRouter = Router();

const ALLOWED_REGIONS: ReadonlySet<string> = new Set<MealRegion>([
  "north_indian", "south_indian", "bengali", "gujarati",
  "maharashtrian", "punjabi", "pan_indian", "global",
  "western", "asian", "middle_eastern", "vegetarian", "mixed", "indian",
]);

/** Human-readable cuisine description for prompts */
function buildCuisineLabel(region: string): string {
  const MAP: Record<string, string> = {
    north_indian:   "North Indian (Delhi/UP/Punjabi — parathas, dal makhani, chole, rajma, sabzis)",
    south_indian:   "South Indian (Tamil/Karnataka/Andhra — idli, dosa, sambar, rasam, curd rice)",
    bengali:        "Bengali (rice, macher jhol, luchi, kosha mangsho, mishti doi)",
    gujarati:       "Gujarati (thepla, dhokla, khandvi, undhiyu, dal-bhaat, kadhi)",
    maharashtrian:  "Maharashtrian (poha, vada pav, misal, varan-bhaat, bhakri)",
    punjabi:        "Punjabi (parathas, chole bhature, dal makhani, butter chicken, lassi)",
    pan_indian:     "Pan-Indian (mixed Indian — varied regions)",
    indian:         "Indian Cuisine (dal, roti, rice, curry — varied regions)",
    global:         "Global / Continental (pancakes, sandwiches, pasta, salads, grilled items)",
    western:        "Western / Continental (pasta, sandwiches, wraps, salads, grilled chicken, eggs)",
    asian:          "Asian (stir fry, noodles, fried rice, dumplings, sushi — Chinese/Thai/Japanese)",
    middle_eastern: "Middle Eastern (hummus, shawarma, falafel, grilled meats, pita, tabbouleh)",
    vegetarian:     "Plant-based / Vegetarian (salads, legumes, grains, tofu, roasted veggies)",
    mixed:          "Mixed / Flexible (variety from multiple cuisines — balanced selection)",
  };
  return MAP[region] ?? region;
}

/** Parse a potentially comma-separated multi-cuisine string into ordered list */
function parseCuisines(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

const MAX_FRIDGE_ITEMS = 30;
const MAX_ITEM_LEN = 24;
const MAX_AGE = 18;
const MAX_LEARNING_IDS = 40;
const MAX_MEAL_ID_LEN = 64;

function parseMealIdList(raw: unknown): string[] {
  return Array.from(
    new Set(
      String(raw ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= MAX_MEAL_ID_LEN && /^[a-z0-9_-]+$/i.test(s))
    )
  ).slice(0, MAX_LEARNING_IDS);
}

// GET /api/meals/suggest?region=...&audience=kids_tiffin|parent_healthy
//   &fridge=milk,bread,paneer&childAge=5&isVeg=true
router.get("/meals/suggest", (req, res) => {
  const regionRaw = String(req.query.region ?? "").toLowerCase().trim();
  const region: MealRegion = (ALLOWED_REGIONS.has(regionRaw) ? regionRaw : "pan_indian") as MealRegion;

  const audienceRaw = String(req.query.audience ?? "").toLowerCase().trim();
  const audience: "kids_tiffin" | "parent_healthy" =
    audienceRaw === "parent_healthy" ? "parent_healthy" : "kids_tiffin";

  const fridgeRaw = String(req.query.fridge ?? "");
  const fridgeItems = Array.from(
    new Set(
      fridgeRaw
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0 && s.length <= MAX_ITEM_LEN)
    )
  ).slice(0, MAX_FRIDGE_ITEMS);

  let childAge: number | undefined = undefined;
  if (req.query.childAge != null && req.query.childAge !== "") {
    const n = Number(req.query.childAge);
    if (Number.isFinite(n)) {
      childAge = Math.max(0, Math.min(MAX_AGE, Math.floor(n)));
    }
  }

  const isVegParam = req.query.isVeg;
  const isVeg = isVegParam === "true" ? true : isVegParam === "false" ? false : undefined;

  const likedMealIds = parseMealIdList(req.query.liked);
  const dislikedMealIds = parseMealIdList(req.query.disliked);

  const result = suggestMeals({
    region,
    audience,
    fridgeItems,
    childAge,
    isVeg,
    hour: new Date().getHours(),
    likedMealIds,
    dislikedMealIds,
  });

  const noCache = likedMealIds.length > 0 || dislikedMealIds.length > 0;
  res.set("Cache-Control", noCache ? "no-store" : "private, max-age=60");
  res.json(result);
});

// ─── AI Meal Generator (legacy structured endpoint) ───────────────────────────
// GET /api/meals/generate?count=5&region=north&type=breakfast&isVeg=true
const GENERATE_CACHE = new Map<string, { meals: unknown[]; ts: number }>();
const GENERATE_CACHE_TTL_MS = 30 * 60 * 1000;

const REGION_LABEL: Record<string, string> = {
  north: "north", south: "south", west: "west", east: "east", all: "all",
  north_indian: "north", south_indian: "south", maharashtrian: "west",
  gujarati: "west", bengali: "east", punjabi: "north", pan_indian: "all", global: "all",
  // Global cuisine regions (multi-select onboarding)
  western: "western", asian: "asian", middle_eastern: "middle_eastern",
  vegetarian: "vegetarian", mixed: "all", indian: "all",
};

const ALLOWED_TYPES = new Set(["breakfast", "lunch", "snack", "tiffin"]);

function buildMealPrompt(count: number, region: string, type: string, isVeg?: boolean, country?: string): string {
  const vegLine = isVeg === true
    ? "\n- All meals must be strictly vegetarian (no egg, no meat)."
    : isVeg === false
    ? "\n- Include non-vegetarian options where natural."
    : "";

  const cuisines = parseCuisines(region);
  const primaryLabel = buildCuisineLabel(cuisines[0] ?? "pan_indian");
  const secondaryLine = cuisines[1]
    ? `\n- You may blend elements from secondary cuisine: ${buildCuisineLabel(cuisines[1])}`
    : "";
  const countryLine = country ? `\n- User country: ${country} — prefer ingredients common in that country` : "";

  return `Generate meal dataset for a parenting app "AmyNest".

IMPORTANT:
- Output ONLY valid JSON array
- No extra text, no markdown, no code fences
- Keep recipes simple and practical
- Primary cuisine style: ${primaryLabel}${secondaryLine}${countryLine}
- Ingredients should be common household items available locally${vegLine}

INPUT:
Meal Count: ${count}
Cuisine: ${primaryLabel}
Meal Type: ${type} (breakfast / lunch / snack / tiffin)

OUTPUT FORMAT:
[
  {
    "title": "Meal Name",
    "type": "${type}",
    "region": "${cuisines[0] ?? region}",
    "ingredients": ["ingredient1", "ingredient2"],
    "time": "10 min",
    "calories": 200,
    "tags": ["quick", "healthy"],
    "steps": [
      "Step 1",
      "Step 2"
    ],
    "imageKeyword": "food keyword"
  }
]

RULES:
- Use real, practical meals suited to the cuisine style above
- Keep steps max 5
- Ingredients max 7
- Time under 30 min
- Make variety — no duplicates

Generate exactly ${count} meals as a JSON array.`;
}

router.get("/meals/generate", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Login required to use meal generator." });
    return;
  }

  const countRaw = Math.min(8, Math.max(1, Number(req.query.count ?? 5) || 5));
  const count = Number.isFinite(countRaw) ? Math.floor(countRaw) : 5;
  const regionInput = String(req.query.region ?? "all").toLowerCase().trim();
  const region = REGION_LABEL[regionInput] ?? "all";
  const typeInput = String(req.query.type ?? "breakfast").toLowerCase().trim();
  const type = ALLOWED_TYPES.has(typeInput) ? typeInput : "breakfast";
  const isVegParam = req.query.isVeg;
  const isVeg = isVegParam === "true" ? true : isVegParam === "false" ? false : undefined;

  const cacheKey = `${region}:${type}:${count}:${String(isVeg)}`;
  const cached = GENERATE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < GENERATE_CACHE_TTL_MS) {
    res.set("Cache-Control", "private, max-age=1800");
    res.set("X-Cache", "HIT");
    res.json({ meals: cached.meals, cached: true });
    return;
  }

  await submitRouteAiJob({
    routeName: "meals/generate",
    type: "meals.generate",
    userId,
    input: { count, region, type, isVeg },
    waitMs: 25_000,
    buildSyncBody: (result) => {
      const body = result as { meals: unknown[]; cached: false };
      GENERATE_CACHE.set(cacheKey, { meals: body.meals, ts: Date.now() });
      res.set("Cache-Control", "private, max-age=1800");
      res.set("X-Cache", "MISS");
      return { meals: body.meals, cached: false };
    },
    res,
  });
});

// ─── AI Meal Generator from Free-Text User Query ─────────────────────────────
// POST /api/meals/ai-generate
// Body: { query, region?, audience?, childAge?, isVeg? }
// Returns: { meals: RankedMeal[], amyMessage: string }
//
// The RankedMeal shape is fully compatible with the frontend recipe cards &
// modals. Fields like emoji, bgGradient, prepMinutes, audioText are derived
// server-side so the frontend needs no changes.

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

const DEFAULT_EMOJIS = ["🍱","🥘","🍛","🥗","🫓","🥙","🍲","🥚","🧆","🥞","🫕","🥣","🍜","🥦","🫔"];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "meal";
}

function parsePrepMinutes(time: string): number {
  const m = /(\d+)/.exec(time);
  const n = m ? parseInt(m[1], 10) : 15;
  return Math.min(120, Math.max(5, n));
}

const ALLERGY_EXPANSION_MEALS: Record<string, string> = {
  dairy: "milk, curd/dahi, paneer, cheese, butter, ghee, yoghurt/yogurt, cream, lassi, kheer, mayo (dairy-based)",
  gluten: "wheat, maida/all-purpose flour, bread, roti, paratha, naan, pasta, noodles, semolina/suji/rava, biscuits, cake, pizza base",
  eggs: "egg in any form — omelette, scrambled, boiled, fried, mayo, cake/cookies with egg",
  nuts: "cashew, almond, walnut, pistachio, hazelnut, brazil nut, pecan, mixed-nut garnishes",
  peanuts: "peanut, groundnut, peanut butter, satay sauce, peanut chikki, groundnut oil",
  soy: "tofu, soy milk, soy sauce, edamame, tempeh, soya chunks, soy protein",
  shellfish: "prawn, shrimp, crab, lobster, oyster, scallop, clam",
  fish: "fish of any kind, including tuna, salmon, sardine, fish sauce, fish curry",
  sesame: "til/sesame seeds, tahini, sesame oil, gajak, til-laddu, sesame garnishes",
  mustard: "mustard seeds/rai, mustard oil, mustard sauce, kasundi",
};

type AiGenerateParams = {
  query: string;
  region: string;
  audience: string;
  childAge?: number;
  totalAgeMonths?: number; // More precise than childAge (years) — used for infant safety
  // Full diet profile — replaces the old isVeg boolean.
  dietType?: string;       // "veg", "non_veg", "vegan", "eggetarian", "pescatarian", "jain", "no_preference"
  allergies?: string;      // comma-separated: "dairy,gluten,eggs,nuts,peanuts,soy,shellfish,sesame"
  foodStyle?: string;      // "indian", "asian", "western", "middle_eastern", "mixed"
  subCuisine?: string;     // "north_indian", "south_indian", etc (when foodStyle="indian")
  country?: string;
};

function buildAiGeneratePrompt(params: AiGenerateParams): string {
  const { query, region, audience, childAge, totalAgeMonths, dietType, allergies, foodStyle, subCuisine, country } = params;

  // Determine effective age in months — totalAgeMonths is the precise value, childAge (years) is fallback
  const effectiveAgeMonths = totalAgeMonths ?? (childAge != null ? childAge * 12 : undefined);

  const audience_line = audience === "parent_healthy"
    ? "The meal is for an adult parent (healthy, nutritious, appropriate calories)."
    : effectiveAgeMonths != null
    ? `The meal is for a child aged ${Math.floor(effectiveAgeMonths / 12)} years ${effectiveAgeMonths % 12 > 0 ? `and ${effectiveAgeMonths % 12} months` : ""} (${effectiveAgeMonths} months total).`
    : "The meal is for a school-age child (kid-friendly tiffin or meal).";

  // Age-band safety block — injected BEFORE diet/allergy rules for priority
  const ageSafetyBlock = (audience !== "parent_healthy" && effectiveAgeMonths != null)
    ? buildAgeSafetyPromptBlock(effectiveAgeMonths)
    : "";

  // Full diet constraint — use dietType if provided, fall back to isVeg-style
  const ft = (dietType ?? "veg").toLowerCase().replace(/-/g, "_");
  const dietLine =
    ft === "vegan"
      ? "DIET: VEGAN — strictly NO animal products. Absolutely no meat, no fish, no dairy (no milk/curd/paneer/cheese/butter/ghee/yoghurt), no eggs, no honey."
    : ft === "jain"
      ? "DIET: JAIN VEGETARIAN — no meat, no fish, no eggs. ALSO no onion, no garlic, no potato, no carrot, no radish, no beetroot, no underground/root vegetables."
    : ft === "eggetarian"
      ? "DIET: EGGETARIAN — eggs are OK; no meat or fish."
    : ft === "pescatarian"
      ? "DIET: PESCATARIAN — fish and seafood are OK; no other meat."
    : (ft === "non_veg" || ft === "nonveg" || ft === "no_preference")
      ? "DIET: NON-VEGETARIAN — meat, fish, eggs all OK (unless restricted by allergies)."
    : "DIET: VEGETARIAN — no meat, no fish. Eggs and dairy are OK unless restricted by allergies.";

  // Allergy block with full expansion
  const allergyDetail = (() => {
    const raw = (allergies ?? "").trim();
    if (!raw) return "";
    const list = raw.split(/[,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (list.length === 0) return "";
    const lines = list.map((a) => {
      const expansion = ALLERGY_EXPANSION_MEALS[a] ?? `any form of ${a}`;
      return `  • ${a.toUpperCase()} allergy → MUST NOT contain: ${expansion}`;
    });
    return `\nALLERGIES (SAFETY-CRITICAL — not even a trace or garnish):\n${lines.join("\n")}`;
  })();

  // Cuisine style
  const effectiveRegion = (() => {
    if (foodStyle && foodStyle !== "indian") return foodStyle;
    if (foodStyle === "indian" && subCuisine) return subCuisine;
    return region;
  })();
  const cuisines = parseCuisines(effectiveRegion);
  const primaryLabel = buildCuisineLabel(cuisines[0] ?? "pan_indian");
  const secondaryCuisineContext = cuisines[1]
    ? `\nSecondary cuisine: ${buildCuisineLabel(cuisines[1])} — blend elements where natural.`
    : "";
  const countryContext = country
    ? `\nUser country: ${country}. Prefer ingredients common in that country.`
    : "";

  return `You are Amy, a pediatric nutrition AI for the parenting app AmyNest. Generate 5 personalised meal recipes.

Parent's request: "${query}"
Primary cuisine: ${primaryLabel}${secondaryCuisineContext}${countryContext}
${audience_line}
${ageSafetyBlock}
${dietLine}${allergyDetail}

CRITICAL RULES:
- Output ONLY a valid JSON object with a "meals" array — no markdown, no extra text.
- Generate exactly 5 meals.
- AGE SAFETY IS THE TOP PRIORITY — follow all age-band rules above before any other consideration.
- EVERY meal MUST strictly comply with the diet and allergy rules — no exceptions, not even in garnishes or minor ingredients.
- Use the cuisine style above — do NOT default to generic Indian food if another cuisine is specified.
- Each meal must match the parent's request as closely as possible.
- Use real, practical recipes with ingredients commonly available locally.

OUTPUT FORMAT:
{
  "meals": [
    {
      "title": "Meal Name",
      "emoji": "🍱",
      "ingredients": ["ingredient 1 (qty)", "ingredient 2 (qty)"],
      "steps": ["Step 1", "Step 2", "Step 3"],
      "prepMinutes": 15,
      "calories": 280,
      "tags": ["healthy", "quick"],
      "isVeg": true
    }
  ],
  "amyMessage": "A short 1-line personalised tip about these meals."
}

RULES:
- title: max 60 chars, real specific meal name
- emoji: a single relevant food emoji
- ingredients: 4-8 items with rough quantities (e.g. "1 cup rice", "2 tbsp oil")
- steps: 3-6 clear concise steps (max 200 chars each)
- prepMinutes: realistic integer (5-45)
- calories: realistic integer per serving (80-700)
- tags: 1-4 lowercase tags from: healthy, quick, veg, non-veg, protein, sweet, spicy, light, heavy, kids, tiffin
- isVeg: boolean (true only if strictly no meat/fish/eggs)
- amyMessage: 1 sentence, max 120 chars`;
}

router.post("/meals/ai-generate", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Login required." });
    return;
  }

  const queryRaw = String(req.body?.query ?? "").trim().slice(0, 300);
  const query = queryRaw.length > 0 ? queryRaw : "quick healthy tiffin for kids";

  const audienceRaw = String(req.body?.audience ?? "").toLowerCase().trim();
  const audience = audienceRaw === "parent_healthy" ? "parent_healthy" : "kids_tiffin";

  // ── Load full diet profile from DB server-side ───────────────────────────
  // The frontend only sends basic hints (region, country, childAge, isVeg).
  // We override with the real child + parent profile stored in the database so
  // the AI gets the actual dietType, allergies, foodStyle, and subCuisine.
  const [children, parentProfiles] = await Promise.all([
    db.select().from(childrenTable).where(eq(childrenTable.userId, userId)),
    db.select().from(parentProfilesTable).where(eq(parentProfilesTable.userId, userId)),
  ]);

  const pp = parentProfiles[0] as typeof parentProfilesTable.$inferSelect & {
    dietType?: string; foodStyle?: string; subCuisine?: string; allergies?: string;
  } | undefined;
  const child = children[0] as typeof childrenTable.$inferSelect & {
    dietType?: string; foodStyle?: string; subCuisine?: string; allergies?: string;
  } | undefined;

  // Diet type resolution: child.dietType → pp.dietType → pp.foodType → child.foodType → body fallback
  let dietType: string =
    (child as any)?.dietType ||
    (pp as any)?.dietType ||
    pp?.foodType ||
    child?.foodType ||
    (req.body?.isVeg === true || req.body?.isVeg === "true" ? "veg" : "no_preference");

  // Allergies: child overrides parent; both come from DB, not the frontend
  const allergies: string =
    (child as any)?.allergies ||
    (pp as any)?.allergies ||
    "";

  // Food style & sub-cuisine from DB
  const foodStyle: string | undefined =
    (child as any)?.foodStyle ?? (pp as any)?.foodStyle ?? undefined;
  const subCuisine: string | undefined =
    (child as any)?.subCuisine ?? (pp as any)?.subCuisine ?? undefined;

  // Region: DB profile wins over frontend hint
  const regionRaw = String(pp?.region ?? req.body?.region ?? "pan_indian").toLowerCase().trim();
  const region = parseCuisines(regionRaw)
    .filter((c) => ALLOWED_REGIONS.has(c))
    .join(",") || "pan_indian";

  // Country: frontend hint (ISO code)
  const country = typeof req.body?.country === "string" ? req.body.country.toUpperCase().slice(0, 3) : undefined;

  // Child age: DB first (years), then frontend hint
  let childAge: number | undefined = child?.age != null ? Math.max(0, Math.min(MAX_AGE, Math.floor(Number(child.age)))) : undefined;
  if (childAge == null && req.body?.childAge != null) {
    const n = Number(req.body.childAge);
    if (Number.isFinite(n)) childAge = Math.max(0, Math.min(MAX_AGE, Math.floor(n)));
  }

  // Precise age in months — critical for infant safety (child.age=0 could be 0–11 months)
  const childAgeMonths: number | undefined = child?.age != null
    ? (Math.floor(Number(child.age)) * 12) + Math.max(0, Math.min(11, Math.floor(Number((child as any).ageMonths ?? 0))))
    : (childAge != null ? childAge * 12 : undefined);

  req.log.info({ dietType, allergies, foodStyle, subCuisine, region, childAge, childAgeMonths }, "[meals/ai-generate] resolved diet context");

  // ── Infant shortcut: 0-6 months → skip AI, return deterministic feeding cards ──
  if (audience !== "parent_healthy" && childAgeMonths != null && childAgeMonths < 6) {
    req.log.info({ childAgeMonths }, "[meals/ai-generate] infant < 6 months — returning feeding cards");
    const feedingType = (child as any)?.feedingType as string | undefined;
    const infantCards = buildInfantFeedingCards(childAgeMonths, feedingType);
    res.set("Cache-Control", "no-store");
    res.json({
      meals: infantCards,
      amyMessage: `Your ${childAgeMonths}-month-old needs only breast milk or formula right now. Solid foods start at 6 months. 🤱`,
      infantMode: true,
    });
    return;
  }

  const prompt = buildAiGeneratePrompt({ query, region, audience, childAge, totalAgeMonths: childAgeMonths, dietType, allergies, foodStyle, subCuisine, country });

  try {
    await submitRouteAiJob({
      routeName: "meals/ai-generate",
      type: "meals.ai_generate",
      userId,
      input: {
        prompt,
        region,
        audience,
        childAgeMonths: childAgeMonths ?? undefined,
        allergies,
        dietType,
      },
      waitMs: 30_000,
      buildSyncBody: (result) => {
        const ai = result as { meals: Array<Record<string, unknown>>; amyMessage: string; ageBand?: string };
        const SAFE_TAGS = new Set(["quick","healthy","veg","non-veg","protein","sweet","spicy","light","heavy","kids","tiffin"]);
        const meals = ai.meals.slice(0, 6).map((o, idx) => {
          const title = String(o.title ?? "").slice(0, 80) || "Meal";
          const emoji = typeof o.emoji === "string" && o.emoji.trim()
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
          const enrichment = childAgeMonths != null
            ? validateAndEnrichMeal(
                { title, ingredients, tags, isVeg: isVegMeal },
                childAgeMonths,
                allergies,
                dietType,
              )
            : { safetyBadges: [] as string[], whyThisMeal: "", safetyWarning: undefined };
          return {
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
          };
        });
        res.set("Cache-Control", "no-store");
        return { meals, amyMessage: ai.amyMessage, ...(ai.ageBand ? { ageBand: ai.ageBand } : {}) };
      },
      res,
    });
    return;
  } catch (err) {
    logger.error(`[meals/ai-generate] queue error ${String(err)}`);
    res.status(503).json({ error: "AI service unavailable. Please retry." });
  }
});

// ─── AI 7-Day Week Plan ───────────────────────────────────────────────────────
// POST /api/meals/week-plan
// Body: { weather?: "hot"|"cold"|"moderate", forceRefresh?: boolean }
// Returns: { plan: WeekPlan, generatedAt: string, cached: boolean }

const WEEK_PLAN_CACHE = new Map<string, { plan: unknown; ts: number; params: string }>();
const WEEK_PLAN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function buildWeekPlanPrompt(opts: {
  childAge: number;
  ageMonths?: number;
  childName?: string;
  country: string;
  dietType: string;
  foodStyle: string;
  subCuisine: string | null;
  allergies: string;
  weather: string;
  // Environmental / routine context
  isSchoolGoing?: boolean;
  schoolStartTime?: string;
  schoolEndTime?: string;
  wakeUpTime?: string;
  sleepTime?: string;
  travelMode?: string;
  goals?: string;
  parentGoals?: string[];
  parentWorkType?: string;
  parentWorkStart?: string;
  parentWorkEnd?: string;
}): string {
  const {
    childAge, ageMonths, childName, country, dietType, foodStyle, subCuisine, allergies, weather,
    isSchoolGoing, schoolStartTime, schoolEndTime, wakeUpTime, sleepTime, travelMode,
    goals, parentGoals, parentWorkType, parentWorkStart, parentWorkEnd,
  } = opts;

  const ft = dietType.toLowerCase().replace(/-/g, "_");
  const dietRule =
    ft === "vegan"
      ? "Vegan — NO dairy, no eggs, no honey, no meat, no fish"
    : ft === "jain"
      ? "Jain vegetarian — no meat, no fish, no eggs, no onion, no garlic, no root vegetables"
    : ft === "eggetarian"
      ? "Eggetarian — eggs OK, no meat, no fish"
    : ft === "pescatarian"
      ? "Pescatarian — fish/seafood OK, no other meat"
    : (ft === "non_veg" || ft === "nonveg" || ft === "no_preference")
      ? "Non-vegetarian — meat, fish, eggs all OK"
    : "Vegetarian — no meat, no fish; dairy and eggs OK";

  const allergyBlock = (() => {
    const list = allergies.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!list.length) return "";
    return `ALLERGIES (NEVER include, not even as garnish): ${list.join(", ")}`;
  })();

  const weatherRule =
    weather === "hot" ? "Weather is HOT — prefer light, hydrating, cooling meals (salads, lassi, fruits, light dals, yogurt-based dishes). Avoid heavy or oily food." :
    weather === "cold" ? "Weather is COLD — prefer warm, cooked, hearty meals (soups, stews, hot cereals, cooked grains, warm milk). Avoid raw cold foods." :
    "Weather is moderate — standard balanced meals.";

  const cuisineLabel = (() => {
    if (foodStyle === "indian" && subCuisine) return buildCuisineLabel(subCuisine);
    return buildCuisineLabel(foodStyle || "pan_indian");
  })();

  // School context
  const schoolBlock = (() => {
    if (isSchoolGoing === false) return "- Child does NOT attend school — no lunchbox needed. Lunch can be home-cooked.";
    if (!isSchoolGoing && schoolStartTime === "09:00" && schoolEndTime === "15:00") return "";
    const lines: string[] = [];
    if (isSchoolGoing) {
      lines.push("- Child attends school.");
      if (schoolStartTime) lines.push(`  - School starts: ${schoolStartTime} → breakfast must be LIGHT, quick, and easy to digest before leaving`);
      if (schoolEndTime) lines.push(`  - School ends: ${schoolEndTime} → after-school snack should be ENERGISING and filling`);
      lines.push("  - LUNCH must be a lunchbox meal: portable, no-spill, finger-foods or compact meals, easy to eat without heating");
      if (travelMode && travelMode !== "car") {
        lines.push(`  - Travel mode to school: ${travelMode} — factor in commute time when sizing breakfast`);
      }
    }
    return lines.join("\n");
  })();

  // Sleep / wake context
  const routineBlock = (() => {
    const lines: string[] = [];
    if (wakeUpTime) lines.push(`- Wake-up time: ${wakeUpTime} → breakfast timing starts around ${wakeUpTime}`);
    if (sleepTime) lines.push(`- Bedtime: ${sleepTime} → dinner must be served and digested well before bedtime (at least 2 hours)`);
    return lines.join("\n");
  })();

  // Parent work context — affects meal prep complexity
  const parentBlock = (() => {
    const lines: string[] = [];
    if (parentWorkType === "work_from_office" || parentWorkType === "office") {
      lines.push("- Parent works from office — morning prep time is limited. Prefer quick breakfast (≤10 min) and pre-prep-friendly lunches.");
      if (parentWorkStart) lines.push(`  - Leaves for office around ${parentWorkStart}`);
    } else if (parentWorkType === "work_from_home" || parentWorkType === "wfh") {
      lines.push("- Parent works from home — moderate prep time available. Can include slightly more elaborate lunches.");
    } else if (parentWorkType === "business" || parentWorkType === "entrepreneur") {
      lines.push("- Parent runs a business — schedule may be irregular. Prefer batch-cookable and quick meals.");
    }
    if (parentWorkStart && parentWorkEnd) {
      lines.push(`  - Work hours: ${parentWorkStart}–${parentWorkEnd}`);
    }
    return lines.join("\n");
  })();

  // Goals context
  const goalsBlock = (() => {
    const all: string[] = [];
    if (goals) all.push(goals);
    if (parentGoals && parentGoals.length) {
      const goalMap: Record<string, string> = {
        improve_sleep: "improve sleep quality — include sleep-promoting foods (warm milk, bananas, complex carbs at dinner)",
        reduce_tantrums: "reduce tantrums — stabilise blood sugar with balanced snacks, avoid sugar spikes",
        improve_focus: "improve focus/concentration — include brain foods (omega-3, iron, zinc, choline)",
        reduce_screen_time: "reduce screen time — make mealtimes engaging with colorful varied plates",
        increase_independence: "build independence — include foods the child can self-feed easily",
      };
      parentGoals.forEach(g => { if (goalMap[g]) all.push(goalMap[g]); });
    }
    if (!all.length) return "";
    return `PARENTING GOALS — tailor meals to support these:\n${all.map(g => `- ${g}`).join("\n")}`;
  })();

  const ageDisplay = ageMonths != null
    ? `${childAge} years${ageMonths % 12 > 0 ? ` ${ageMonths % 12} months` : ""} (${ageMonths} months total)`
    : `${childAge} years`;

  const childLabel = childName ? `${childName}, aged ${ageDisplay}` : `aged ${ageDisplay}`;

  return `You are a pediatric nutrition AI. Generate a personalized 7-day meal plan.

CHILD PROFILE:
- Child: ${childLabel}
- Country: ${country || "India"}
- Cuisine style: ${cuisineLabel}
- Diet: ${dietRule}
${allergyBlock ? `- ${allergyBlock}\n` : ""}
ENVIRONMENTAL CONTEXT:
- ${weatherRule}
${schoolBlock ? schoolBlock + "\n" : ""}${routineBlock ? routineBlock + "\n" : ""}${parentBlock ? parentBlock + "\n" : ""}
${goalsBlock ? goalsBlock + "\n\n" : ""}RULES:
1. All meals must be kid-friendly, culturally relevant to the cuisine style above
2. STRICT diet compliance — never violate diet type or allergies, not even in garnishes
3. Respect school timing: if school-going, breakfast = light & quick, lunch = lunchbox-friendly
4. Respect sleep/wake timing: dinner must complete at least 2 hours before bedtime
5. Respect parent availability: if office worker, morning meals ≤10 min prep
6. Do NOT repeat the same main dish within 3 consecutive days
7. Provide REALISTIC nutrition values based on standard serving sizes for the child's age
8. Each day must have exactly 5 meals: breakfast, mid_morning, lunch, snack, dinner
9. Output ONLY valid JSON, no extra text, no markdown fences

OUTPUT FORMAT (exactly this shape):
{
  "week_plan": [
    {
      "day": "Monday",
      "meals": {
        "breakfast":    { "name": "...", "protein_g": 8, "carbs_g": 35, "fiber_g": 2, "calories": 220 },
        "mid_morning":  { "name": "...", "protein_g": 3, "carbs_g": 20, "fiber_g": 1, "calories": 120 },
        "lunch":        { "name": "...", "protein_g": 15, "carbs_g": 50, "fiber_g": 4, "calories": 380 },
        "snack":        { "name": "...", "protein_g": 4, "carbs_g": 18, "fiber_g": 2, "calories": 150 },
        "dinner":       { "name": "...", "protein_g": 12, "carbs_g": 45, "fiber_g": 3, "calories": 320 }
      }
    }
  ]
}

Generate all 7 days (Monday through Sunday).`;
}

router.post("/meals/week-plan", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Login required." });
    return;
  }

  const weather = ["hot","cold","moderate"].includes(String(req.body?.weather ?? ""))
    ? String(req.body.weather) as "hot"|"cold"|"moderate"
    : "moderate";
  const forceRefresh = req.body?.forceRefresh === true;

  // Load user + child from DB
  const [children, parentProfiles] = await Promise.all([
    db.select().from(childrenTable).where(eq(childrenTable.userId, userId)),
    db.select().from(parentProfilesTable).where(eq(parentProfilesTable.userId, userId)),
  ]);
  const pp = parentProfiles[0];
  const child = children[0];

  const childAge = child?.age ?? 6;
  const ageMonths = child != null
    ? (Math.floor(Number(child.age)) * 12) + Math.max(0, Math.min(11, Math.floor(Number((child as any).ageMonths ?? 0))))
    : undefined;
  const childName = child?.name ? String(child.name).trim().slice(0, 40) : undefined;
  const dietType: string = child?.dietType ?? pp?.dietType ?? pp?.foodType ?? "veg";
  const foodStyle: string = child?.foodStyle ?? pp?.foodStyle ?? "indian";
  const subCuisine: string | null = child?.subCuisine ?? pp?.subCuisine ?? null;
  const allergies: string = child?.allergies ?? pp?.allergies ?? "";
  const country = String(req.body?.country ?? "India").slice(0, 50);

  // Environmental / routine context
  const isSchoolGoing = child?.isSchoolGoing ?? undefined;
  const schoolStartTime = child?.schoolStartTime ?? undefined;
  const schoolEndTime = child?.schoolEndTime ?? undefined;
  const wakeUpTime = child?.wakeUpTime ?? undefined;
  const sleepTime = child?.sleepTime ?? undefined;
  const travelMode = child?.travelMode ?? undefined;
  const goals = child?.goals ? String(child.goals).slice(0, 200) : undefined;
  const parentGoals = Array.isArray((child as any)?.parentGoals) ? (child as any).parentGoals as string[] : [];
  const parentWorkType = pp?.workType ?? undefined;
  const parentWorkStart = pp?.workStartTime ?? undefined;
  const parentWorkEnd = pp?.workEndTime ?? undefined;

  const cacheKey = userId;
  const paramsFingerprint = `${childAge}|${dietType}|${foodStyle}|${subCuisine}|${allergies}|${weather}|${country}|${isSchoolGoing}|${schoolStartTime}|${schoolEndTime}|${wakeUpTime}|${sleepTime}|${parentWorkType}|${goals}`;
  const cached = WEEK_PLAN_CACHE.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.ts < WEEK_PLAN_TTL_MS && cached.params === paramsFingerprint) {
    res.set("Cache-Control", "private, max-age=3600");
    res.set("X-Cache", "HIT");
    res.json({ plan: cached.plan, generatedAt: new Date(cached.ts).toISOString(), cached: true });
    return;
  }

  req.log.info({ childAge, childName, dietType, foodStyle, subCuisine, allergies, weather, country, isSchoolGoing, schoolStartTime, schoolEndTime, wakeUpTime, sleepTime, parentWorkType }, "[meals/week-plan] generating");

  const prompt = buildWeekPlanPrompt({
    childAge, ageMonths, childName, country, dietType, foodStyle, subCuisine, allergies, weather,
    isSchoolGoing, schoolStartTime, schoolEndTime, wakeUpTime, sleepTime, travelMode,
    goals, parentGoals, parentWorkType, parentWorkStart, parentWorkEnd,
  });

  await submitRouteAiJob({
    routeName: "meals/week-plan",
    type: "meals.week_plan",
    userId,
    input: { prompt },
    waitMs: 35_000,
    buildSyncBody: (result) => {
      const weekPlan = (result as { plan: unknown[] }).plan;
      const MEAL_KEYS = ["breakfast", "mid_morning", "lunch", "snack", "dinner"] as const;
      const sanitised = DAYS.map((dayName, di) => {
        const rawDay = weekPlan[di] as Record<string, unknown> | undefined ?? {};
        const meals: Record<string, unknown> = {};
        for (const key of MEAL_KEYS) {
          const m = (rawDay.meals as Record<string, unknown> | undefined)?.[key] as Record<string, unknown> | undefined ?? {};
          meals[key] = {
            name: String(m.name ?? "").slice(0, 100) || "—",
            protein_g: Math.min(60, Math.max(0, Number(m.protein_g) || 0)),
            carbs_g: Math.min(150, Math.max(0, Number(m.carbs_g) || 0)),
            fiber_g: Math.min(20, Math.max(0, Number(m.fiber_g) || 0)),
            calories: Math.min(800, Math.max(50, Number(m.calories) || 200)),
          };
        }
        return { day: dayName, meals };
      });
      WEEK_PLAN_CACHE.set(cacheKey, { plan: sanitised, ts: Date.now(), params: paramsFingerprint });
      res.set("Cache-Control", "private, max-age=3600");
      res.set("X-Cache", "MISS");
      return { plan: sanitised, generatedAt: new Date().toISOString(), cached: false };
    },
    res,
  });
});


// ─── Family Portions ──────────────────────────────────────────────────────────
// POST /api/meals/family-portions
// Body: { meal_name: string, country?: string, forceRefresh?: boolean }
// Returns: { meal, portions: { 6_12m, 1_3y, 4_8y, adult }, feeding_tip, allergy_note, cached }

const FAMILY_PORTIONS_CACHE = new Map<string, { data: unknown; ts: number }>();
const FAMILY_PORTIONS_TTL_MS = 24 * 60 * 60 * 1000;

function buildFamilyPortionsPrompt(opts: {
  mealName: string;
  dietType: string;
  allergies: string;
  country: string;
}): string {
  const { mealName, dietType, allergies, country } = opts;

  const ft = dietType.toLowerCase().replace(/-/g, "_");
  const dietRule =
    ft === "vegan"       ? "Vegan — NO dairy, no eggs, no honey, no meat, no fish"
    : ft === "jain"      ? "Jain vegetarian — no meat/fish/eggs/onion/garlic/root vegetables"
    : ft === "eggetarian"? "Eggetarian — eggs OK, no meat, no fish"
    : ft === "pescatarian"? "Pescatarian — fish/seafood OK, no other meat"
    : (ft === "non_veg" || ft === "nonveg" || ft === "no_preference")
                         ? "Non-vegetarian — meat, fish, eggs all OK"
    : "Vegetarian — no meat, no fish; dairy and eggs OK";

  const allergyBlock = (() => {
    const list = allergies.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean);
    return list.length ? `ALLERGIES (avoid completely, note any modification needed): ${list.join(", ")}` : "";
  })();

  const c = country.toLowerCase();
  const unitInstruction =
    c.includes("india") || c === "in"
      ? "Use Indian measurements: katori (150ml), cup, tbsp, tsp, small bowl, handful"
      : ["us", "usa", "united states", "canada", "australia", "uk", "england"].some(x => c.includes(x))
      ? "Use US/Imperial measurements: cup (240ml), tablespoon, teaspoon, ounce"
      : "Use metric measurements: grams (g), millilitres (ml), tablespoon";

  return `You are a pediatric nutrition expert. Given a dish, generate age-appropriate portion sizes for a family meal.

DISH: ${mealName}
DIET: ${dietRule}
${allergyBlock ? allergyBlock + "\n" : ""}UNITS: ${unitInstruction}

Generate portions for exactly 4 age groups:
- 6-12 months (infant): MUST be mashed or pureed, very small, no choking hazards
- 1-3 years (toddler): small portions, soft textures, no whole nuts or hard chunks
- 4-8 years (child): moderate portions, normal texture unless dish is hard/crunchy
- Adult: full standard portion

Rules:
1. texture field: brief note ≤6 words describing modification needed; use null for adult or if no modification needed
2. If the dish contains a known choking hazard for infants/toddlers, note the modification in texture
3. If an allergy ingredient is present, put the substitution / omission note in allergy_note
4. feeding_tip: one practical, dish-specific tip ≤15 words; null if nothing to add
5. Output ONLY valid JSON — no prose, no markdown fences

OUTPUT:
{
  "meal": "${mealName}",
  "portions": {
    "6_12m": { "amount": "...", "texture": "..." or null },
    "1_3y":  { "amount": "...", "texture": "..." or null },
    "4_8y":  { "amount": "...", "texture": "..." or null },
    "adult": { "amount": "...", "texture": null }
  },
  "feeding_tip": "..." or null,
  "allergy_note": "..." or null
}`;
}

router.post("/meals/family-portions", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Login required." });
    return;
  }

  const mealName = String(req.body?.meal_name ?? "").trim().slice(0, 100);
  if (!mealName) {
    res.status(400).json({ error: "meal_name is required." });
    return;
  }

  const country = String(req.body?.country ?? "India").slice(0, 50);
  const forceRefresh = req.body?.forceRefresh === true;

  const [children, parentProfiles] = await Promise.all([
    db.select().from(childrenTable).where(eq(childrenTable.userId, userId)),
    db.select().from(parentProfilesTable).where(eq(parentProfilesTable.userId, userId)),
  ]);
  const pp = parentProfiles[0];
  const child = children[0];
  const dietType: string = child?.dietType ?? pp?.dietType ?? pp?.foodType ?? "veg";
  const allergies: string = child?.allergies ?? pp?.allergies ?? "";

  const cacheKey = `fp:${userId}:${mealName.toLowerCase()}:${country}:${dietType}:${allergies}`;
  const existing = FAMILY_PORTIONS_CACHE.get(cacheKey);
  if (!forceRefresh && existing && Date.now() - existing.ts < FAMILY_PORTIONS_TTL_MS) {
    res.set("Cache-Control", "private, max-age=3600");
    res.set("X-Cache", "HIT");
    res.json({ ...(existing.data as object), cached: true });
    return;
  }

  req.log.info({ mealName, country, dietType }, "[meals/family-portions] generating");

  const prompt = buildFamilyPortionsPrompt({ mealName, dietType, allergies, country });

  await submitRouteAiJob({
    routeName: "meals/family-portions",
    type: "meals.family_portions",
    userId,
    input: { prompt, mealName },
    waitMs: 15_000,
    buildSyncBody: (result) => {
      const sanitised = result as Record<string, unknown>;
      FAMILY_PORTIONS_CACHE.set(cacheKey, { data: sanitised, ts: Date.now() });
      res.set("Cache-Control", "private, max-age=3600");
      res.set("X-Cache", "MISS");
      return { ...sanitised, cached: false };
    },
    res,
  });
});

export default router;

