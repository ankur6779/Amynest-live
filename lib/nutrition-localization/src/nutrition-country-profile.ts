/**
 * Nutrition Country Profile Engine — global-first, country-aware content selection.
 *
 * Fallback priority: parent country → region profile → global English.
 * Language controls UI translation only — never selects country content.
 * Never defaults to India unless country or explicit Indian foodStyle.
 */

export type NutritionCountryCode = "IN" | "US" | "GB" | "AU" | "NZ" | "AE" | "CA" | "SG" | "GLOBAL";

export type NutritionRegionCode = "IN" | "US" | "GB" | "AU" | "CA" | "NZ" | "global";

export type PortionTerminology = "katori" | "cup" | "portion";

export type GroceryUnitSystem = "us_imperial" | "metric";

export type NutritionSeason = "summer" | "monsoon" | "winter" | "spring" | "autumn";

export type SchoolLunchTermId = "tiffin" | "school_lunch" | "packed_lunch" | "lunchbox";

export type IngredientRulePack = {
  keywords: string[];
  item: string;
  category: "vegetables" | "fruits" | "proteins" | "grains" | "dairy";
  unit: "kg" | "L" | "count";
  perMention: number;
};

export type MealPrepPattern = {
  id: string;
  pattern: RegExp;
  minMatches: number;
  title: string;
  detail: string;
  dayHint: "Saturday" | "Sunday" | "Weekend";
};

export type NutritionCountryProfile = {
  country: NutritionCountryCode;
  regionCode: NutritionRegionCode;
  defaultFoodStyle: string;
  mealPlanCuisines: string[];
  portionTerminology: PortionTerminology;
  guidanceAuthority: string;
  hemisphere: "north" | "south";
  seasonModel: "india_subtropical" | "northern_temperate" | "southern_temperate" | "tropical_equatorial";
  schoolLunchTerm: SchoolLunchTermId;
  schoolLunchLabel: string;
  groceryUnitSystem: GroceryUnitSystem;
  groceryStaples: string[];
  groceryKeywordPack: IngredientRulePack[];
  tiffinFallbacks: string[];
  mealPrepPatterns: MealPrepPattern[];
  seasonalKeywords: Record<NutritionSeason, string[]>;
  seasonalTips: Record<NutritionSeason, string[]>;
  seasonalHighlightLabels: Record<NutritionSeason, string>;
};

export type NutritionProfileInput = {
  country?: string | null;
  region?: string | null;
  language?: string | null;
  foodStyle?: string | null;
};

const INDIAN_FOOD_STYLES = new Set([
  "indian",
  "north_indian",
  "south_indian",
  "pan_indian",
  "gujarati",
  "maharashtrian",
  "punjabi",
  "bengali",
]);

const SHARED_VEG_KEYWORDS: IngredientRulePack[] = [
  { keywords: ["tomato"], item: "Tomato", category: "vegetables", unit: "count", perMention: 0.5 },
  { keywords: ["onion"], item: "Onion", category: "vegetables", unit: "count", perMention: 0.35 },
  { keywords: ["potato"], item: "Potato", category: "vegetables", unit: "count", perMention: 0.4 },
  { keywords: ["carrot"], item: "Carrot", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["broccoli"], item: "Broccoli", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["spinach"], item: "Spinach / Greens", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["cucumber"], item: "Cucumber", category: "vegetables", unit: "count", perMention: 0.2 },
  { keywords: ["banana"], item: "Banana", category: "fruits", unit: "count", perMention: 0.4 },
  { keywords: ["apple"], item: "Apple", category: "fruits", unit: "count", perMention: 0.35 },
  { keywords: ["orange"], item: "Orange", category: "fruits", unit: "count", perMention: 0.3 },
  { keywords: ["berries", "strawberr"], item: "Berries", category: "fruits", unit: "count", perMention: 0.3 },
  { keywords: ["seasonal fruit", "fruit"], item: "Seasonal fruit", category: "fruits", unit: "count", perMention: 0.25 },
];

const US_GROCERY: IngredientRulePack[] = [
  ...SHARED_VEG_KEYWORDS,
  { keywords: ["oatmeal", "oat", "cereal"], item: "Oats / Cereal", category: "grains", unit: "count", perMention: 0.15 },
  { keywords: ["bread", "toast", "sandwich"], item: "Bread", category: "grains", unit: "count", perMention: 0.2 },
  { keywords: ["peanut butter"], item: "Peanut butter", category: "proteins", unit: "count", perMention: 0.15 },
  { keywords: ["turkey"], item: "Turkey", category: "proteins", unit: "kg", perMention: 0.12 },
  { keywords: ["chicken"], item: "Chicken", category: "proteins", unit: "kg", perMention: 0.12 },
  { keywords: ["yogurt", "parfait"], item: "Yogurt", category: "dairy", unit: "count", perMention: 0.2 },
  { keywords: ["milk"], item: "Milk", category: "dairy", unit: "L", perMention: 0.25 },
  { keywords: ["cheese"], item: "Cheese", category: "dairy", unit: "count", perMention: 0.15 },
  { keywords: ["egg", "omelette"], item: "Eggs", category: "proteins", unit: "count", perMention: 0.2 },
  { keywords: ["rice", "bowl"], item: "Rice", category: "grains", unit: "kg", perMention: 0.3 },
  { keywords: ["pasta", "mac"], item: "Pasta", category: "grains", unit: "count", perMention: 0.15 },
  { keywords: ["lentil", "bean"], item: "Beans / Lentils", category: "proteins", unit: "kg", perMention: 0.15 },
];

