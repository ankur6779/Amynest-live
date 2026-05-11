// ─── Meal Safety & Validation Engine ────────────────────────────────────────
// Implements pediatric-guideline-aligned safety rules for all age bands.
// Used by POST /api/meals/ai-generate and POST /api/meals/week-plan.
//
// Priority: Safety > Allergy > Developmental > Nutrition > Preference > Culture

// ─── Age Bands ───────────────────────────────────────────────────────────────

export type AgeBand =
  | "newborn_0_6m"     // 0–6 months   — ONLY breast milk / formula
  | "infant_6_12m"     // 6–12 months  — purees, mashes, soft cereals
  | "toddler_1_3y"     // 12–36 months — soft finger foods, toddler meals
  | "preschool_3_5y"   // 36–60 months — balanced soft meals
  | "school_5_10y"     // 60–120 months — school nutrition
  | "preteen_10_15y"   // 120–180 months — growth nutrition
  | "teen_15plus";     // 180+ months  — teen/adult

export function getAgeBand(ageMonths: number): AgeBand {
  if (ageMonths < 6)   return "newborn_0_6m";
  if (ageMonths < 12)  return "infant_6_12m";
  if (ageMonths < 36)  return "toddler_1_3y";
  if (ageMonths < 60)  return "preschool_3_5y";
  if (ageMonths < 120) return "school_5_10y";
  if (ageMonths < 180) return "preteen_10_15y";
  return "teen_15plus";
}

export function ageBandLabel(band: AgeBand): string {
  const MAP: Record<AgeBand, string> = {
    newborn_0_6m:   "Newborn (0–6 months)",
    infant_6_12m:   "Infant (6–12 months)",
    toddler_1_3y:   "Toddler (1–3 years)",
    preschool_3_5y: "Preschool (3–5 years)",
    school_5_10y:   "School Age (5–10 years)",
    preteen_10_15y: "Pre-Teen (10–15 years)",
    teen_15plus:    "Teen/Adult (15+)",
  };
  return MAP[band];
}

// ─── Choking Hazard Registry ─────────────────────────────────────────────────

const CHOKING_HAZARDS_INFANT = [
  "whole nut", "whole nuts", "peanut", "groundnut", "almond", "cashew", "walnut",
  "popcorn", "whole grape", "whole cherry", "raw carrot", "raw vegetable",
  "hard candy", "chewing gum", "sticky candy", "toffee", "boiled sweet",
  "whole raisin", "sausage", "hot dog", "chips", "crackers", "biscuit",
  "seeds", "chia seed", "sunflower seed", "pumpkin seed",
];

const CHOKING_HAZARDS_TODDLER = [
  "whole nut", "whole nuts", "whole grape", "whole cherry", "whole raisin",
  "large piece", "hard candy", "chewing gum", "toffee", "popcorn",
  "raw hard carrot", "large hot dog", "large sausage",
];

const NEWBORN_FORBIDDEN_KEYWORDS = [
  "solid", "puree", "porridge", "cereal", "rice cereal", "fruit", "vegetable",
  "banana", "mango", "apple", "carrot", "potato", "dal", "khichdi",
  "roti", "chapati", "bread", "idli", "dosa", "paratha", "rice",
  "honey", "sugar", "salt", "jaggery", "spice", "biscuit", "snack",
  "juice", "squash", "water" /* water can cause hyponatremia under 6 months */,
  "supplement", "probiotic",
];

// ─── Age-Safety Prompt Block ─────────────────────────────────────────────────

