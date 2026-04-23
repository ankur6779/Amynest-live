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

// ─── AI Meal Generator ───────────────────────────────────────────────────────
// GET /api/meals/generate?count=5&region=north&type=breakfast&isVeg=true
//
// Generates fresh meal ideas using AI based on region + meal type.
// Results are in-memory cached per unique key for 30 minutes so the same
// prompt isn't re-sent to the model on every page load.

const GENERATE_CACHE = new Map<string, { meals: unknown[]; ts: number }>();
const GENERATE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Map user-friendly input to prompt labels
const REGION_LABEL: Record<string, string> = {
  north: "north",
  south: "south",
  west: "west",
  east: "east",
  all:   "all",
  // also accept internal names
  north_indian:  "north",
  south_indian:  "south",
  maharashtrian: "west",
  gujarati:      "west",
  bengali:       "east",
  punjabi:       "north",
  pan_indian:    "all",
  global:        "all",
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
  // ── Auth — requireAuth middleware guarantees a userId here ─────────────
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Login required to use meal generator." });
    return;
  }

  // ── Validate inputs ────────────────────────────────────────────────────
  const countRaw = Math.min(8, Math.max(1, Number(req.query.count ?? 5) || 5));
  const count = Number.isFinite(countRaw) ? Math.floor(countRaw) : 5;

  const regionInput = String(req.query.region ?? "all").toLowerCase().trim();
  const region = REGION_LABEL[regionInput] ?? "all";

  const typeInput = String(req.query.type ?? "breakfast").toLowerCase().trim();
  const type = ALLOWED_TYPES.has(typeInput) ? typeInput : "breakfast";

  const isVegParam = req.query.isVeg;
  const isVeg =
    isVegParam === "true" ? true : isVegParam === "false" ? false : undefined;

  // ── In-memory cache ────────────────────────────────────────────────────
  const cacheKey = `${region}:${type}:${count}:${String(isVeg)}`;
  const cached = GENERATE_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < GENERATE_CACHE_TTL_MS) {
    res.set("Cache-Control", "private, max-age=1800");
    res.set("X-Cache", "HIT");
    res.json({ meals: cached.meals, cached: true });
    return;
  }

  // ── Call OpenAI ────────────────────────────────────────────────────────
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

    // Model may return { meals: [...] } or a bare array wrapped as object
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.warn(`[meals/generate] JSON parse failed raw=${raw.slice(0, 200)}`);
      res.status(502).json({ error: "AI returned invalid JSON. Please retry." });
      return;
    }

    // Normalise to array — model may wrap in { meals: [...] } or return bare array
    let meals: unknown[];
    if (Array.isArray(parsed)) {
      meals = parsed;
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      // find first array value
      const found = Object.values(obj).find(v => Array.isArray(v));
      meals = (found as unknown[]) ?? [];
    } else {
      meals = [];
    }

    if (meals.length === 0) {
      res.status(502).json({ error: "AI returned no meals. Please retry." });
      return;
    }

    // ── Sanitise each meal object (keep only expected keys) ───────────────
    const SAFE_TAGS = new Set([
      "quick", "healthy", "veg", "non-veg", "protein",
      "sweet", "spicy", "light", "heavy", "kids", "tiffin",
    ]);
    const sanitised = meals.slice(0, 8).map((m) => {
      if (!m || typeof m !== "object") return null;
      const o = m as Record<string, unknown>;
      return {
        title:        String(o.title ?? "").slice(0, 80),
        type:         ALLOWED_TYPES.has(String(o.type)) ? String(o.type) : type,
        region:       String(o.region ?? region).slice(0, 40),
        ingredients:  (Array.isArray(o.ingredients) ? o.ingredients : [])
                        .slice(0, 7)
                        .map((i) => String(i).slice(0, 40)),
        time:         String(o.time ?? "").slice(0, 20),
        calories:     Math.min(1200, Math.max(50, Number(o.calories) || 200)),
        tags:         (Array.isArray(o.tags) ? o.tags : [])
                        .slice(0, 6)
                        .map((t) => String(t).toLowerCase().slice(0, 20))
                        .filter((t) => SAFE_TAGS.has(t)),
        steps:        (Array.isArray(o.steps) ? o.steps : [])
                        .slice(0, 5)
                        .map((s) => String(s).slice(0, 300)),
        imageKeyword: String(o.imageKeyword ?? "").slice(0, 60),
      };
    }).filter(Boolean);

    // ── Cache and return ──────────────────────────────────────────────────
    GENERATE_CACHE.set(cacheKey, { meals: sanitised, ts: Date.now() });

    res.set("Cache-Control", "private, max-age=1800");
    res.set("X-Cache", "MISS");
    res.json({ meals: sanitised, cached: false });
  } catch (err) {
    logger.error(`[meals/generate] OpenAI error ${String(err)}`);
    res.status(503).json({ error: "AI service unavailable. Please retry." });
  }
});

export default router;