const UK_GROCERY: IngredientRulePack[] = [
  ...SHARED_VEG_KEYWORDS,
  { keywords: ["porridge", "oat"], item: "Porridge oats", category: "grains", unit: "count", perMention: 0.15 },
  { keywords: ["bread", "toast", "sandwich"], item: "Bread", category: "grains", unit: "count", perMention: 0.2 },
  { keywords: ["potato", "jacket"], item: "Potatoes", category: "vegetables", unit: "count", perMention: 0.35 },
  { keywords: ["cheese"], item: "Cheese", category: "dairy", unit: "count", perMention: 0.15 },
  { keywords: ["yogurt", "yoghurt"], item: "Yogurt", category: "dairy", unit: "count", perMention: 0.2 },
  { keywords: ["milk"], item: "Milk", category: "dairy", unit: "L", perMention: 0.25 },
  { keywords: ["fish pie", "fish", "salmon"], item: "Fish", category: "proteins", unit: "kg", perMention: 0.12 },
  { keywords: ["baked beans", "beans"], item: "Baked beans", category: "proteins", unit: "count", perMention: 0.15 },
  { keywords: ["egg"], item: "Eggs", category: "proteins", unit: "count", perMention: 0.2 },
  { keywords: ["pasta"], item: "Pasta", category: "grains", unit: "count", perMention: 0.15 },
];

const AU_GROCERY: IngredientRulePack[] = [
  ...SHARED_VEG_KEYWORDS,
  { keywords: ["weet-bix", "weetbix", "cereal"], item: "Weet-Bix / Cereal", category: "grains", unit: "count", perMention: 0.15 },
  { keywords: ["wrap"], item: "Wraps", category: "grains", unit: "count", perMention: 0.2 },
  { keywords: ["avocado"], item: "Avocado", category: "fruits", unit: "count", perMention: 0.25 },
  { keywords: ["greek yogurt", "yogurt", "yoghurt"], item: "Greek yogurt", category: "dairy", unit: "count", perMention: 0.2 },
  { keywords: ["milk"], item: "Milk", category: "dairy", unit: "L", perMention: 0.25 },
  { keywords: ["cheese"], item: "Cheese", category: "dairy", unit: "count", perMention: 0.15 },
  { keywords: ["chicken", "beef", "lamb"], item: "Meat (chicken / beef)", category: "proteins", unit: "kg", perMention: 0.12 },
  { keywords: ["fruit tub", "fruit"], item: "Fruit tubs", category: "fruits", unit: "count", perMention: 0.25 },
  { keywords: ["bread", "sandwich"], item: "Bread", category: "grains", unit: "count", perMention: 0.15 },
  { keywords: ["egg"], item: "Eggs", category: "proteins", unit: "count", perMention: 0.2 },
];

const IN_GROCERY: IngredientRulePack[] = [
  { keywords: ["tomato"], item: "Tomato", category: "vegetables", unit: "count", perMention: 0.5 },
  { keywords: ["onion"], item: "Onion", category: "vegetables", unit: "count", perMention: 0.35 },
  { keywords: ["palak", "spinach", "saag"], item: "Spinach / Greens", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["potato", "aloo"], item: "Potato", category: "vegetables", unit: "count", perMention: 0.4 },
  { keywords: ["carrot", "gajar"], item: "Carrot", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["bhindi", "okra"], item: "Bhindi", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["banana"], item: "Banana", category: "fruits", unit: "count", perMention: 0.4 },
  { keywords: ["apple"], item: "Apple", category: "fruits", unit: "count", perMention: 0.35 },
  { keywords: ["mango"], item: "Mango", category: "fruits", unit: "count", perMention: 0.35 },
  { keywords: ["dal", "lentil", "moong", "toor", "masoor", "sambar", "sambhar", "rajma", "chole"], item: "Dal / Pulses", category: "proteins", unit: "kg", perMention: 0.18 },
  { keywords: ["chicken", "mutton", "fish", "prawn"], item: "Protein (chicken / fish / meat)", category: "proteins", unit: "kg", perMention: 0.12 },
  { keywords: ["rice", "chawal"], item: "Rice", category: "grains", unit: "kg", perMention: 0.35 },
  { keywords: ["roti", "chapati", "paratha", "atta"], item: "Whole wheat flour (atta)", category: "grains", unit: "kg", perMention: 0.12 },
  { keywords: ["ragi", "millet", "poha", "upma", "idli", "dosa", "khichdi"], item: "Grains / millets", category: "grains", unit: "kg", perMention: 0.1 },
  { keywords: ["curd", "dahi", "yogurt"], item: "Curd (dahi)", category: "dairy", unit: "count", perMention: 0.2 },
  { keywords: ["paneer"], item: "Paneer", category: "dairy", unit: "kg", perMention: 0.08 },
  { keywords: ["ghee", "butter"], item: "Ghee / Butter", category: "dairy", unit: "count", perMention: 0.15 },
  { keywords: ["milk"], item: "Milk", category: "dairy", unit: "L", perMention: 0.25 },
];