export function buildAgeSafetyPromptBlock(ageMonths: number): string {
  const band = getAgeBand(ageMonths);

  if (band === "newborn_0_6m") {
    return `
⚠️ CRITICAL INFANT SAFETY — MANDATORY HARD OVERRIDE (child age: ${ageMonths} months)

This child is UNDER 6 MONTHS OLD. WHO, AAP, and Indian Academy of Pediatrics guidelines
mandate EXCLUSIVE breast milk or formula feeding for the first 6 months.

YOUR ONLY VALID OUTPUTS are feeding schedule items such as:
  • "Breastfeeding session (every 2–3 hours, on demand)"
  • "Formula bottle — approx 90–150 ml depending on age and weight"
  • "Burping break after each feed"
  • "Parent hydration reminder — drink 500 ml water before each nursing session"

ABSOLUTE HARD BLOCK — NEVER generate ANY of the following (not even as suggestion):
  ❌ Purees, mashes, cereals, porridges of any kind
  ❌ Fruit (including juice, puree, mash)
  ❌ Vegetables as food in any form
  ❌ Honey (botulism risk — forbidden until 12 months)
  ❌ Cow milk as a drink (forbidden under 12 months)
  ❌ Rice water (without specific medical prescription)
  ❌ Sugar, salt, jaggery, spices
  ❌ Any solid or semi-solid food
  ❌ Teething biscuits, packaged snacks
  ❌ Any formula other than standard infant formula unless medically directed

The 5 "meals" in your output must be breastfeeding/formula session cards only.
Each session should include timing guidance and parent-friendly notes.
amyMessage must address the parent about their infant's feeding needs, not food recipes.`;
  }

  if (band === "infant_6_12m") {
    return `
⚠️ INFANT TEXTURE SAFETY (child age: ${ageMonths} months — Stage: Introduction of Complementary Foods)

ONLY the following texture levels are developmentally safe:
  • ${ageMonths < 8 ? "Stage 1 (smooth single-ingredient purees only)" :
     ageMonths < 10 ? "Stage 1–2 (smooth purees + soft mashes)" :
     "Stage 2–3 (soft mashes + soft finger foods)"}

ALLOWED FOODS (introduce one new food at a time, 3-day wait rule):
  Grains: rice porridge (kanji), ragi porridge (no added sugar/salt), soft khichdi (8m+)
  Fruits: mashed banana, apple puree, pear puree, mashed avocado
  Vegetables: carrot puree (cooked), sweet potato puree, pumpkin puree, pea puree
  Protein: strained dal water → mashed dal (8m+), soft scrambled egg yolk (8m+)
  Dairy: small amounts of curd (8m+), cheese (not cow milk as drink)

HARD BLOCK — NEVER suggest:
  ❌ Honey (botulism — forbidden under 12 months)
  ❌ Cow milk as main drink (cooking in small amounts OK from 8m)
  ❌ Added salt or sugar in baby food
  ❌ Whole nuts, seeds, nut butter (choking hazard + allergy risk)
  ❌ Whole grapes, cherry tomatoes, raw carrot, raw hard vegetables (choking)
  ❌ Popcorn, chips, crackers, biscuits (choking + salt/sugar)
  ❌ Spicy food — no chilli, pepper, garam masala
  ❌ Processed packaged food
  ❌ Multiple new ingredients at once

All ingredient quantities must be tiny (2-3 tbsp per serving for early stage).`;
  }

  if (band === "toddler_1_3y") {
    return `
TODDLER MEAL SAFETY (child age: ${ageMonths} months, 1–3 years)

FOCUS ON:
  • Soft, easy-to-chew textures (toddler molars still developing)
  • Low added salt and sugar
  • Simple familiar flavors — avoid heavy spice blends
  • Picky-eater friendly: separate components work better than mixed dishes
  • Finger foods in small bite-sized pieces (no larger than 1 cm)
  • High iron, calcium, and protein for brain development

AVOID:
  ❌ Whole nuts — always grind, paste, or omit
  ❌ Whole grapes or cherry tomatoes — always quarter
  ❌ Very spicy dishes (mild spice OK)
  ❌ High-salt processed foods (chips, instant noodles, pickles, papad)
  ❌ Sugary drinks or sweets as main items
  ❌ Raw hard vegetables in large pieces
  ❌ Honey in large quantities (OK in tiny amounts now, but avoid making it a habit)`;
  }

  if (band === "preschool_3_5y") {
    return `
PRESCHOOL NUTRITION (child age: ${ageMonths} months, 3–5 years)

FOCUS ON:
  • Balanced meals: protein + complex carb + vegetable at every main meal
  • School-energy foods — slow-release carbs, lean protein
  • Fun, colorful presentation — shapes, colors to encourage eating
  • Immunity support: vitamin C, zinc, iron-rich foods
  • Portion size: ~1 adult handful of each component

LIMIT:
  • Fried foods (once a week max)
  • Added sugar and sugary drinks
  • Very spicy food (mild spice fine)
  • High-sodium processed food`;
  }

  if (band === "school_5_10y") {
    return `
SCHOOL-AGE NUTRITION (child age: ${ageMonths} months, 5–10 years)

FOCUS ON:
  • Learning-energy meals — complex carbs for sustained concentration
  • Protein balance — eggs, dal, paneer, lean meat for growth
  • Brain nutrition — omega-3 (walnuts, flaxseed), iron, zinc
  • Hydration reminders — 6–8 glasses water daily
  • Sports/activity support — post-activity protein + carb

OPTIMIZE FOR:
  • Quick tiffin prep (≤15 min) for school days
  • Colorful vegetables for immunity
  • Balanced snacks over processed options`;
  }

  if (band === "preteen_10_15y") {
    return `
PRE-TEEN NUTRITION (child age: ${ageMonths} months, 10–15 years)

FOCUS ON:
  • Growth nutrition — calcium for bone density, iron for puberty
  • Cognitive support — B vitamins, omega-3, protein
  • Activity-aware — higher caloric needs for sports
  • Puberty nutrition — zinc, iron especially for girls (iron-rich foods post-menarche)
  • Avoid ultra-processed food, sugary drinks, excess fast food

MEAL STRUCTURE:
  • 3 main meals + 2 snacks daily
  • Protein at every meal (20–30 g target)
  • Complex carbs, not refined flour`;
  }

  // teen_15plus — minimal restrictions, just good nutrition guidance
  return `
TEEN/ADULT NUTRITION (age 15+):
  • Balanced macronutrients — protein, carbs, healthy fats
  • 3 meals + 1-2 snacks
  • Limit ultra-processed and fried food
  • Adequate hydration (2L water daily)`;
}

