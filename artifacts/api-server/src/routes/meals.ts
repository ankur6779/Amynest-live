import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";
import { suggestMeals, type MealRegion } from "../lib/meal-suggestions";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const ALLOWED_REGIONS: ReadonlySet<string> = new Set<MealRegion>([
  "north_indian", "south_indian", "bengali", "gujarati",
  "maharashtrian", "punjabi", "pan_indian", "global",
]);

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
};

const ALLOWED_TYPES = new Set(["breakfast", "lunch", "snack", "tiffin"]);

function buildMealPrompt(count: number, region: string, type: string, isVeg?: boolean): string {
  const vegLine = isVeg === true
    ? "\n- All meals must be strictly vegetarian (no egg, no meat)."
    : isVeg === false
    ? "\n- Include non-vegetarian options where natural."
    : "";

  return `Generate meal dataset for a parenting app "AmyNest".

IMPORTANT:
- Output ONLY valid JSON array
- No extra text, no markdown, no code fences
- Keep recipes simple and practical
- Use Indian meals (region-based)
- Ingredients should be common household items${vegLine}

INPUT:
Meal Count: ${count}
Region: ${region} (north / south / west / all)
Meal Type: ${type} (breakfast / lunch / snack / tiffin)

OUTPUT FORMAT:
[
  {
    "title": "Meal Name",
    "type": "${type}",
    "region": "${region}",
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
- Use real Indian meals only
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

  try {
    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const prompt = buildMealPrompt(count, region, type, isVeg);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch {
      logger.warn(`[meals/generate] JSON parse failed raw=${raw.slice(0, 200)}`);
      res.status(502).json({ error: "AI returned invalid JSON. Please retry." });
      return;
    }

    let meals: unknown[];
    if (Array.isArray(parsed)) {
      meals = parsed;
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const found = Object.values(obj).find(v => Array.isArray(v));
      meals = (found as unknown[]) ?? [];
    } else {
      meals = [];
    }

    if (meals.length === 0) {
      res.status(502).json({ error: "AI returned no meals. Please retry." });
      return;
    }

    const SAFE_TAGS = new Set(["quick","healthy","veg","non-veg","protein","sweet","spicy","light","heavy","kids","tiffin"]);
    const sanitised = meals.slice(0, 8).map((m) => {
      if (!m || typeof m !== "object") return null;
      const o = m as Record<string, unknown>;
      return {
        title:        String(o.title ?? "").slice(0, 80),
        type:         ALLOWED_TYPES.has(String(o.type)) ? String(o.type) : type,
        region:       String(o.region ?? region).slice(0, 40),
        ingredients:  (Array.isArray(o.ingredients) ? o.ingredients : []).slice(0, 7).map((i) => String(i).slice(0, 40)),
        time:         String(o.time ?? "").slice(0, 20),
        calories:     Math.min(1200, Math.max(50, Number(o.calories) || 200)),
        tags:         (Array.isArray(o.tags) ? o.tags : []).slice(0, 6).map((t) => String(t).toLowerCase().slice(0, 20)).filter((t) => SAFE_TAGS.has(t)),
        steps:        (Array.isArray(o.steps) ? o.steps : []).slice(0, 5).map((s) => String(s).slice(0, 300)),
        imageKeyword: String(o.imageKeyword ?? "").slice(0, 60),
      };
    }).filter(Boolean);

    GENERATE_CACHE.set(cacheKey, { meals: sanitised, ts: Date.now() });
    res.set("Cache-Control", "private, max-age=1800");
    res.set("X-Cache", "MISS");
    res.json({ meals: sanitised, cached: false });
  } catch (err) {
    logger.error(`[meals/generate] OpenAI error ${String(err)}`);
    res.status(503).json({ error: "AI service unavailable. Please retry." });
  }
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

function buildAiGeneratePrompt(query: string, region: string, audience: string, childAge?: number, isVeg?: boolean): string {
  const audience_line = audience === "parent_healthy"
    ? "The meal is for an adult parent (healthy, nutritious, low-calorie)."
    : childAge != null
    ? `The meal is for a child aged ${childAge} years (kid-friendly tiffin/snack/meal).`
    : "The meal is for a school-age child (kid-friendly tiffin or meal).";

  const veg_line = isVeg === true
    ? "All meals must be strictly vegetarian (no egg, no meat, no fish)."
    : isVeg === false
    ? "You may include non-vegetarian options where natural."
    : "Mix of vegetarian and non-vegetarian is fine.";

  return `You are Amy, an AI assistant for the parenting app AmyNest. Generate 5 meal recipes based on the parent's request.

Parent's request: "${query}"
Region: ${region}
${audience_line}
${veg_line}

IMPORTANT:
- Output ONLY a valid JSON object with a "meals" array — no markdown, no extra text, no code fences.
- Generate exactly 5 meals.
- Each meal must match the parent's request as closely as possible.
- Use real, practical recipes with common Indian household ingredients.

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
  "amyMessage": "A short 1-line tip or encouragement for the parent about these meals."
}