const AE_GROCERY: IngredientRulePack[] = [
  ...SHARED_VEG_KEYWORDS,
  { keywords: ["hummus"], item: "Hummus", category: "proteins", unit: "count", perMention: 0.15 },
  { keywords: ["pita", "flatbread"], item: "Pita bread", category: "grains", unit: "count", perMention: 0.2 },
  { keywords: ["labneh"], item: "Labneh", category: "dairy", unit: "count", perMention: 0.15 },
  { keywords: ["rice", "bowl"], item: "Rice", category: "grains", unit: "kg", perMention: 0.3 },
  { keywords: ["chicken", "lamb"], item: "Chicken / Lamb", category: "proteins", unit: "kg", perMention: 0.12 },
  { keywords: ["yogurt", "yoghurt"], item: "Yogurt", category: "dairy", unit: "count", perMention: 0.2 },
  { keywords: ["milk"], item: "Milk", category: "dairy", unit: "L", perMention: 0.25 },
  { keywords: ["cheese"], item: "Cheese", category: "dairy", unit: "count", perMention: 0.15 },
  { keywords: ["wrap", "sandwich"], item: "Wraps / Bread", category: "grains", unit: "count", perMention: 0.15 },
];

const GLOBAL_GROCERY: IngredientRulePack[] = [
  ...SHARED_VEG_KEYWORDS,
  { keywords: ["bread", "toast", "sandwich", "wrap"], item: "Bread / Wraps", category: "grains", unit: "count", perMention: 0.18 },
  { keywords: ["oat", "porridge", "cereal"], item: "Oats / Cereal", category: "grains", unit: "count", perMention: 0.15 },
  { keywords: ["rice", "pasta"], item: "Rice / Pasta", category: "grains", unit: "kg", perMention: 0.25 },
  { keywords: ["chicken", "fish", "turkey", "meat"], item: "Protein (chicken / fish)", category: "proteins", unit: "kg", perMention: 0.12 },
  { keywords: ["lentil", "bean", "hummus"], item: "Beans / Lentils", category: "proteins", unit: "kg", perMention: 0.15 },
  { keywords: ["egg"], item: "Eggs", category: "proteins", unit: "count", perMention: 0.2 },
  { keywords: ["milk", "yogurt", "yoghurt", "cheese"], item: "Dairy", category: "dairy", unit: "L", perMention: 0.2 },
];

const TEMPERATE_NORTH_KEYWORDS: Record<NutritionSeason, string[]> = {
  spring: ["asparagus", "peas", "strawberr", "salad", "light soup"],
  summer: ["watermelon", "cucumber", "berries", "salad", "grill", "smoothie", "melon"],
  autumn: ["apple", "pumpkin", "squash", "soup", "root vegetable"],
  winter: ["soup", "stew", "porridge", "oatmeal", "casserole", "potato", "root"],
  monsoon: ["soup", "warm", "ginger", "comfort"],
};

const TEMPERATE_NORTH_TIPS: Record<NutritionSeason, string[]> = {
  spring: ["Fresh greens and lighter meals suit spring appetites.", "Add colourful salads to lunchboxes."],
  summer: ["Prioritise hydrating fruit and lighter meals.", "Keep cold snacks and water-rich foods on the list."],
  autumn: ["Root vegetables and hearty soups are in season.", "Warm breakfasts support active school days."],
  winter: ["Warm, nourishing meals help in colder months.", "Include soups, stews, and whole grains."],
  monsoon: ["Comfort foods and warm meals work well in wet weather.", "Include ginger and easy-to-digest options."],
};

const TEMPERATE_NORTH_LABELS: Record<NutritionSeason, string> = {
  spring: "Fresh & light — great for spring",
  summer: "Cooling & hydrating — great for summer",
  autumn: "Hearty & seasonal — ideal for autumn",
  winter: "Warm & nourishing — ideal for winter",
  monsoon: "Comfort food — suits rainy-season appetites",
};