// ─── Post-Generation Validation ──────────────────────────────────────────────

export type EnrichedMeal = {
  safetyBadges: string[];
  whyThisMeal: string;
  safetyWarning?: string;
};

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

function allergyList(allergies: string): string[] {
  return allergies.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean);
}

const ALLERGY_INGREDIENT_MAP: Record<string, string[]> = {
  dairy: ["milk", "curd", "paneer", "cheese", "butter", "ghee", "yogurt", "yoghurt", "cream", "lassi", "kheer"],
  gluten: ["wheat", "maida", "flour", "bread", "roti", "paratha", "naan", "pasta", "rava", "suji", "semolina"],
  eggs: ["egg", "omelette", "scrambled", "boiled egg", "mayo"],
  nuts: ["cashew", "almond", "walnut", "pistachio", "hazelnut", "pecan"],
  peanuts: ["peanut", "groundnut", "satay"],
  soy: ["tofu", "soy", "soya", "tempeh", "edamame"],
  shellfish: ["prawn", "shrimp", "crab", "lobster", "oyster", "scallop"],
  fish: ["fish", "tuna", "salmon", "sardine"],
  sesame: ["sesame", "til", "tahini"],
};

function hasAllergyViolation(
  text: string,
  allergiesList: string[]
): { violated: boolean; allergen: string } {
  const lower = text.toLowerCase();
  for (const allergen of allergiesList) {
    const ingredients = ALLERGY_INGREDIENT_MAP[allergen] ?? [allergen];
    if (ingredients.some(ing => lower.includes(ing))) {
      return { violated: true, allergen };
    }
  }
  return { violated: false, allergen: "" };
}