RULES:
- title: max 60 chars, real meal name
- emoji: a single relevant food emoji
- ingredients: 4-8 items, include rough quantities (e.g. "1 cup rice", "2 tbsp oil")
- steps: 3-6 clear, concise steps (max 200 chars each)
- prepMinutes: realistic integer (5-45)
- calories: realistic integer per serving (80-700)
- tags: 1-4 lowercase tags from: healthy, quick, veg, non-veg, protein, sweet, spicy, light, heavy, kids, tiffin
- isVeg: boolean
- amyMessage: 1 sentence of encouragement or tip, max 120 chars`;
}

router.post("/meals/ai-generate", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Login required." });
    return;
  }

  const queryRaw = String(req.body?.query ?? "").trim().slice(0, 300);
  const query = queryRaw.length > 0 ? queryRaw : "quick healthy tiffin for kids";

  const regionInput = String(req.body?.region ?? "pan_indian").toLowerCase().trim();
  const region = ALLOWED_REGIONS.has(regionInput) ? regionInput : "pan_indian";

  const audienceRaw = String(req.body?.audience ?? "").toLowerCase().trim();
  const audience = audienceRaw === "parent_healthy" ? "parent_healthy" : "kids_tiffin";

  let childAge: number | undefined = undefined;
  if (req.body?.childAge != null && req.body.childAge !== "") {
    const n = Number(req.body.childAge);
    if (Number.isFinite(n)) childAge = Math.max(0, Math.min(MAX_AGE, Math.floor(n)));
  }

  const isVegParam = req.body?.isVeg;
  const isVeg = isVegParam === true || isVegParam === "true" ? true
    : isVegParam === false || isVegParam === "false" ? false
    : undefined;

  try {
    const { openai } = await import("@workspace/integrations-openai-ai-server");

    const prompt = buildAiGeneratePrompt(query, region, audience, childAge, isVeg);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are Amy, a helpful cooking assistant for parents. You only generate meal recipes. You output strict JSON only — no markdown, no prose outside the JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.warn(`[meals/ai-generate] JSON parse failed raw=${raw.slice(0, 200)}`);
      res.status(502).json({ error: "AI returned invalid JSON. Please retry." });
      return;
    }

    let rawMeals: unknown[] = [];
    let amyMessage = "Amy has suggested these meals just for you!";

    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.meals)) rawMeals = obj.meals;
      else {
        const found = Object.values(obj).find(v => Array.isArray(v));
        rawMeals = (found as unknown[]) ?? [];
      }
      if (typeof obj.amyMessage === "string" && obj.amyMessage.trim()) {
        amyMessage = String(obj.amyMessage).slice(0, 180);
      }
    }

    if (rawMeals.length === 0) {
      res.status(502).json({ error: "AI returned no meals. Please retry." });
      return;
    }

    const SAFE_TAGS = new Set(["quick","healthy","veg","non-veg","protein","sweet","spicy","light","heavy","kids","tiffin"]);

    const meals = rawMeals.slice(0, 6).map((m, idx) => {
      if (!m || typeof m !== "object") return null;
      const o = m as Record<string, unknown>;

      const title = String(o.title ?? "").slice(0, 80) || "Meal";
      const emoji = typeof o.emoji === "string" && o.emoji.trim()
        ? o.emoji.trim().slice(0, 4)
        : DEFAULT_EMOJIS[idx % DEFAULT_EMOJIS.length];
      const ingredients = (Array.isArray(o.ingredients) ? o.ingredients : [])
        .slice(0, 8).map((i) => String(i).slice(0, 60));
      const steps = (Array.isArray(o.steps) ? o.steps : [])
        .slice(0, 6).map((s) => String(s).slice(0, 300));
      const prepMinutes = o.prepMinutes != null
        ? Math.min(120, Math.max(5, Number(o.prepMinutes) || 15))
        : parsePrepMinutes(String(o.time ?? "15 min"));
      const calories = Math.min(1200, Math.max(50, Number(o.calories) || 200));
      const tags: string[] = (Array.isArray(o.tags) ? o.tags : [])
        .slice(0, 4)
        .map((t) => String(t).toLowerCase().trim().slice(0, 20))
        .filter((t) => SAFE_TAGS.has(t));
      const isVegMeal = o.isVeg === true || o.isVeg === "true"
        || tags.includes("veg") || (isVeg === true);

      const bgGradient = AI_GENERATE_GRADIENTS[idx % AI_GENERATE_GRADIENTS.length] as [string, string];
      const id = slugify(title) + "-" + idx;
      const audioText = `${title}. Ingredients: ${ingredients.join(", ")}. Steps: ${steps.join(". ")}`;

      return {
        id,
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
        audioText,
        isVeg: isVegMeal,
        matchedIngredients: [] as string[],
        missingIngredients: [] as string[],
      };
    }).filter(Boolean);

    res.set("Cache-Control", "no-store");
    res.json({ meals, amyMessage });
  } catch (err) {
    logger.error(`[meals/ai-generate] OpenAI error ${String(err)}`);
    res.status(503).json({ error: "AI service unavailable. Please retry." });
  }
});

export default router;