const INDIA_KEYWORDS: Record<NutritionSeason, string[]> = {
  summer: ["watermelon", "cucumber", "curd", "dahi", "lassi", "mango", "buttermilk", "coconut"],
  monsoon: ["corn", "bhutta", "soup", "khichdi", "ginger", "turmeric", "pakora", "tea"],
  winter: ["carrot", "gajar", "spinach", "palak", "mustard", "sarson", "peas", "methi", "paratha"],
  spring: ["mango", "cucumber", "sprout"],
  autumn: ["corn", "pumpkin", "gourd"],
};

const INDIA_TIPS: Record<NutritionSeason, string[]> = {
  summer: ["Prioritise curd, seasonal fruit, and light meals.", "Keep hydration foods on the grocery list."],
  monsoon: ["Warm, easy-to-digest meals work well in monsoon.", "Include ginger and turmeric in home cooking."],
  winter: ["Root vegetables and greens are in season.", "Hearty breakfasts support active school days."],
  spring: ["Light meals and early summer fruit work well.", "Keep lunchboxes easy to digest."],
  autumn: ["Transition to warmer, nourishing options.", "Include seasonal gourds and greens."],
};

const INDIA_LABELS: Record<NutritionSeason, string> = {
  summer: "Cooling & hydrating — great for summer",
  monsoon: "Comfort food — suits monsoon appetites",
  winter: "Warm & nourishing — ideal for winter",
  spring: "Fresh & light — great for spring",
  autumn: "Hearty & seasonal — ideal for autumn",
};

const US_TIFFIN = [
  "Turkey sandwich + apple slices",
  "PB&J wrap + carrot sticks",
  "Cheese quesadilla + grapes",
  "Hummus wrap + cucumber",
  "Yogurt parfait + berries",
];

const UK_TIFFIN = [
  "Cheese sandwich + apple",
  "Pasta salad + fruit",
  "Hummus wrap + carrot sticks",
  "Egg sandwich + banana",
  "Jacket potato bites + yogurt",
];

const AU_TIFFIN = [
  "Vegemite sandwich + fruit tub",
  "Chicken wrap + apple",
  "Cheese & crackers + grapes",
  "Tuna wrap + cucumber",
  "Greek yogurt + berries",
];

const IN_TIFFIN = [
  "Vegetable paratha + fruit",
  "Idli with chutney",
  "Poha with peanuts",
  "Roti roll with paneer",
  "Curd rice with pickle",
];

const AE_TIFFIN = [
  "Hummus pita + cucumber",
  "Chicken rice bowl",
  "Labneh wrap + fruit",
  "Cheese sandwich + carrot sticks",
  "Falafel wrap + grapes",
];

const GLOBAL_TIFFIN = [
  "Whole grain wrap + veggies",
  "Cheese sandwich + fruit",
  "Hummus wrap + cucumber",
  "Pasta salad + fruit",
  "Yogurt + berries",
];

const SG_GROCERY: IngredientRulePack[] = [
  ...SHARED_VEG_KEYWORDS,
  { keywords: ["rice", "chicken rice", "jasmine"], item: "Jasmine rice", category: "grains", unit: "kg", perMention: 0.3 },
  { keywords: ["noodle", "mee", "vermicelli", "laksa"], item: "Rice noodles / mee", category: "grains", unit: "count", perMention: 0.15 },
  { keywords: ["bread", "toast", "sandwich", "kaya"], item: "Bread", category: "grains", unit: "count", perMention: 0.18 },
  { keywords: ["bok choy", "chye sim", "kangkong", "vegetable"], item: "Asian greens", category: "vegetables", unit: "count", perMention: 0.25 },
  { keywords: ["tofu", "tau kwa"], item: "Tofu", category: "proteins", unit: "count", perMention: 0.2 },
  { keywords: ["chicken", "fish", "steamed fish"], item: "Chicken / Fish", category: "proteins", unit: "kg", perMention: 0.12 },
  { keywords: ["egg", "soft-boiled"], item: "Eggs", category: "proteins", unit: "count", perMention: 0.2 },
  { keywords: ["milk", "soy milk"], item: "Milk", category: "dairy", unit: "L", perMention: 0.25 },
  { keywords: ["yogurt", "yoghurt"], item: "Yogurt", category: "dairy", unit: "count", perMention: 0.2 },
  { keywords: ["mango", "papaya", "banana", "fruit"], item: "Tropical fruit", category: "fruits", unit: "count", perMention: 0.3 },
  { keywords: ["soy sauce", "ginger"], item: "Soy sauce / ginger", category: "vegetables", unit: "count", perMention: 0.1 },
];

const SG_TIFFIN = [
  "Chicken rice + cucumber slices",
  "Mee soup + fruit",
  "Kaya toast + banana",
  "Egg sandwich + cherry tomatoes",
  "Yogurt + tropical fruit",
];