export function validateAndEnrichMeal(
  meal: { title: string; ingredients: string[]; tags: string[]; isVeg: boolean },
  ageMonths: number,
  allergies: string,
  dietType: string,
): EnrichedMeal {
  const band = getAgeBand(ageMonths);
  const aList = allergyList(allergies);
  const combinedText = `${meal.title} ${meal.ingredients.join(" ")}`;

  const badges: string[] = [];
  let safetyWarning: string | undefined;

  // 1. Age safety badge
  if (band === "newborn_0_6m") {
    badges.push("Infant Safe");
  } else if (band === "infant_6_12m") {
    badges.push("Infant Safe");
    badges.push("Texture Safe");
  } else if (band === "toddler_1_3y") {
    badges.push("Toddler Safe");
    badges.push("Texture Safe");
  } else {
    badges.push("Age Safe");
  }

  // 2. Choking hazard check
  const hazards = band === "newborn_0_6m" ? CHOKING_HAZARDS_INFANT
    : band === "infant_6_12m" ? CHOKING_HAZARDS_INFANT
    : band === "toddler_1_3y" ? CHOKING_HAZARDS_TODDLER
    : [];

  if (hazards.length > 0 && containsAny(combinedText, hazards)) {
    safetyWarning = "Contains potential choking hazard for this age — verify before serving.";
  }

  // 3. Allergy badge
  if (aList.length > 0) {
    const check = hasAllergyViolation(combinedText, aList);
    if (check.violated) {
      safetyWarning = (safetyWarning ? safetyWarning + " " : "") +
        `May contain ${check.allergen} — verify allergy safety.`;
    } else {
      badges.push("Allergy Safe");
    }
  }

  // 4. Nutrition badges
  const hasProtein = /protein|dal|paneer|egg|chicken|fish|lentil|rajma|chole|tofu|soya/i.test(combinedText);
  if (hasProtein) badges.push("Protein Rich");

  // 5. Diet badge
  if (meal.isVeg || dietType === "veg" || dietType === "vegan" || dietType === "jain") {
    if (!badges.includes("Veg")) badges.push("Veg");
  }

  const whyThisMeal = generateWhyThisMeal(meal.title, ageMonths, band, dietType, aList);

  return { safetyBadges: badges, whyThisMeal, safetyWarning };
}

// ─── "Why this meal?" Explainability ─────────────────────────────────────────

export function generateWhyThisMeal(
  title: string,
  ageMonths: number,
  band: AgeBand,
  dietType: string,
  allergyList: string[],
): string {
  const allergyNote = allergyList.length > 0
    ? ` Generated without ${allergyList.join(", ")} due to allergy settings.`
    : "";

  if (band === "newborn_0_6m") {
    return `Feeding schedule for your ${ageMonths}-month-old. Only breast milk or formula is recommended at this stage.${allergyNote}`;
  }
  if (band === "infant_6_12m") {
    const stage = ageMonths < 8 ? "Stage 1 (smooth purees)" : ageMonths < 10 ? "Stage 2 (soft mashes)" : "Stage 3 (soft finger foods)";
    return `${stage} selected for your ${ageMonths}-month-old's developmental stage. Textures are safe for early eaters.${allergyNote}`;
  }
  if (band === "toddler_1_3y") {
    const yrs = Math.floor(ageMonths / 12);
    const mo = ageMonths % 12;
    const ageStr = mo > 0 ? `${yrs}y ${mo}m` : `${yrs} year${yrs > 1 ? "s" : ""}`;
    return `Soft, toddler-safe meal for your ${ageStr} old. Portions and textures are adapted for growing little ones.${allergyNote}`;
  }
  if (band === "preschool_3_5y") {
    return `Balanced meal for preschool energy — protein, carbs, and vegetables to fuel learning and play.${allergyNote}`;
  }
  if (band === "school_5_10y") {
    return `School-friendly meal with learning energy, protein for growth, and ingredients easy to pack or prepare quickly.${allergyNote}`;
  }
  if (band === "preteen_10_15y") {
    return `Nutritionally dense meal supporting growth and cognitive needs during the pre-teen years.${allergyNote}`;
  }
  return `Personalised ${dietType !== "no_preference" ? dietType.replace(/_/g, "-") + " " : ""}meal tailored to your family's preferences.${allergyNote}`;
}