const TROPICAL_EQ_KEYWORDS: Record<NutritionSeason, string[]> = {
  summer: ["watermelon", "cucumber", "coconut", "mango", "papaya", "smoothie", "cold noodle", "salad"],
  monsoon: ["soup", "warm", "ginger", "noodle soup", "rice porridge", "steamed"],
  winter: ["soup", "porridge", "rice", "steamed fish", "warm vegetable"],
  spring: ["mango", "salad", "light stir-fry", "fruit"],
  autumn: ["pumpkin", "root vegetable", "soup", "rice bowl"],
};

const TROPICAL_EQ_TIPS: Record<NutritionSeason, string[]> = {
  summer: ["Keep lunchboxes light and hydrating in hot, humid months.", "Include tropical fruit and plenty of water."],
  monsoon: ["Warm soups and rice bowls suit the wet season.", "Pack foods that travel well in humid weather."],
  winter: ["Light warm meals work well during cooler, rainy weeks.", "Include steamed vegetables and gentle proteins."],
  spring: ["Fresh greens and lighter hawker-style meals suit spring.", "Balance rice or noodles with vegetables."],
  autumn: ["Hearty rice bowls and soups fit transitional months.", "Use seasonal tropical fruit where possible."],
};

const TROPICAL_EQ_LABELS: Record<NutritionSeason, string> = {
  summer: "Light & hydrating — great for hot months",
  monsoon: "Warm & comforting — suits the wet season",
  winter: "Nourishing & warm — ideal for rainy weeks",
  spring: "Fresh & balanced — great for spring",
  autumn: "Hearty & seasonal — ideal for autumn",
};

const IN_MEAL_PREP: MealPrepPattern[] = [
  { id: "soak-dal", pattern: /\bdal\b|lentil|moong|toor|masoor|sambar|sambhar/g, minMatches: 2, title: "Soak dal on Sunday", detail: "Rinse and soak toor/moong dal for quicker weekday cooking.", dayHint: "Sunday" },
  { id: "soak-rajma", pattern: /rajma|chole|chickpea|kidney bean/g, minMatches: 1, title: "Soak rajma or chole overnight", detail: "Long-soak pulses cook faster for mid-week meals.", dayHint: "Saturday" },
  { id: "prep-batter", pattern: /idli|dosa|batter/g, minMatches: 1, title: "Ferment idli/dosa batter", detail: "Start batter Saturday evening for fresh South Indian breakfasts.", dayHint: "Saturday" },
  { id: "prep-dough", pattern: /paratha|roti|chapati|atta/g, minMatches: 2, title: "Prep atta dough balls", detail: "Portion whole-wheat dough for quick weekday parathas.", dayHint: "Sunday" },
];

const WESTERN_MEAL_PREP: MealPrepPattern[] = [
  { id: "prep-lunchboxes", pattern: /sandwich|wrap|lunchbox|packed lunch|school lunch/g, minMatches: 2, title: "Prep lunchbox components", detail: "Wash fruit, portion snacks, and prep sandwich fillings for the week.", dayHint: "Sunday" },
  { id: "batch-grains", pattern: /oatmeal|porridge|rice|pasta|bowl/g, minMatches: 2, title: "Batch cook grains", detail: "Cook rice or pasta portions ahead for quick weekday meals.", dayHint: "Sunday" },
  { id: "prep-veg", pattern: /vegetable|salad|broccoli|carrot|stick/g, minMatches: 3, title: "Prepare vegetable mix", detail: "Wash, peel, and chop vegetables for the week.", dayHint: "Sunday" },
  { id: "prep-protein", pattern: /chicken|turkey|fish|egg|tofu/g, minMatches: 2, title: "Prep protein portions", detail: "Cook or marinate protein for quick assembly on busy nights.", dayHint: "Saturday" },
];

const SG_MEAL_PREP: MealPrepPattern[] = [
  { id: "prep-rice", pattern: /rice|chicken rice|jasmine/g, minMatches: 2, title: "Cook rice portions ahead", detail: "Steam jasmine rice for quick weekday bowls and lunchboxes.", dayHint: "Sunday" },
  { id: "prep-noodles", pattern: /noodle|mee|vermicelli/g, minMatches: 1, title: "Prep noodle soup bases", detail: "Portion noodles and broth ingredients for quick school lunches.", dayHint: "Saturday" },
  WESTERN_MEAL_PREP[0]!,
  WESTERN_MEAL_PREP[1]!,
];

export const NUTRITION_COUNTRY_PROFILES: Record<NutritionCountryCode, NutritionCountryProfile> = {
  IN: {
    country: "IN",
    regionCode: "IN",
    defaultFoodStyle: "indian",
    mealPlanCuisines: ["indian", "north_indian", "south_indian", "pan_indian"],
    portionTerminology: "katori",
    guidanceAuthority: "ICMR-NIN & WHO",
    hemisphere: "north",
    seasonModel: "india_subtropical",
    schoolLunchTerm: "tiffin",
    schoolLunchLabel: "Tiffin",
    groceryUnitSystem: "metric",
    groceryStaples: ["Dal", "Rice", "Atta", "Milk", "Seasonal fruit"],
    groceryKeywordPack: IN_GROCERY,
    tiffinFallbacks: IN_TIFFIN,
    mealPrepPatterns: IN_MEAL_PREP,
    seasonalKeywords: INDIA_KEYWORDS,
    seasonalTips: INDIA_TIPS,
    seasonalHighlightLabels: INDIA_LABELS,
  },
  US: {
    country: "US",
    regionCode: "US",
    defaultFoodStyle: "western",
    mealPlanCuisines: ["western", "us", "mixed", "global"],
    portionTerminology: "cup",
    guidanceAuthority: "AAP, USDA & WHO",
    hemisphere: "north",
    seasonModel: "northern_temperate",
    schoolLunchTerm: "school_lunch",
    schoolLunchLabel: "School Lunch",
    groceryUnitSystem: "us_imperial",
    groceryStaples: ["Milk", "Bread", "Eggs", "Apples", "Peanut butter"],
    groceryKeywordPack: US_GROCERY,
    tiffinFallbacks: US_TIFFIN,
    mealPrepPatterns: WESTERN_MEAL_PREP,
    seasonalKeywords: TEMPERATE_NORTH_KEYWORDS,
    seasonalTips: TEMPERATE_NORTH_TIPS,
    seasonalHighlightLabels: TEMPERATE_NORTH_LABELS,
  },
  GB: {
    country: "GB",
    regionCode: "GB",
    defaultFoodStyle: "western",
    mealPlanCuisines: ["uk", "western", "mixed", "global"],
    portionTerminology: "portion",
    guidanceAuthority: "NHS & WHO",
    hemisphere: "north",
    seasonModel: "northern_temperate",
    schoolLunchTerm: "packed_lunch",
    schoolLunchLabel: "Packed Lunch",
    groceryUnitSystem: "metric",
    groceryStaples: ["Bread", "Cheese", "Potatoes", "Yogurt", "Milk"],
    groceryKeywordPack: UK_GROCERY,
    tiffinFallbacks: UK_TIFFIN,
    mealPrepPatterns: WESTERN_MEAL_PREP,
    seasonalKeywords: TEMPERATE_NORTH_KEYWORDS,
    seasonalTips: TEMPERATE_NORTH_TIPS,
    seasonalHighlightLabels: TEMPERATE_NORTH_LABELS,
  },
  AU: {
    country: "AU",
    regionCode: "AU",
    defaultFoodStyle: "western",
    mealPlanCuisines: ["au", "western", "mixed", "global"],
    portionTerminology: "cup",
    guidanceAuthority: "Australian Dietary Guidelines & WHO",
    hemisphere: "south",
    seasonModel: "southern_temperate",
    schoolLunchTerm: "lunchbox",
    schoolLunchLabel: "Lunchbox",
    groceryUnitSystem: "metric",
    groceryStaples: ["Wraps", "Avocado", "Greek yogurt", "Milk", "Seasonal fruit"],
    groceryKeywordPack: AU_GROCERY,
    tiffinFallbacks: AU_TIFFIN,
    mealPrepPatterns: WESTERN_MEAL_PREP,
    seasonalKeywords: TEMPERATE_NORTH_KEYWORDS,
    seasonalTips: {
      ...TEMPERATE_NORTH_TIPS,
      summer: ["Prioritise hydrating fruit and lighter lunchbox options.", "December–February is peak summer — keep foods cool."],
      winter: ["Warm soups and porridge suit cooler months (Jun–Aug).", "Include hearty grains for active school days."],
    },
    seasonalHighlightLabels: TEMPERATE_NORTH_LABELS,
  },
  NZ: {
    country: "NZ",
    regionCode: "NZ",
    defaultFoodStyle: "western",
    mealPlanCuisines: ["au", "western", "mixed", "global"],
    portionTerminology: "portion",
    guidanceAuthority: "NZ Ministry of Health & WHO",
    hemisphere: "south",
    seasonModel: "southern_temperate",
    schoolLunchTerm: "lunchbox",
    schoolLunchLabel: "Lunchbox",
    groceryUnitSystem: "metric",
    groceryStaples: ["Bread", "Cheese", "Seasonal fruit", "Yogurt", "Eggs"],
    groceryKeywordPack: AU_GROCERY,
    tiffinFallbacks: AU_TIFFIN,
    mealPrepPatterns: WESTERN_MEAL_PREP,
    seasonalKeywords: TEMPERATE_NORTH_KEYWORDS,
    seasonalTips: TEMPERATE_NORTH_TIPS,
    seasonalHighlightLabels: TEMPERATE_NORTH_LABELS,
  },
  AE: {
    country: "AE",
    regionCode: "global",
    defaultFoodStyle: "middle_eastern",
    mealPlanCuisines: ["middle_eastern", "mixed", "western", "global"],
    portionTerminology: "portion",
    guidanceAuthority: "WHO Global Guidelines",
    hemisphere: "north",
    seasonModel: "northern_temperate",
    schoolLunchTerm: "school_lunch",
    schoolLunchLabel: "School Lunch",
    groceryUnitSystem: "metric",
    groceryStaples: ["Hummus", "Pita", "Labneh", "Rice", "Chicken"],
    groceryKeywordPack: AE_GROCERY,
    tiffinFallbacks: AE_TIFFIN,
    mealPrepPatterns: WESTERN_MEAL_PREP,
    seasonalKeywords: TEMPERATE_NORTH_KEYWORDS,
    seasonalTips: TEMPERATE_NORTH_TIPS,
    seasonalHighlightLabels: TEMPERATE_NORTH_LABELS,
  },
  CA: {
    country: "CA",
    regionCode: "CA",
    defaultFoodStyle: "western",
    mealPlanCuisines: ["western", "mixed", "global"],
    portionTerminology: "cup",
    guidanceAuthority: "Health Canada & WHO",
    hemisphere: "north",
    seasonModel: "northern_temperate",
    schoolLunchTerm: "school_lunch",
    schoolLunchLabel: "School Lunch",
    groceryUnitSystem: "metric",
    groceryStaples: ["Milk", "Bread", "Eggs", "Apples", "Cheese"],
    groceryKeywordPack: US_GROCERY,
    tiffinFallbacks: US_TIFFIN,
    mealPrepPatterns: WESTERN_MEAL_PREP,
    seasonalKeywords: TEMPERATE_NORTH_KEYWORDS,
    seasonalTips: TEMPERATE_NORTH_TIPS,
    seasonalHighlightLabels: TEMPERATE_NORTH_LABELS,
  },
  SG: {
    country: "SG",
    regionCode: "global",
    defaultFoodStyle: "mixed",
    mealPlanCuisines: ["sg", "asian", "mixed", "global"],
    portionTerminology: "portion",
    guidanceAuthority: "HPB & WHO",
    hemisphere: "north",
    seasonModel: "tropical_equatorial",
    schoolLunchTerm: "school_lunch",
    schoolLunchLabel: "School Lunch",
    groceryUnitSystem: "metric",
    groceryStaples: ["Jasmine rice", "Eggs", "Tropical fruit", "Tofu", "Asian greens"],
    groceryKeywordPack: SG_GROCERY,
    tiffinFallbacks: SG_TIFFIN,
    mealPrepPatterns: SG_MEAL_PREP,
    seasonalKeywords: TROPICAL_EQ_KEYWORDS,
    seasonalTips: TROPICAL_EQ_TIPS,
    seasonalHighlightLabels: TROPICAL_EQ_LABELS,
  },
  GLOBAL: {
    country: "GLOBAL",
    regionCode: "global",
    defaultFoodStyle: "mixed",
    mealPlanCuisines: ["mixed", "western", "global"],
    portionTerminology: "portion",
    guidanceAuthority: "WHO Global Guidelines",
    hemisphere: "north",
    seasonModel: "northern_temperate",
    schoolLunchTerm: "school_lunch",
    schoolLunchLabel: "School Lunch",
    groceryUnitSystem: "metric",
    groceryStaples: ["Milk", "Bread", "Eggs", "Seasonal fruit", "Rice / pasta"],
    groceryKeywordPack: GLOBAL_GROCERY,
    tiffinFallbacks: GLOBAL_TIFFIN,
    mealPrepPatterns: WESTERN_MEAL_PREP,
    seasonalKeywords: TEMPERATE_NORTH_KEYWORDS,
    seasonalTips: TEMPERATE_NORTH_TIPS,
    seasonalHighlightLabels: TEMPERATE_NORTH_LABELS,
  },
};