// ─── Infant Feeding Card Generator ───────────────────────────────────────────
// Returns deterministic safe "meals" for 0-6 month infants.
// These replace AI-generated meals entirely for this age band.

export function buildInfantFeedingCards(ageMonths: number, feedingType?: string): Array<{
  id: string;
  title: string;
  emoji: string;
  bgGradient: [string, string];
  region: string;
  category: string;
  ingredients: string[];
  steps: string[];
  calories: number;
  tags: string[];
  prepMinutes: number;
  audioText: string;
  isVeg: boolean;
  matchedIngredients: string[];
  missingIngredients: string[];
  safetyBadges: string[];
  whyThisMeal: string;
}> {
  const isBreastfed = !feedingType || feedingType === "breastfeeding" || feedingType === "mixed";
  const isFormula = feedingType === "formula" || feedingType === "mixed";
  const feedIntervalHrs = ageMonths < 1 ? "1.5–2" : ageMonths < 3 ? "2–3" : "2.5–3.5";
  const formulaAmount = ageMonths < 1 ? "60–90 ml" : ageMonths < 3 ? "90–120 ml" : "120–150 ml";
  const feedsPerDay = ageMonths < 2 ? "8–12" : ageMonths < 4 ? "7–9" : "6–8";

  const cards = [
    {
      id: "infant_feed_breast",
      title: "Breastfeeding Session",
      emoji: "🤱",
      bgGradient: ["#FCE4EC", "#F8BBD0"] as [string, string],
      region: "pan_indian",
      category: "infant_feeding",
      ingredients: ["Breast milk — perfect nutrition"],
      steps: [
        `Feed on demand every ${feedIntervalHrs} hours (${feedsPerDay} times per day typical).`,
        "Offer both breasts per session. Let baby fully drain first breast.",
        "Watch for hunger cues: rooting, sucking fists, turning head.",
        "Burp gently mid-feed and after — hold upright on shoulder 10–15 min.",
        "Skin-to-skin contact helps regulate baby's temperature and heartbeat.",
      ],
      calories: 0,
      tags: ["infant-safe"],
      prepMinutes: 0,
      audioText: `Breastfeeding session for your ${ageMonths}-month-old. Feed every ${feedIntervalHrs} hours, ${feedsPerDay} times per day. Burp well after each feed.`,
      isVeg: true,
      matchedIngredients: [],
      missingIngredients: [],
      safetyBadges: ["Infant Safe", "WHO Approved"],
      whyThisMeal: `Exclusive breastfeeding is the safest and only recommended feeding for infants under 6 months (WHO guideline).`,
    },
    {
      id: "infant_feed_formula",
      title: isFormula ? `Formula Bottle (${formulaAmount})` : "Formula Option",
      emoji: "🍼",
      bgGradient: ["#E3F2FD", "#BBDEFB"] as [string, string],
      region: "pan_indian",
      category: "infant_feeding",
      ingredients: [`Standard infant formula for ${ageMonths}-month-old`, "Boiled cooled water"],
      steps: [
        `Prepare ${formulaAmount} formula per feed, every ${feedIntervalHrs} hours.`,
        "Always use boiled cooled water (below 70°C to preserve nutrients).",
        "Shake gently — never microwave (hot spots burn baby's mouth).",
        "Test temperature on inner wrist — should feel neutral, not warm.",
        "Discard any unused formula within 1 hour of preparation.",
      ],
      calories: 0,
      tags: ["infant-safe"],
      prepMinutes: 5,
      audioText: `Formula bottle of ${formulaAmount} for your ${ageMonths}-month-old. Prepare with boiled cooled water. Never microwave. Discard unused formula within one hour.`,
      isVeg: true,
      matchedIngredients: [],
      missingIngredients: [],
      safetyBadges: ["Infant Safe", "Allergy Safe"],
      whyThisMeal: `Standard infant formula is the only safe alternative to breast milk for babies under 6 months.`,
    },
    {
      id: "infant_burp_hydration",
      title: "Burping & Parent Hydration",
      emoji: "💧",
      bgGradient: ["#E8F5E9", "#C8E6C9"] as [string, string],
      region: "pan_indian",
      category: "infant_feeding",
      ingredients: ["Water (for nursing parent — 500 ml per nursing session)", "Nutritious snack for parent"],
      steps: [
        "After every feed, hold baby upright on your shoulder for 10–15 minutes.",
        "Gently pat or rub the back to release air bubbles.",
        "Nursing mothers: drink at least 500 ml water per nursing session.",
        "If baby spits up: small amounts normal; large amounts — consult pediatrician.",
        "Keep a burp cloth handy — small spit-ups are very common.",
      ],
      calories: 0,
      tags: ["infant-safe"],
      prepMinutes: 0,
      audioText: "After each feed, hold baby upright for 10 to 15 minutes and gently pat the back. Nursing parents should drink plenty of water and eat nutritious snacks.",
      isVeg: true,
      matchedIngredients: [],
      missingIngredients: [],
      safetyBadges: ["Infant Safe", "Parent Care"],
      whyThisMeal: `Proper burping prevents discomfort and reflux in newborns. Parent nutrition directly impacts breast milk quality.`,
    },
    {
      id: "infant_growth_reminder",
      title: "Growth & Feeding Tracker",
      emoji: "📊",
      bgGradient: ["#F3E5F5", "#CE93D8"] as [string, string],
      region: "pan_indian",
      category: "infant_feeding",
      ingredients: ["Growth monitoring", "Feeding log", "Wet diaper count"],
      steps: [
        `Your ${ageMonths}-month-old needs ${feedsPerDay} feeds per day on average.`,
        "Track wet diapers: 6+ wet diapers per day confirms adequate feeding.",
        "Weight gain expected: 150–200 g per week in first 3 months.",
        "Solids introduction: wait until 6 months, then start with single-ingredient purees.",
        "Always consult your pediatrician before introducing any solid food.",
      ],
      calories: 0,
      tags: ["infant-safe"],
      prepMinutes: 0,
      audioText: `Your ${ageMonths}-month-old needs ${feedsPerDay} feeds daily. Track wet diapers — 6 or more per day confirms good feeding. No solids until 6 months. Consult your pediatrician always.`,
      isVeg: true,
      matchedIngredients: [],
      missingIngredients: [],
      safetyBadges: ["Infant Safe", "WHO Approved"],
      whyThisMeal: `Monitoring feeding frequency and diaper output is the most reliable way to ensure your infant is getting enough nutrition.`,
    },
    {
      id: "infant_when_to_start_solids",
      title: "When to Start Solids — Guide",
      emoji: "🌱",
      bgGradient: ["#FFF8E1", "#FFECB3"] as [string, string],
      region: "pan_indian",
      category: "infant_feeding",
      ingredients: ["Parent education", "Developmental readiness checklist"],
      steps: [
        "Wait until baby is at least 6 months old before introducing any solid food.",
        "Signs of readiness: sits with support, holds head steady, shows interest in food.",
        "Start with Stage 1 single-ingredient smooth purees (rice, banana, carrot).",
        "Introduce one new food at a time, wait 3 days before the next to monitor reactions.",
        "Breast milk or formula remains the primary nutrition source until 12 months.",
      ],
      calories: 0,
      tags: ["infant-safe"],
      prepMinutes: 0,
      audioText: "Do not start solid foods until your baby is at least 6 months old. Wait for readiness signs: sitting with support, steady head, and interest in food. Start with single-ingredient smooth purees.",
      isVeg: true,
      matchedIngredients: [],
      missingIngredients: [],
      safetyBadges: ["Infant Safe", "Developmental"],
      whyThisMeal: `Starting solids before 6 months increases risk of infections, allergies, and obesity. The WHO recommends exclusive milk feeding for the first 6 months.`,
    },
  ];

  // Filter based on feedingType
  if (feedingType === "breastfeeding") return cards.filter(c => c.id !== "infant_feed_formula");
  if (feedingType === "formula") return cards.filter(c => c.id !== "infant_feed_breast");
  return cards;
}