const COUNTRY_ALIASES: Record<string, NutritionCountryCode> = {
  IN: "IN", IND: "IN", INDIA: "IN",
  US: "US", USA: "US", "UNITED STATES": "US", "UNITED STATES OF AMERICA": "US",
  GB: "GB", UK: "GB", "UNITED KINGDOM": "GB", "GREAT BRITAIN": "GB",
  AU: "AU", AUSTRALIA: "AU",
  NZ: "NZ", "NEW ZEALAND": "NZ",
  AE: "AE", UAE: "AE", "UNITED ARAB EMIRATES": "AE",
  CA: "CA", CANADA: "CA",
  SG: "SG", SINGAPORE: "SG",
};

const REGION_PROFILE: Record<string, NutritionCountryCode> = {
  indian: "IN",
  north_indian: "IN",
  south_indian: "IN",
  pan_indian: "IN",
  western: "GLOBAL",
  mixed: "GLOBAL",
  middle_eastern: "AE",
  asian: "SG",
};

export function normalizeCountryCode(raw?: string | null): NutritionCountryCode | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toUpperCase();
  return COUNTRY_ALIASES[key] ?? null;
}

export function isIndianFoodStyle(foodStyle?: string | null): boolean {
  if (!foodStyle) return false;
  const key = foodStyle.toLowerCase();
  return INDIAN_FOOD_STYLES.has(key) || key.includes("indian");
}

export function resolveNutritionCountryProfile(input: NutritionProfileInput): NutritionCountryProfile {
  const fromCountry = normalizeCountryCode(input.country);
  if (fromCountry) return NUTRITION_COUNTRY_PROFILES[fromCountry];

  const regionKey = input.region?.toLowerCase().trim();
  if (regionKey && REGION_PROFILE[regionKey]) {
    return NUTRITION_COUNTRY_PROFILES[REGION_PROFILE[regionKey]!];
  }

  return NUTRITION_COUNTRY_PROFILES.GLOBAL;
}

export function getNutritionCountryProfile(code: NutritionCountryCode): NutritionCountryProfile {
  return NUTRITION_COUNTRY_PROFILES[code] ?? NUTRITION_COUNTRY_PROFILES.GLOBAL;
}

export function resolveEffectiveFoodStyle(
  profile: NutritionCountryProfile,
  foodStyle?: string | null,
): string {
  if (foodStyle?.trim()) {
    const style = foodStyle.toLowerCase();
    if (isIndianFoodStyle(style)) return style;
    if (style !== "mixed" && style !== "global") return style;
  }
  return profile.defaultFoodStyle;
}

export function getSeasonForProfile(profile: NutritionCountryProfile, date = new Date()): NutritionSeason {
  const month = date.getMonth() + 1;

  if (profile.seasonModel === "india_subtropical") {
    if (month >= 4 && month <= 6) return "summer";
    if (month >= 7 && month <= 9) return "monsoon";
    return "winter";
  }

  if (profile.seasonModel === "tropical_equatorial") {
    if (month === 12 || month <= 2) return "summer";
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 9) return "monsoon";
    return "autumn";
  }

  const isSouthern = profile.hemisphere === "south";

  if (isSouthern) {
    if (month === 12 || month <= 2) return "summer";
    if (month >= 3 && month <= 5) return "autumn";
    if (month >= 6 && month <= 8) return "winter";
    return "spring";
  }

  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function localizePortionNote(note: string, profile: NutritionCountryProfile): string {
  if (profile.portionTerminology === "katori") return note;
  return note
    .replace(/\bkatori\b/gi, profile.portionTerminology)
    .replace(/\bKatori\b/g, profile.portionTerminology.charAt(0).toUpperCase() + profile.portionTerminology.slice(1));
}

export function formatGroceryQuantityLabel(
  name: string,
  quantity: number,
  unit: "kg" | "L" | "count",
  profile: NutritionCountryProfile,
): string {
  if (unit === "count") return `${name} × ${Math.round(quantity)}`;

  if (profile.groceryUnitSystem === "us_imperial" && unit === "kg") {
    const lbs = quantity * 2.205;
    const rounded = Number.isInteger(lbs) ? lbs : lbs.toFixed(1).replace(/\.0$/, "");
    return `${name} × ${rounded} lb`;
  }

  if (profile.groceryUnitSystem === "us_imperial" && unit === "L") {
    const cups = quantity * 4.227;
    const rounded = Math.max(1, Math.round(cups));
    return `${name} × ${rounded} cups`;
  }

  if (unit === "kg") {
    const kg = Number.isInteger(quantity) ? quantity : quantity.toFixed(1).replace(/\.0$/, "");
    return `${name} × ${kg} kg`;
  }

  const liters = Number.isInteger(quantity) ? quantity : quantity.toFixed(1).replace(/\.0$/, "");
  return `${name} × ${liters} L`;
}

export function getIndiaSeason(date = new Date()): NutritionSeason {
  return getSeasonForProfile(NUTRITION_COUNTRY_PROFILES.IN, date);
}

export type SchoolLunchTermCopyField =
  | "label"
  | "tab"
  | "title"
  | "desc"
  | "household"
  | "discovery_message"
  | "discovery_cta"
  | "achievement_title"
  | "achievement_desc"
  | "school_only"
  | "premium"
  | "operations_subtitle"
  | "household_grocery_desc";

/** i18n key for country-aware school lunch terminology (language controls translation). */
export function schoolLunchTermI18nKey(
  term: SchoolLunchTermId,
  field: SchoolLunchTermCopyField,
): string {
  return `nutrition_hub.school_lunch_terms.${term}.${field}`;
}
