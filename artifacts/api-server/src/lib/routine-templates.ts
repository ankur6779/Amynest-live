// ─── Rule-Based Routine Generator — Zero API Cost ──────────────────────────
// Replaces OpenAI calls with deterministic, age-appropriate schedule building.

import { recipeFor, nutritionFor } from "./meal-recipes.js";

export type AgeGroup = "infant" | "toddler" | "preschool" | "early_school" | "pre_teen";

export type ScheduleItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes: string;
  status: "pending";
  rewardPoints?: number;
  // Routine v2 fields (optional — populated for meal/tiffin/activity blocks).
  meal?: string;
  recipe?: import("./meal-recipes.js").MealRecipe;
  nutrition?: import("./meal-recipes.js").MealNutrition;
  ageBand?: "2-5" | "6-10" | "10+";
  parentHubTopic?: string;
};

const ESSENTIAL_CATEGORIES = new Set(["hygiene", "sleep", "meal", "school", "tiffin"]);
const IMPORTANT_CATEGORIES = new Set(["study", "bonding", "wind-down", "homework"]);

export function pointsForCategory(category: string): number {
  const c = (category ?? "").toLowerCase();
  if (ESSENTIAL_CATEGORIES.has(c)) return 5;
  if (IMPORTANT_CATEGORIES.has(c)) return 10;
  return 15;
}

export function withRewardPoints<T extends { category?: string; rewardPoints?: number }>(items: T[]): T[] {
  return items.map((it) => ({ ...it, rewardPoints: it.rewardPoints ?? pointsForCategory(it.category ?? "") }));
}

export type GeneratedRoutine = {
  title: string;
  items: ScheduleItem[];
};

export type Region =
  | "north_indian"
  | "south_indian"
  | "bengali"
  | "gujarati"
  | "maharashtrian"
  | "punjabi"
  | "global"
  | "pan_indian";

export const REGION_LABELS: Record<Region, string> = {
  north_indian: "North Indian",
  south_indian: "South Indian",
  bengali: "Bengali",
  gujarati: "Gujarati",
  maharashtrian: "Maharashtrian",
  punjabi: "Punjabi",
  global: "Global / Continental",
  pan_indian: "Pan-Indian (Mixed)",
};

export type RoutineParams = {
  childName: string;
  ageGroup: AgeGroup;
  totalAgeMonths: number;
  wakeUpTime: string;
  sleepTime: string;
  schoolStartTime: string;
  schoolEndTime: string;
  travelMode: string;
  hasSchool: boolean;
  mood: string;
  foodType: string;
  region?: Region;
  goals?: string;
  specialPlans?: string;
  fridgeItems?: string;
  p1Free: boolean;
  p2Free: boolean;
  bothBusy: boolean;
  childClass?: string;
  date: string;
  behaviorContext?: string;
};

// ─── Time helpers ─────────────────────────────────────────────────────────────

export function minsToTime(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const dh = h % 12 === 0 ? 12 : h % 12;
  return `${dh}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function timeToMins(t: string): number {
  if (!t) return 0;
  const cleaned = t.replace(/\s+/g, " ").trim();

  // 12-hour format: "7:00 AM", "12:30 PM"
  const m12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1]);
    const min = parseInt(m12[2]);
    const ampm = m12[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + min;
  }

  // 24-hour format: "07:00", "19:30" — AI often returns this
  const m24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1]);
    const min = parseInt(m24[2]);
    return h * 60 + min;
  }

  return 0;
}

// Seeded shuffle so output is deterministic per date+child
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dateSeed(date: string, childName: string): number {
  let h = 0;
  for (const c of date + childName) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number, offset = 0): T {
  return arr[Math.abs(seed + offset) % arr.length];
}

// ─── Fridge / user-supplied food items helpers ────────────────────────────────
// When parents type ingredients into "Food items" while generating a routine,
// the generator should suggest meal names built from those items instead of
// the regional meal bank.

export function parseFridgeItems(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n;|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 12);
}

const ITEM_MEAL_TEMPLATES: Record<string, string[]> = {
  VEG_BREAKFAST: [
    "{a} paratha with curd",
    "{a} & {b} toast",
    "{a} omelette (egg-free besan style)",
    "{a} poha",
    "{a} sandwich",
  ],
  NONVEG_BREAKFAST: [
    "{a} omelette with toast",
    "{a} & {b} bhurji",
    "{a} keema paratha",
    "Scrambled egg with {a}",
    "{a} sandwich",
  ],
  VEG_LUNCH: [
    "{a} sabzi with roti & dal",
    "{a}-{b} pulao",
    "{a} curry with rice",
    "Stuffed {a} paratha with curd",
    "{a} khichdi",
  ],
  NONVEG_LUNCH: [
    "{a} curry with rice",
    "{a} biryani",
    "{a}-{b} pulao",
    "Grilled {a} with roti & salad",
    "{a} masala with chapati",
  ],
  VEG_DINNER: [
    "{a} sabzi with roti",
    "{a} khichdi with ghee",
    "{a}-{b} fried rice",
    "{a} paratha with curd",
    "Light {a} soup with toast",
  ],
  NONVEG_DINNER: [
    "{a} curry with roti",
    "{a} stew with bread",
    "Grilled {a} with veggies",
    "{a} fried rice",
    "{a} kebabs with salad",
  ],
  VEG_SNACKS: [
    "{a} chaat",
    "{a} cutlet",
    "Toasted {a} bites",
    "{a}-{b} salad bowl",
    "{a} smoothie",
  ],
  NONVEG_SNACKS: [
    "{a} cutlet",
    "{a} kebab bites",
    "Grilled {a} skewers",
    "{a}-{b} salad bowl",
    "{a} sliders",
  ],
  VEG_TIFFIN: [
    "{a} sandwich",
    "{a} paratha roll",
    "{a}-{b} wrap",
    "{a} rice with pickle",
    "{a} pulao box",
  ],
  NONVEG_TIFFIN: [
    "{a} sandwich",
    "{a} keema paratha roll",
    "{a}-{b} wrap",
    "{a} fried rice box",
    "{a} biryani box",
  ],
};

export function mealFromItems(key: MealKey, items: string[], seed: number): string {
  if (items.length === 0) return "Healthy meal";
  // Fall back to the closest meal-key family if a specific key is missing.
  const fallback =
    key.includes("BREAKFAST") ? ITEM_MEAL_TEMPLATES.VEG_BREAKFAST!
    : key.includes("LUNCH") ? ITEM_MEAL_TEMPLATES.VEG_LUNCH!
    : key.includes("DINNER") ? ITEM_MEAL_TEMPLATES.VEG_DINNER!
    : key.includes("TIFFIN") ? ITEM_MEAL_TEMPLATES.VEG_TIFFIN!
    : ITEM_MEAL_TEMPLATES.VEG_SNACKS!;
  const templates = ITEM_MEAL_TEMPLATES[key] ?? fallback;
  const tpl = templates[Math.abs(seed) % templates.length]!;
  const a = items[Math.abs(seed) % items.length]!;
  const b = items[Math.abs(seed + 1) % items.length] ?? a;
  return tpl.replace("{a}", a).replace("{b}", b);
}

// ─── Region-aware Meal Databases ──────────────────────────────────────────────
// Each region defines its own meal banks. Missing entries fall back to pan_indian.
// Each bank contains 5 strings; each string is a "|"-separated set of options.

type MealKey =
  | "VEG_BREAKFAST" | "NONVEG_BREAKFAST"
  | "VEG_LUNCH" | "NONVEG_LUNCH"
  | "VEG_DINNER" | "NONVEG_DINNER"
  | "VEG_SNACKS" | "NONVEG_SNACKS"
  | "VEG_TIFFIN" | "NONVEG_TIFFIN";

type RegionMeals = Partial<Record<MealKey, string[]>>;

const PAN_INDIAN_MEALS: Record<MealKey, string[]> = {
  VEG_BREAKFAST: [
    "Idli with sambar | Upma with chutney | Poha with peanuts",
    "Paratha with curd | Aloo toast | Besan chilla with ketchup",
    "Dosa with coconut chutney | Rava idli | Moong dal chilla",
    "Oats porridge with banana | Bread butter with milk | Cornflakes with milk",
    "Paneer paratha | Vegetable uttapam | Semolina kheer",
  ],
  NONVEG_BREAKFAST: [
    "Egg omelette with toast | Egg bhurji with paratha | Boiled eggs with bread",
    "Egg dosa | Egg poha | Chicken sandwich",
    "Scrambled eggs with toast | Egg upma | Chicken paratha",
    "Oats with boiled egg | Egg roll | Bread omelette",
    "Egg uttapam | Egg idli | Chicken toast",
  ],
  VEG_LUNCH: [
    "Dal rice with sabzi | Rajma chawal | Chole rice",
    "Paneer sabzi with roti | Aloo gobi with phulka | Mixed veg curry with rice",
    "Sambar rice with papad | Kadhi rice | Palak dal with roti",
    "Veg pulao with raita | Lemon rice with chutney | Veg biryani",
    "Dal makhani with paratha | Baingan bharta with roti | Bhindi sabzi with dal",
  ],
  NONVEG_LUNCH: [
    "Chicken curry with rice | Egg curry with roti | Fish curry with rice",
    "Chicken biryani | Egg rice | Mutton curry with phulka",
    "Chicken dal rice | Egg dal roti | Fish fry with rice",
    "Keema with roti | Chicken rice | Prawn curry with rice",
    "Grilled chicken with dal | Egg biryani | Chicken sabzi with roti",
  ],
  VEG_DINNER: [
    "Roti with dal and sabzi | Khichdi with ghee | Vegetable soup with bread",
    "Paratha with curd | Mixed veg with roti | Dal rice light",
    "Dahi rice | Vegetable daliya | Oats with sabzi",
    "Chapati with palak paneer | Moong dal khichdi | Veg soup with roti",
    "Light upma | Rava dosa | Tomato soup with bread",
  ],
  NONVEG_DINNER: [
    "Chicken curry with roti | Egg dal with rice | Fish with chapati",
    "Chicken soup with bread | Egg curry light | Grilled chicken with veg",
    "Keema roti | Chicken stew | Prawn masala with rice",
    "Egg chapati | Chicken khichdi | Light fish curry",
    "Chicken noodle soup | Egg fried rice | Chicken daliya",
  ],
  VEG_SNACKS: [
    "Fruit bowl + milk | Banana + peanut butter | Apple slices + curd",
    "Vegetable upma | Sprouts chaat | Boiled corn with butter",
    "Poha | Idli with chutney | Bread with jam and milk",
    "Chikki + banana shake | Makhana + milk | Date and nut balls",
    "Vegetable sandwich | Dhokla | Paneer cubes with fruit",
  ],
  NONVEG_SNACKS: [
    "Boiled egg + banana | Egg toast | Chicken puff",
    "Egg sandwich | Chicken nuggets | Egg with fruit",
    "Boiled egg + fruit bowl | Chicken roll | Egg paratha slice",
    "Egg bhurji bread | Chicken popcorn | Egg omelette wrap",
    "Egg milkshake | Chicken sandwich | Boiled egg + milk",
  ],
  VEG_TIFFIN: [
    "Paneer paratha + curd | Veg sandwich | Upma in box",
    "Idli with sambar | Poha with peanuts | Besan chilla with chutney",
    "Cheese toast | Vegetable pulao | Aloo paratha + pickle",
    "Pasta with veg | Bread rolls | Veg fried rice",
    "Stuffed capsicum paratha | Tomato rice | Veg wrap",
  ],
  NONVEG_TIFFIN: [
    "Egg roll | Egg sandwich | Chicken frankie",
    "Egg fried rice wrap | Chicken paratha | Egg puff",
    "Boiled egg + bread | Chicken sandwich | Egg pasta",
    "Egg bhurji paratha | Chicken roll | Egg noodles box",
    "Chicken chapati roll | Egg rice | Mutton keema paratha",
  ],
};

const REGIONAL_MEALS: Record<Exclude<Region, "pan_indian">, RegionMeals> = {
  north_indian: {
    VEG_BREAKFAST: [
      "Aloo paratha with curd | Stuffed paratha with butter | Bedmi puri with aloo sabzi",
      "Chole bhature | Poori sabzi | Besan chilla with green chutney",
      "Paneer bhurji with toast | Aloo puri | Methi thepla with curd",
      "Suji halwa with poori | Paratha with achar | Bread pakora with chutney",
      "Mixed veg paratha | Aloo tikki with curd | Onion uttapam",
    ],
    NONVEG_BREAKFAST: [
      "Egg paratha with curd | Keema paratha | Boiled egg with poori",
      "Egg bhurji with paratha | Chicken kheema toast | Anda curry with bread",
      "Omelette paratha | Egg roll Delhi style | Chicken sandwich with chutney",
      "Egg masala with poori | Chicken keema bun | Boiled egg + aloo paratha",
      "Spicy egg bhurji with toast | Chicken curry puff | Egg roll with onion",
    ],
    VEG_LUNCH: [
      "Rajma chawal with onion salad | Chole rice with raita | Kadhi pakora with rice",
      "Dal makhani with naan | Paneer butter masala with roti | Aloo gobi with phulka",
      "Palak paneer with roti | Mix veg with paratha | Baingan bharta with rice",
      "Chana masala with bhature | Sarson da saag with makki roti | Dal tadka with jeera rice",
      "Matar paneer with roti | Bhindi masala with dal-roti | Aloo dum with paratha",
    ],
    NONVEG_LUNCH: [
      "Butter chicken with naan | Chicken curry with rice | Mutton rogan josh with phulka",
      "Chicken biryani Delhi style | Egg curry with roti | Keema matar with paratha",
      "Tandoori chicken with dal-roti | Fish curry with rice | Chicken tikka masala with naan",
      "Mutton korma with rice | Chicken kadhai with roti | Egg masala with rice",
      "Chicken handi with naan | Mutton qorma with rice | Anda curry with paratha",
    ],
    VEG_DINNER: [
      "Roti with dal makhani | Khichdi with ghee | Mix veg with chapati",
      "Paneer paratha with curd | Aloo gobi with roti | Light dal with rice",
      "Phulka with kadhi | Vegetable pulao with raita | Moong dal khichdi",
      "Chapati with bhindi | Light dal-chawal | Suji upma",
      "Roti with palak | Veg daliya | Tomato soup with toast",
    ],
    NONVEG_DINNER: [
      "Chicken curry with roti | Egg curry with rice | Light fish curry",
      "Chicken stew with bread | Mutton soup with roti | Egg bhurji with paratha",
      "Light chicken with chapati | Anda curry with rice | Keema paratha",
      "Chicken khichdi | Egg dal-rice | Light fish with phulka",
      "Chicken soup with bread | Egg fried rice | Chicken daliya",
    ],
    VEG_SNACKS: [
      "Samosa with chutney | Aloo tikki | Bread pakora",
      "Dahi bhalla | Pani puri | Bhel puri",
      "Paneer pakora | Onion bhajiya | Sweet lassi + dry fruits",
      "Fruit chaat | Roasted chana | Sprouts chaat",
      "Mathri with pickle | Banana milkshake | Makhana with milk",
    ],
    NONVEG_TIFFIN: [
      "Chicken roll Delhi style | Egg roll | Keema paratha box",
      "Chicken frankie | Egg sandwich | Chicken puff",
      "Egg bhurji wrap | Chicken patty | Egg paratha box",
      "Chicken biryani box | Egg pulao | Chicken kathi roll",
      "Spicy egg paratha | Chicken sandwich | Boiled egg + paratha",
    ],
    VEG_TIFFIN: [
      "Aloo paratha + pickle | Paneer paratha + curd | Chole rice box",
      "Veg pulao + raita | Stuffed paratha | Rajma rice box",
      "Bedmi poori box | Mathri + sabzi | Veg sandwich",
      "Methi thepla + chutney | Aloo puri | Mix veg pulao",
      "Paneer roll | Veg frankie | Cheese paratha",
    ],
  },
  south_indian: {
    VEG_BREAKFAST: [
      "Idli with sambar and coconut chutney | Medu vada | Pongal with chutney",
      "Masala dosa | Set dosa | Onion rava dosa with chutney",
      "Upma with coconut chutney | Rava idli | Pesarattu with ginger chutney",
      "Adai with avial | Appam with veg stew | Poori with potato kurma",
      "Lemon rice | Curd rice with pickle | Tomato rice",
    ],
    NONVEG_BREAKFAST: [
      "Egg dosa with chutney | Egg appam | Anda paratha South style",
      "Egg podimas with idiyappam | Chicken sandwich | Egg pongal",
      "Omelette with appam | Boiled egg with upma | Chicken keema dosa",
      "Egg uttapam | Egg vada | Chicken roll Madras style",
      "Spicy egg bhurji with dosa | Egg + idli | Egg fried rice light",
    ],
    VEG_LUNCH: [
      "Sambar rice with papad | Rasam rice with curd | Bisi bele bath",
      "Curd rice with pickle | Lemon rice with vada | Tamarind rice with chips",
      "Veg meals (rice, sambar, rasam, kootu, curd) | Avial with rice | Vegetable kurma with appam",
      "Vegetable biryani South style | Coconut rice | Pulihora with raita",
      "Pongal with sambar | Mor kuzhambu with rice | Drumstick sambar with rice",
    ],
    NONVEG_LUNCH: [
      "Chicken Chettinad with rice | Fish curry with rice | Mutton kola urundai with rice",
      "Chicken biryani Hyderabadi | Egg curry with rice | Prawn masala with rice",
      "Andhra chicken curry with rice | Fish moilee with appam | Chicken sukka with rice",
      "Mutton biryani | Egg rasam rice | Crab curry with rice",
      "Chicken pepper fry with rice | Fish fry + sambar rice | Egg kurma with appam",
    ],
    VEG_DINNER: [
      "Rava dosa with chutney | Idli with sambar | Lemon rice light",
      "Curd rice with pickle | Pongal with chutney | Vegetable kichadi",
      "Appam with veg stew | Idiyappam with kurma | Light upma",
      "Tomato rice | Coconut rice | Light dosa with chutney",
      "Adai with jaggery | Pesarattu | Rava upma",
    ],
    NONVEG_DINNER: [
      "Egg curry with appam | Light chicken curry with rice | Fish moilee with idiyappam",
      "Chicken stew with appam | Egg kurma with dosa | Light prawn curry with rice",
      "Egg podimas with rice | Chicken soup with bread | Fish fry with rice",
      "Chicken sukka with rice | Egg pepper fry | Anda curry with appam",
      "Light chicken Chettinad | Egg masala with idli | Fish curry South style",
    ],
    VEG_SNACKS: [
      "Murukku with milk | Banana chips + buttermilk | Sundal (chickpea snack)",
      "Mysore bonda | Bonda + chutney | Vada with sambar",
      "Boiled corn | Fruit + curd | Roasted peanuts",
      "Coconut barfi | Banana + milk | Ragi malt",
      "Idli with podi | Mini dosa | Mango + curd",
    ],
    VEG_TIFFIN: [
      "Curd rice + pickle | Lemon rice + papad | Tamarind rice",
      "Idli + chutney box | Mini dosa + chutney | Pongal in box",
      "Veg biryani South style | Tomato rice + chips | Coconut rice",
      "Pulihora box | Sambar rice box | Vegetable upma",
      "Bisi bele bath | Sevai upma | Adai with jaggery",
    ],
    NONVEG_TIFFIN: [
      "Egg dosa rolled | Chicken biryani box | Egg rice box",
      "Chicken sandwich | Egg podimas wrap | Fish cutlet + rice",
      "Egg fried rice | Chicken kathi roll Madras | Egg sandwich",
      "Boiled egg + curd rice | Chicken kurma + appam box | Egg pulao",
      "Spicy egg + lemon rice | Chicken sukka + rice | Egg + idli box",
    ],
  },
  bengali: {
    VEG_BREAKFAST: [
      "Luchi with aloor dom | Cholar dal with luchi | Radhaballavi with sabzi",
      "Kochuri with chholar dal | Veg ghugni with bread | Suji halwa with poori",
      "Vegetable chop with muri | Veg cutlet with toast | Beguni with rice",
      "Chirer pulao | Sandesh + milk | Mishti doi + roti",
      "Pithe + milk | Veg paratha + alur torkari | Doi chura",
    ],
    NONVEG_BREAKFAST: [
      "Dim er omelette with luchi | Mughlai paratha (egg) | Egg roll Kolkata style",
      "Egg toast with chola | Anda kosha with bread | Chicken sandwich Bengali style",
      "Egg dim torkari with paratha | Boiled egg with chira | Egg cutlet + bread",
      "Dim er jhol with rice | Egg keema paratha | Chicken stew with bread",
      "Spicy egg bhurji with luchi | Egg fried rice light | Mughlai egg paratha",
    ],
    VEG_LUNCH: [
      "Bhaat with shukto and dal | Aloo posto with rice | Chholar dal with luchi",
      "Mocha ghonto with bhaat | Aloo phulkopir dalna with rice | Begun bhaja + dal + bhaat",
      "Vegetable khichuri | Doi begun with rice | Cholar dal with poori",
      "Chanar dalna with rice | Aloo kobi'r torkari | Mishti pulao with paneer",
      "Lau ghonto with rice | Bhaja moong dal with rice | Sukto with bhaat",
    ],
    NONVEG_LUNCH: [
      "Macher jhol with bhaat | Kosha mangsho with rice | Chingri malai curry with rice",
      "Ilish bhapa with rice | Murgir jhol with rice | Egg curry with bhaat",
      "Doi mach with rice | Chicken kosha with luchi | Macher kalia with bhaat",
      "Mutton biryani Kolkata style | Fish fry + dal-bhaat | Prawn malai curry",
      "Pabda jhol with bhaat | Murgir jhol light with rice | Egg dim curry",
    ],
    VEG_DINNER: [
      "Roti with cholar dal | Khichuri with begun bhaja | Light luchi with sabzi",
      "Bhaat with bhaja moong dal | Mishti pulao light | Veg torkari with roti",
      "Doi vada light | Vegetable stew with bread | Aloo dam with luchi",
      "Bhaat with sukto | Chapati with chanar dalna | Light dal khichuri",
      "Veg cutlet with bread | Suji halwa light | Chirer pulao",
    ],
    NONVEG_DINNER: [
      "Macher jhol with bhaat | Light chicken jhol with rice | Egg curry Bengali style",
      "Chicken stew with bread | Light kosha mangsho | Doi mach with rice",
      "Egg dim curry with rice | Fish fry with chapati | Light prawn curry",
      "Chicken khichuri | Egg dal bhaat | Light macher jhol",
      "Murgir soup with bread | Egg fried rice | Chicken daliya Bengali style",
    ],
    VEG_SNACKS: [
      "Telebhaja (assorted fritters) | Beguni + muri | Vegetable chop",
      "Singara (Bengali samosa) | Nimki | Mishti + cha",
      "Sandesh + milk | Mishti doi + fruit | Rasgulla + milk",
      "Jhalmuri | Ghugni chaat | Aloo kabli",
      "Pantua + milk | Chanar jilipi | Roshogolla + fruit",
    ],
    VEG_TIFFIN: [
      "Luchi + aloor dom box | Vegetable cutlet + bread | Mishti pulao box",
      "Aloo paratha Bengali style | Veg chop + muri | Khichuri box",
      "Chanar dalna with rice | Aloo phulkopi torkari + roti | Tomato rice + chop",
      "Veg roll | Sandwich + sandesh | Cholar dal + luchi box",
      "Mochar ghonto + bhaat | Vegetable singara box | Suji halwa + poori",
    ],
    NONVEG_TIFFIN: [
      "Egg roll Kolkata style | Mughlai paratha (egg) | Chicken roll Park Street style",
      "Egg sandwich Bengali | Chicken kosha + paratha | Fish fry + bread",
      "Egg dim torkari + rice box | Chicken stew + bread | Egg cutlet + rice",
      "Mutton biryani Kolkata | Chicken biryani + aloo | Egg fried rice box",
      "Macher chop + muri | Egg paratha + sabzi | Chicken keema roll",
    ],
  },
  gujarati: {
    VEG_BREAKFAST: [
      "Thepla with curd and pickle | Methi thepla + chai | Bajra rotla with milk",
      "Khaman dhokla with chutney | Khandvi | Patra (colocasia rolls)",
      "Fafda with jalebi | Gathiya with chutney | Sev khamani",
      "Handvo with chai | Muthia (steamed snacks) | Dudhpak with poori",
      "Aloo paratha Gujarati style | Bread upma | Veg sandwich + chai",
    ],
    NONVEG_BREAKFAST: [
      "Egg bhurji with thepla | Egg sandwich Gujarati style | Boiled eggs with chutney",
      "Omelette with thepla | Egg paratha | Egg toast + chai",
      "Egg upma | Egg bhurji with bread | Chicken sandwich",
      "Anda paratha | Egg roll | Boiled egg with khakhra",
      "Egg dosa | Egg fried rice light | Anda bhurji with bun",
    ],
    VEG_LUNCH: [
      "Gujarati thali (dal-bhaat-rotli-shaak) | Khichdi-kadhi | Undhiyu with poori",
      "Patra-shaak with rotli | Sev tameta nu shaak with bhaat | Bharela ringan with rotli",
      "Dal dhokli | Veg pulao with kadhi | Bhindi-shaak with rotli",
      "Mix veg with thepla | Aloo-shaak with rotli | Tuvar dal with bhaat",
      "Gujarati kadhi-chawal | Methi-bajra rotla with shaak | Lasaniya batata",
    ],
    NONVEG_LUNCH: [
      "Chicken curry with rotli | Egg curry with bhaat | Fish curry coastal Gujarati",
      "Chicken biryani | Egg masala with rice | Mutton curry with rotli",
      "Chicken pulao + raita | Egg curry + thepla | Fish fry + dal-bhaat",
      "Chicken Kathiyawadi | Egg curry with bhakri | Prawn curry coastal",
      "Mutton soup with rice | Chicken with rotli | Egg masala with bhaat",
    ],
    VEG_DINNER: [
      "Khichdi-kadhi with papad | Thepla with chai and curd | Light dal-bhaat",
      "Bajra rotla with shaak | Veg pulao light | Suji upma",
      "Mug ni dal khichdi | Dudhi-chana shaak with rotli | Light handvo",
      "Rotli with kadhi | Vegetable dhansak light | Veg sandwich with milk",
      "Methi thepla + curd | Light shaak with rotli | Suji halwa light",
    ],
    NONVEG_DINNER: [
      "Light chicken curry with rotli | Egg masala with bhaat | Fish curry light",
      "Chicken stew with bread | Egg curry light | Anda curry with rotli",
      "Light keema with rotli | Chicken with khichdi | Egg fried rice",
      "Mutton soup with bread | Chicken light + rice | Egg masala with thepla",
      "Light fish curry with rice | Chicken khichdi | Egg dal-bhaat",
    ],
    VEG_SNACKS: [
      "Dhokla + chutney | Khandvi | Patra",
      "Fafda-jalebi | Gathiya | Khaman with sev",
      "Methi thepla + curd | Khakhra + masala | Sev mamra",
      "Handvo + tea | Muthia | Sandwich dhokla",
      "Banana shake + dhokla | Lassi sweet | Roasted chana with chai",
    ],
    VEG_TIFFIN: [
      "Thepla + chunda pickle | Methi paratha + curd | Veg pulao + raita",
      "Dhokla + chutney box | Khandvi + theplas | Handvo box",
      "Bajra rotla + shaak | Khichdi-kadhi box | Veg sandwich + sev",
      "Patra + thepla | Aloo paratha + curd | Mix veg pulao",
      "Sandwich dhokla | Veg roll Gujarati | Cheese thepla + pickle",
    ],
    NONVEG_TIFFIN: [
      "Egg sandwich + chai | Chicken roll | Egg paratha box",
      "Chicken biryani box | Anda paratha + curd | Egg fried rice",
      "Chicken keema paratha | Egg bhurji + bread | Chicken sandwich",
      "Egg pulao + raita | Boiled egg + thepla | Chicken kathi roll",
      "Egg roll Gujarati style | Chicken cutlet | Anda curry + bhaat box",
    ],
  },
  maharashtrian: {
    VEG_BREAKFAST: [
      "Pohe (kanda poha) | Sabudana khichdi | Upma with chutney",
      "Misal pav | Vada pav | Sabudana vada with chutney",
      "Thalipeeth with butter | Zunka bhakri | Suji halwa with poori",
      "Kothimbir vadi | Aloo paratha Maharashtrian style | Bread butter + chai",
      "Onion-tomato omelette toast (veg version with paneer) | Veg sandwich Mumbai style | Modak (festival)",
    ],
    NONVEG_BREAKFAST: [
      "Egg bhurji pav | Egg omelette pav | Anda paratha",
      "Egg roll Mumbai style | Chicken sandwich | Boiled egg with toast",
      "Egg upma | Anda bhurji with bread | Chicken paratha",
      "Egg fried rice light | Spicy egg bhurji + pav | Egg dosa",
      "Egg toast Mumbai style | Anda masala with bread | Chicken roll",
    ],
    VEG_LUNCH: [
      "Varan-bhaat with limbu and tup | Pithla-bhakri | Masale bhaat",
      "Amti with bhaat | Bhindi sabzi with chapati | Patodi rasa bhaji with bhakri",
      "Vangi bhaat | Tomato saar with rice | Matki usal with bhakri",
      "Puran poli + amti | Modak (festival lunch) | Aluchi vadi with rice",
      "Kobichi bhaji with bhakri | Mix veg with chapati | Sol kadhi + rice",
    ],
    NONVEG_LUNCH: [
      "Kombdi vade (Malvani chicken) | Mutton kolhapuri with bhakri | Fish curry Konkani style",
      "Chicken biryani Bombay style | Egg curry with rice | Prawn koliwada with rice",
      "Chicken sukka with bhakri | Bombil fry with rice | Mutton rassa with bhakri",
      "Chicken handi with chapati | Egg curry Maharashtrian | Surmai fry with rice",
      "Mutton biryani | Chicken thali (Kolhapuri) | Fish curry with rice",
    ],
    VEG_DINNER: [
      "Varan-bhaat light | Pithla bhakri | Khichdi with ghee",
      "Amti-rice with papad | Light dal-chawal | Suji upma",
      "Bhakri with bhaji | Veg pulao light | Sabudana khichdi",
      "Chapati with bhaji | Light masale bhaat | Tomato saar with rice",
      "Light dal-bhaat | Misal light | Sandwich + milk",
    ],
    NONVEG_DINNER: [
      "Light chicken curry + chapati | Egg curry + rice | Fish curry light",
      "Chicken stew with bread | Mutton soup with bhakri | Egg masala with rice",
      "Light chicken sukka with rice | Egg fried rice | Anda curry with chapati",
      "Chicken khichdi | Egg dal-bhaat | Light fish curry with rice",
      "Chicken soup with bread | Egg pulao | Mutton soup with rice",
    ],
    VEG_SNACKS: [
      "Vada pav | Misal pav | Bhel puri",
      "Pav bhaji | Pani puri | Sev puri",
      "Kothimbir vadi | Sabudana vada | Aluvadi",
      "Banana wafers + chai | Roasted chana | Modak / sweet",
      "Veg sandwich Mumbai | Bhajiya + chai | Chikki + milk",
    ],
    VEG_TIFFIN: [
      "Vada pav box | Pav bhaji + pav | Misal pav",
      "Thalipeeth + curd | Pithla-bhakri | Sabudana khichdi box",
      "Veg pulao + raita | Masale bhaat | Aloo paratha + chutney",
      "Bhel puri box | Sandwich Mumbai style | Kothimbir vadi box",
      "Puran poli + amti | Modak (festival box) | Veg roll Maharashtrian",
    ],
    NONVEG_TIFFIN: [
      "Egg bhurji pav | Chicken roll Mumbai | Anda paratha + chutney",
      "Chicken biryani box | Egg fried rice | Boiled egg + bhakri",
      "Chicken kolhapuri + chapati box | Egg sandwich | Fish fry + rice",
      "Mutton biryani | Egg pulao | Chicken keema paratha",
      "Egg roll Mumbai style | Chicken cutlet | Anda curry + rice box",
    ],
  },
  punjabi: {
    VEG_BREAKFAST: [
      "Aloo paratha with butter and curd | Gobi paratha + lassi | Mooli paratha + pickle",
      "Chole bhature | Amritsari kulcha + chole | Chana kulcha",
      "Dal makhani with paratha | Paneer paratha + lassi | Sarson saag with makki roti",
      "Suji halwa + poori | Pinni + milk | Lassi + paratha",
      "Vegetable poha | Bread pakora + chutney | Aloo tikki with curd",
    ],
    NONVEG_BREAKFAST: [
      "Egg paratha + lassi | Anda kheema paratha | Boiled egg with chana",
      "Egg bhurji + paratha | Chicken sandwich | Anda curry with bread",
      "Omelette + paratha | Chicken keema toast | Egg roll Punjabi style",
      "Egg masala + paratha | Anda + lassi | Chicken cutlet sandwich",
      "Egg fried rice + chutney | Anda bhurji bun | Chicken keema paratha",
    ],
    VEG_LUNCH: [
      "Sarson da saag + makki di roti | Dal makhani + naan | Rajma chawal + raita",
      "Chole bhature + lassi | Paneer butter masala + naan | Aloo gobi + phulka",
      "Mah ki dal + roti | Kadhi pakora + rice | Palak paneer + roti",
      "Amritsari dal + roti | Chana masala + bhature | Mixed veg Punjabi style",
      "Matar paneer + naan | Dal tadka + jeera rice | Bhindi do pyaza + roti",
    ],
    NONVEG_LUNCH: [
      "Butter chicken + naan | Chicken curry + rice | Mutton rogan josh + phulka",
      "Amritsari fish + dal-roti | Tandoori chicken + naan | Chicken tikka masala + rice",
      "Mutton korma + rice | Chicken kadhai + roti | Egg curry Punjabi style",
      "Chicken handi + naan | Mutton qorma + rice | Anda curry + paratha",
      "Chicken biryani Punjabi | Mutton biryani | Fish curry with rice",
    ],
    VEG_DINNER: [
      "Roti + dal makhani | Khichdi with ghee | Mix veg + chapati",
      "Paneer paratha + curd | Aloo gobi + roti | Light dal + rice",
      "Phulka + kadhi | Vegetable pulao + raita | Moong dal khichdi",
      "Chapati + bhindi | Light dal-chawal | Suji upma",
      "Roti + palak | Veg daliya | Tomato soup + toast",
    ],
    NONVEG_DINNER: [
      "Light chicken curry + roti | Egg curry + rice | Fish curry light",
      "Chicken stew + bread | Mutton soup + roti | Egg bhurji + paratha",
      "Light chicken + chapati | Anda curry + rice | Keema paratha",
      "Chicken khichdi | Egg dal-rice | Light fish + phulka",
      "Chicken soup + bread | Egg fried rice | Chicken daliya",
    ],
    VEG_SNACKS: [
      "Samosa + chutney | Aloo tikki | Chole tikki",
      "Bread pakora + lassi | Paneer pakora | Onion bhajiya",
      "Sweet lassi + pinni | Mathri + pickle | Roasted chana + chai",
      "Fruit chaat | Chana chaat | Sprouts chaat",
      "Pinni + milk | Banana milkshake | Makhana with milk",
    ],
    VEG_TIFFIN: [
      "Aloo paratha + curd + pickle | Gobi paratha + chutney | Mooli paratha + butter",
      "Chole rice + raita | Rajma chawal box | Paneer paratha + curd",
      "Dal makhani + naan box | Veg pulao + raita | Stuffed paratha box",
      "Amritsari kulcha + chole | Mix veg pulao | Chana paratha",
      "Cheese paratha + ketchup | Veg roll Punjabi | Paneer roll",
    ],
    NONVEG_TIFFIN: [
      "Chicken roll Punjabi | Egg paratha + curd | Anda kheema paratha",
      "Chicken biryani box | Egg sandwich | Chicken kathi roll",
      "Egg bhurji wrap | Anda curry + paratha box | Chicken cutlet",
      "Mutton biryani box | Egg pulao | Chicken keema paratha",
      "Egg roll Punjabi style | Chicken patty + bread | Boiled egg + paratha",
    ],
  },
  global: {
    VEG_BREAKFAST: [
      "Pancakes with maple syrup and fruit | Waffles + berries | French toast + honey",
      "Avocado toast + boiled potato | Veg omelette (paneer) + toast | Smoothie bowl + granola",
      "Cornflakes / muesli + milk + banana | Oatmeal + nuts + honey | Greek yogurt + granola + fruit",
      "Veg sandwich + juice | Bagel + cream cheese | Croissant + jam + milk",
      "Tofu scramble + toast | Veg burrito (beans, cheese) | Mediterranean platter (hummus + pita)",
    ],
    NONVEG_BREAKFAST: [
      "Scrambled eggs + bacon + toast | Egg omelette + sausages | Eggs Benedict",
      "Pancakes + bacon | Chicken sandwich + juice | Tuna toast + milk",
      "Boiled eggs + bread + cheese | Smoked salmon bagel | Chicken sausage + scrambled eggs",
      "French toast + ham | Egg muffins + fruit | Chicken wrap + smoothie",
      "Egg sandwich + milk | Greek yogurt + granola + boiled egg | Avocado + egg toast",
    ],
    VEG_LUNCH: [
      "Pasta with tomato sauce + salad | Veg pizza + soup | Caesar salad with cheese",
      "Veg burger + fries + juice | Mac & cheese + veggies | Veg lasagna + salad",
      "Stir-fried veg + rice | Quesadilla + salsa | Veg sushi + miso soup",
      "Mexican rice + beans + cheese | Mediterranean bowl (hummus, falafel, salad) | Veg quiche + salad",
      "Pesto pasta + garlic bread | Veg wrap + smoothie | Buddha bowl (quinoa, veg, dressing)",
    ],
    NONVEG_LUNCH: [
      "Grilled chicken + rice + veg | Pasta with chicken + salad | Fish and chips + salad",
      "Chicken burger + fries | Tuna pasta salad | Chicken Caesar salad",
      "Roast chicken + mashed potato + veg | Chicken sushi + soup | Beef tacos + salsa",
      "Chicken wrap + fries | Salmon + rice + veg | Chicken pizza + salad",
      "Chicken stir-fry + noodles | Turkey sandwich + soup | Chicken burrito bowl",
    ],
    VEG_DINNER: [
      "Pasta + salad + bread | Veg soup + grilled cheese | Light pizza + salad",
      "Stir-fried veg + brown rice | Veg wrap + soup | Veg risotto + salad",
      "Baked potato + veg + cheese | Veg sushi + miso | Pesto pasta light",
      "Veg quesadilla + salad | Light veg curry + rice | Buddha bowl",
      "Mediterranean platter | Tomato soup + bread | Veg lasagna light",
    ],
    NONVEG_DINNER: [
      "Grilled chicken + veg | Light fish + rice | Chicken soup + bread",
      "Roast chicken + salad | Salmon + veg + rice | Chicken stew + bread",
      "Tuna salad + bread | Chicken wrap + soup | Light chicken pasta",
      "Egg curry + rice (Western) | Chicken burrito light | Fish tacos light",
      "Light chicken risotto | Egg fried rice | Chicken + quinoa bowl",
    ],
    VEG_SNACKS: [
      "Fruit + yogurt | Cheese + crackers | Veg sticks + hummus",
      "Banana + peanut butter | Apple + cheese | Trail mix + milk",
      "Smoothie + granola | Yogurt parfait | Fruit + nuts",
      "Cheese sandwich | Cheese cubes + grapes | Mini pizza",
      "Veg muffin + milk | Fruit salad + honey | Popcorn + juice",
    ],
    NONVEG_SNACKS: [
      "Boiled egg + fruit | Tuna sandwich | Chicken nuggets + ketchup",
      "Egg muffin | Chicken cubes + cheese | Tuna salad in pita",
      "Chicken sandwich | Egg + crackers | Chicken wrap mini",
      "Egg + cheese roll | Chicken popcorn | Tuna + crackers",
      "Egg salad sandwich | Boiled egg + milk | Chicken cheese roll",
    ],
    VEG_TIFFIN: [
      "Veg sandwich + fruit | Pasta salad + juice | Veg wrap + cheese",
      "Mac & cheese box | Veg pizza slices + fruit | Quesadilla + salsa",
      "Veg sushi box | Pesto pasta box | Buddha bowl",
      "Veg burrito + chips | Cheese sandwich + fruit | Veg lasagna slice",
      "Veg quiche + salad | Stir-fried noodles | Mediterranean wrap",
    ],
    NONVEG_TIFFIN: [
      "Chicken sandwich + fruit | Tuna pasta box | Chicken wrap + chips",
      "Chicken nuggets + rice | Salmon + rice box | Chicken burger + fries",
      "Chicken sushi box | Egg + cheese sandwich | Chicken pizza slice",
      "Chicken pasta box | Tuna salad + bread | Chicken burrito + salsa",
      "Roast chicken + bread | Chicken stir-fry + rice | Chicken Caesar wrap",
    ],
  },
};

function mealsFor(region: Region | undefined, key: MealKey): string[] {
  const r: Region = region ?? "pan_indian";
  if (r === "pan_indian") return PAN_INDIAN_MEALS[key];
  return REGIONAL_MEALS[r][key] ?? PAN_INDIAN_MEALS[key];
}

// ─── Activity Pools per Age Group ─────────────────────────────────────────────

type Block = { activity: string; duration: number; category: string; notes: string };

const MORNING_HYGIENE: Record<AgeGroup, Block> = {
  infant:       { activity: "Morning Care & Diaper Change", duration: 20, category: "hygiene", notes: "Clean diaper, gentle wipe-down, fresh clothes. Talk softly to baby — narrate every step." },
  toddler:      { activity: "Morning Freshen Up", duration: 20, category: "hygiene", notes: "Wash face, brush teeth with parent's help, fresh clothes. Make it fun — sing a song!" },
  preschool:    { activity: "Morning Routine", duration: 25, category: "hygiene", notes: "Brush teeth, wash face, comb hair, get dressed. Praise every step they do independently." },
  early_school: { activity: "Morning Hygiene & Dress Up", duration: 30, category: "hygiene", notes: "Brush teeth, bathe/freshen up, comb hair, pack school bag the night before. No rush!" },
  pre_teen:     { activity: "Morning Routine", duration: 30, category: "hygiene", notes: "Shower, brush, dress, pack bag. Encourage to do this independently — builds discipline." },
};

const SLEEP_ANCHOR: Record<AgeGroup, Block> = {
  infant:       { activity: "Night Sleep", duration: 0, category: "sleep", notes: "Ensure a cool, dark, quiet room. Swaddle if baby prefers. White noise or lullaby helps." },
  toddler:      { activity: "Bedtime & Sleep", duration: 0, category: "sleep", notes: "Keep room dark and cool. Final cuddle time — whisper 'I love you'. No screens 1 hour before." },
  preschool:    { activity: "Lights Out — Sleep Time", duration: 0, category: "sleep", notes: "Consistent bedtime builds healthy sleep patterns. Read one last short story if they want." },
  early_school: { activity: "Sleep Time", duration: 0, category: "sleep", notes: "Aim for 9–10 hours of sleep. Switch off all screens. A consistent bedtime = better school performance." },
  pre_teen:     { activity: "Sleep Time", duration: 0, category: "sleep", notes: "Aim for 8–9 hours. Phone outside room. Sleep consistency improves mood and focus." },
};

const WIND_DOWN: Record<AgeGroup, Block[]> = {
  infant: [
    { activity: "Evening Bath & Massage", duration: 20, category: "hygiene", notes: "Warm bath relaxes baby. Gentle massage with baby oil after bath — promotes deep sleep." },
    { activity: "Feeding & Lullaby", duration: 20, category: "sleep", notes: "Last feed before sleep. Dim lights, soft music or humming lullaby. Establish this as a sleep cue." },
  ],
  toddler: [
    { activity: "Bath Time", duration: 20, category: "hygiene", notes: "Warm bath signals bedtime. Keep it calm — no active play in bath. Gentle soap, soft towel." },
    { activity: "Bedtime Story", duration: 15, category: "bonding", notes: "Read 1 picture book together. Let them choose the story — builds love for reading and bonding." },
    { activity: "Wind-Down & Cuddle", duration: 10, category: "wind-down", notes: "Dim lights, soft music. Cuddle time. Talk about 1 good thing from today." },
  ],
  preschool: [
    { activity: "Bath & Fresh Up", duration: 20, category: "hygiene", notes: "Cool down after the day. Brushing teeth after bath — build the habit early." },
    { activity: "Story Time", duration: 20, category: "bonding", notes: "Read together — let them predict the story ending. Great for imagination and vocabulary." },
    { activity: "Wind-Down", duration: 10, category: "wind-down", notes: "Dim lights, calm music. Ask: What was your favourite thing today? Give them a big hug." },
  ],
  early_school: [
    { activity: "Bath & Personal Hygiene", duration: 20, category: "hygiene", notes: "Freshen up for the night. Brush teeth, wash face. Good hygiene = good habits for life." },
    { activity: "Reading Time", duration: 20, category: "play", notes: "Let them choose any book — story, comics, anything they enjoy. Reading daily builds intelligence." },
    { activity: "Wind-Down & Reflection", duration: 15, category: "wind-down", notes: "No screens. Talk about the day: 1 win, 1 challenge, 1 thing to try tomorrow. Builds emotional intelligence." },
  ],
  pre_teen: [
    { activity: "Personal Hygiene", duration: 20, category: "hygiene", notes: "Shower, skincare routine, brush teeth. Help them establish their own evening routine." },
    { activity: "Reading or Journaling", duration: 20, category: "play", notes: "Free reading choice, or write 3 things they're grateful for today. Builds reflection habit." },
    { activity: "Wind-Down", duration: 10, category: "wind-down", notes: "Dim screen brightness 1 hour before sleep. Stretch or deep breathing for 5 min. No social media." },
  ],
};

const AFTERNOON_ACTIVITIES: Record<AgeGroup, Block[]> = {
  // ── Infant (0–12 months): stimulation, motor milestones, sensory ─────────
  infant: [
    { activity: "Tummy Time", duration: 15, category: "play", notes: "Place on tummy on a firm surface. Builds neck and shoulder strength — the foundation of all future motor skills. Never leave unattended." },
    { activity: "Sensory Basket Exploration", duration: 20, category: "play", notes: "Fill a basket with safe objects — wooden spoon, soft cloth, metallic bowl. Let baby explore textures and sounds freely." },
    { activity: "Outdoor Fresh Air & Narration", duration: 20, category: "play", notes: "Carry baby outside. Narrate everything — trees, birds, people. Vocabulary-building starts from birth through rich language input." },
    { activity: "Baby Massage", duration: 15, category: "hygiene", notes: "Gentle massage with coconut or baby oil. Promotes bonding, circulation, and deep sleep. Hum softly throughout." },
    { activity: "Mirror Play", duration: 10, category: "play", notes: "Show baby their reflection — they love it! Make funny faces. Builds self-awareness and early social mirroring." },
    { activity: "High-Contrast Card Time", duration: 10, category: "play", notes: "Show black-and-white picture cards 20–30 cm from baby's face. Newborn vision develops fastest with high-contrast patterns." },
    { activity: "Rattle Reach & Grasp", duration: 15, category: "play", notes: "Hold colorful rattles just within reach. Reaching and grasping are critical motor milestones — celebrate every touch!" },
    { activity: "Singing & Lap Bouncing", duration: 15, category: "play", notes: "Sing nursery rhymes with gentle knee bouncing. Rhythm and music wire the developing brain — language, memory, and bonding." },
  ],
  // ── Toddler (1–3 years): movement, sensory, imitation, early language ─────
  toddler: [
    { activity: "Free Outdoor Exploration", duration: 30, category: "play", notes: "Park, garden, or open space. Run, jump, climb, fall — physical play is the #1 developmental need for toddlers." },
    { activity: "Finger Painting", duration: 20, category: "creative", notes: "Washable paints + large paper. Let them smear and mix freely — no 'correct' art. Sensory + creative = brain development." },
    { activity: "Building Blocks & Knocking Down", duration: 20, category: "play", notes: "Stack, knock down, rebuild. Cause-and-effect and spatial reasoning start here. Every tumble is a physics lesson!" },
    { activity: "Puzzle & Shape Sorting", duration: 20, category: "play", notes: "Simple 4–8 piece puzzles, shape sorters, stacking cups. Builds problem-solving and fine motor control." },
    { activity: "Music & Dance Party", duration: 15, category: "play", notes: "Play nursery rhymes and dance and wiggle together. Toddlers love moving to music — great for coordination and pure joy." },
    { activity: "Supervised Water & Pouring Play", duration: 20, category: "play", notes: "Pouring, splashing, dunking cups in a shallow tub. Develops sensory awareness, cause-effect, and keeps them cool." },
    { activity: "Picture Book Flip & Name", duration: 15, category: "play", notes: "Flip through picture books — name and point to everything. Builds vocabulary 3x faster than screen time at this age." },
    { activity: "Pretend Play (Mini Kitchen / Tea Party)", duration: 20, category: "play", notes: "Mini kitchen, toy shop, or tea party. Imitation is how toddlers make sense of the adult world — encourage every scene." },
    { activity: "Bubble Chasing", duration: 15, category: "play", notes: "Blow bubbles and chase them together. Gross motor, hand-eye coordination, and pure joy — all in one." },
    { activity: "Scribbling & Mark-Making", duration: 15, category: "creative", notes: "Crayons on big paper. Scribbling IS writing preparation. Ask 'tell me about your drawing' — never 'what is it?'" },
  ],
  // ── Preschool (3–5 years): imagination, early literacy, sensory, social ───
  preschool: [
    { activity: "Art & Craft Creation", duration: 30, category: "creative", notes: "Drawing, coloring, cutting, collage. Let creativity lead — process matters more than product. Display their work proudly." },
    { activity: "Outdoor Play & Exploration", duration: 30, category: "play", notes: "Swings, slides, sand play, collecting leaves and stones. 30 min of outdoor physical play is non-negotiable for preschoolers." },
    { activity: "Pretend & Role Play", duration: 25, category: "play", notes: "Doctor, chef, teacher, shopkeeper, superhero. Role play builds language, empathy, and social problem-solving at this age." },
    { activity: "Letter & Number Hunt", duration: 20, category: "play", notes: "Spot letters on signs and books, count household objects. Make it a treasure hunt — learning disguised as play." },
    { activity: "Jigsaw Puzzle Challenge", duration: 20, category: "play", notes: "15–24 piece puzzles build patience, spatial logic, and task-completion skills. Celebrate loudly when the last piece fits!" },
    { activity: "Action Songs & Music Time", duration: 15, category: "play", notes: "Hokey Pokey, Wheels on the Bus, action rhymes. Movement + rhythm + words = powerful early language development." },
    { activity: "Sensory Play (Kinetic Sand / Dough)", duration: 20, category: "play", notes: "Kinetic sand, moon dough, or flour-salt-water dough. Sensory play calms big emotions and builds focus and fine motor skills." },
    { activity: "Story Invention Together", duration: 20, category: "play", notes: "Start: 'Once there was a magic elephant...' Let them continue. Builds imagination, sequencing, and narrative language skills." },
    { activity: "Simple Kitchen Helper", duration: 20, category: "play", notes: "Washing veggies, mixing, tearing lettuce, rolling dough. Preschoolers love real tasks — it builds pride and ownership." },
    { activity: "Nature Scavenger Hunt", duration: 25, category: "play", notes: "Find: something red, something round, something soft, a leaf, an insect. Builds observation, vocabulary, and love of nature." },
  ],
  // ── Early School (5–10 years): sports, STEM, reading, strategy, creativity ──
  early_school: [
    { activity: "Outdoor Sport", duration: 40, category: "play", notes: "Cricket, football, cycling, badminton, swimming — their choice. Daily sport builds focus, health, teamwork, and confidence." },
    { activity: "Creative Writing / Storytelling", duration: 30, category: "creative", notes: "Write a short story, comic strip, or poem. Encourages imagination and builds literacy beyond school assignments." },
    { activity: "Strategy Board Game", duration: 30, category: "play", notes: "Chess, Scrabble, Carrom, Battleship, Blokus. Strategy games build patience, forward planning, and healthy competition." },
    { activity: "STEM / Science Experiment", duration: 30, category: "play", notes: "Baking soda volcano, paper bridge challenge, seed sprouting, DIY circuits. Hands-on science beats any textbook." },
    { activity: "Reading for Pleasure", duration: 25, category: "play", notes: "Comics, fiction, non-fiction — their choice. Daily pleasure reading is the #1 predictor of long-term academic success." },
    { activity: "Art & Drawing Project", duration: 25, category: "creative", notes: "Still life, painting, or a long-form craft. Regular creative time builds emotional regulation, detail-orientation, and originality." },
    { activity: "Geography & General Knowledge Quiz", duration: 20, category: "play", notes: "Capitals, flags, animal facts, sports trivia. A friendly family competition makes geography the most fun subject." },
    { activity: "Cycling or Skipping Rope", duration: 25, category: "play", notes: "Cycling builds coordination, road confidence, and independence. Skipping is fantastic cardio that also improves rhythm." },
    { activity: "Coding & Logic Puzzles", duration: 25, category: "play", notes: "Scratch, Code.org, Sudoku, or logic grid puzzles. Computational thinking is a 21st-century superpower — start now." },
    { activity: "Home Responsibility Task", duration: 20, category: "play", notes: "Setting the table, watering plants, folding laundry. Chores build responsibility and a sense of contribution to the family." },
  ],
  // ── Pre-Teen (10–15 years): identity, independence, deep skills, wellness ──
  pre_teen: [
    { activity: "Physical Fitness / Sport", duration: 35, category: "play", notes: "Running, gym, yoga, team sport, swimming, martial arts. Daily exercise fights pre-teen stress, anxiety, and mood swings." },
    { activity: "Deep Hobby Session", duration: 45, category: "play", notes: "Music, art, coding, photography, cooking, writing — their passion. Protect this time fiercely: hobbies build identity and resilience." },
    { activity: "Independent Curiosity Project", duration: 35, category: "study", notes: "Research something they're curious about and present it. Self-directed learning is far more powerful than assigned homework." },
    { activity: "Coding / App Prototyping", duration: 35, category: "play", notes: "Python, JavaScript, Scratch, or app design. 20 min of coding daily for 6 months produces real, marketable competence." },
    { activity: "Journaling / Creative Writing", duration: 25, category: "creative", notes: "Diary, short fiction, poetry, or opinion essays. Daily writing is the single most valuable cognitive habit at this age." },
    { activity: "Strength Training / Yoga Flow", duration: 30, category: "play", notes: "Bodyweight exercises, resistance bands, or yoga. Builds discipline, body confidence, and self-regulation — all critical in pre-teens." },
    { activity: "Financial Literacy Exercise", duration: 20, category: "study", notes: "Track pocket money, compare product prices, research how savings grow. Money skills learnt young compound for life." },
    { activity: "Social / Community Project", duration: 25, category: "play", notes: "Organise a donation drive, tutor a younger sibling, or plan a community action. Builds empathy, leadership, and purpose." },
    { activity: "News & Current Events Discussion", duration: 20, category: "study", notes: "Read one news story together and discuss multiple perspectives. Builds critical thinking and media literacy — essential now." },
    { activity: "Creative Digital Project", duration: 35, category: "creative", notes: "YouTube video, podcast episode, digital art, music production, animation. Pre-teens have creative energy — channel it!" },
  ],
};

// Age-banded bonding activities — distinct content per developmental stage
const BONDING_ACTIVITIES_BY_BAND: Record<"2-5" | "6-10" | "10+", Block[]> = {
  // Ages 2-5: toddler + preschool — sensory, movement, simple shared play
  "2-5": [
    { activity: "Story Time Together", duration: 20, category: "bonding", notes: "Read a picture book aloud, pointing to pictures. Ask 'Where is the dog?' and 'What happens next?' Pure magic for little ones." },
    { activity: "Dance & Silly Songs Together", duration: 15, category: "bonding", notes: "Put on nursery rhymes and dance and wiggle together. Silly dancing = big laughs = strong parent-child bonds." },
    { activity: "Nature Walk & Collect", duration: 20, category: "bonding", notes: "Walk slowly and collect leaves, pebbles, flowers. 'What colour is that?' Simple conversations that build vocabulary and wonder." },
    { activity: "Playdough & Clay Together", duration: 20, category: "bonding", notes: "Roll, squish, make animals and food together. Your presence makes it special — they'll recreate this with their own children." },
    { activity: "Bubble Blowing Fun", duration: 15, category: "bonding", notes: "Blow bubbles and chase and pop them together. Pure joy — these tiny moments are what childhood memories are made of." },
    { activity: "Bedtime Story Invention", duration: 15, category: "bonding", notes: "Invent a story together with them as the hero. 'Then what happened?' They'll ask for this every night." },
  ],
  // Ages 6-10: early school — games, science, cooking, outdoor challenges
  "6-10": [
    { activity: "Board Game / Card Game", duration: 30, category: "bonding", notes: "Ludo, Snakes & Ladders, UNO, Carrom, Battleship. Let them win sometimes — builds confidence and sportsmanship!" },
    { activity: "Simple Cooking Together", duration: 25, category: "bonding", notes: "Make a sandwich, salad, or simple snack together. Kids who cook with parents are more adventurous eaters and gain real confidence." },
    { activity: "Outdoor Walk & Talk", duration: 25, category: "bonding", notes: "Walk without phones and ask open questions: 'What made you smile today? What was the hardest part?' — real answers emerge on walks." },
    { activity: "Home Science Experiment", duration: 30, category: "bonding", notes: "Baking soda volcano, paper bridge contest, DIY compass. Learning through hands-on play with a parent = memories that last decades." },
    { activity: "Treasure Hunt Around the House", duration: 25, category: "bonding", notes: "Hide clues leading to a small treat or surprise. They'll talk about this for days — and ask for it every weekend." },
    { activity: "Movie / Show Together", duration: 40, category: "bonding", notes: "Watch something they enjoy — no phones during the show. Ask afterwards: 'Favourite part? What would YOU do in that situation?'" },
    { activity: "Art Project Together", duration: 30, category: "bonding", notes: "Draw, origami, clay, or a craft project together. Display the result prominently — their pride in shared creation is immense." },
  ],
  // Ages 10+: pre-teen — peer-level collaboration, real responsibility, deep conversations
  "10+": [
    { activity: "Cook a Full Recipe Together", duration: 40, category: "bonding", notes: "Let them lead the recipe — you assist. Pre-teens who cook with parents gain confidence, life skills, and feel genuinely valued." },
    { activity: "Family Quiz / Friendly Debate", duration: 30, category: "bonding", notes: "General knowledge quiz, or a safe opinion debate. Teaches critical thinking and that it's okay to disagree respectfully." },
    { activity: "Workout or Yoga Together", duration: 30, category: "bonding", notes: "Run, do yoga, or follow a workout video together. Modelling healthy habits at this age shapes their lifestyle for decades." },
    { activity: "Plan a Family Outing Together", duration: 25, category: "bonding", notes: "Let them research destinations, check timings, plan the budget. Real decision-making power builds ownership and maturity." },
    { activity: "Gardening or DIY Project", duration: 35, category: "bonding", notes: "Plant something, fix something, build something together. Working with hands beside a parent is quietly one of the deepest bonds." },
    { activity: "Documentary + Discussion", duration: 45, category: "bonding", notes: "A nature, science, or history documentary — then discuss the 3 most interesting facts. Great conversations start here." },
    { activity: "Photo Walk Together", duration: 30, category: "bonding", notes: "Walk with phones/cameras and take creative photos. Share the best shots and talk about why you chose them — surprisingly deep." },
  ],
};

// Flat lookup used in generatePartialRoutine (picks the right band automatically)
function getBondingActivities(ageGroup: AgeGroup): Block[] {
  return BONDING_ACTIVITIES_BY_BAND[AGE_BAND_MAP[ageGroup]];
}

const TODDLER_NAP: Block = { activity: "Afternoon Nap", duration: 90, category: "sleep", notes: "Toddlers need 1–2 hours of daytime sleep. Keep room cool and dark. Same time each day." };
const PRESCHOOL_REST: Block = { activity: "Quiet Rest Time", duration: 45, category: "sleep", notes: "Even if not sleeping, quiet time recharges energy. Books, soft toys — no screens." };

const TRAVEL_DURATION: Record<string, number> = {
  van: 20, car: 15, walk: 20, other: 20,
};

// ─── Title Templates ──────────────────────────────────────────────────────────

const TITLES: Record<AgeGroup, Record<string, string[]>> = {
  infant: {
    any: [
      "{name}'s Gentle Care Day 💝",
      "{name}'s Loving Day 👶",
      "{name}'s Nurture & Growth Day 🌱",
    ],
  },
  toddler: {
    school: ["{name}'s Playful School Day 🎒", "{name}'s Busy Toddler Day 🌈"],
    holiday: ["{name}'s Fun Play Day 🎉", "{name}'s Adventure Day 🌟", "{name}'s Happy Day 🎈"],
  },
  preschool: {
    school: ["{name}'s Creative School Day 🎨", "{name}'s Rainbow Learning Day 🌈"],
    holiday: ["{name}'s Imagination Day 🌟", "{name}'s Playful Holiday 🎉", "{name}'s Discovery Day 🔍"],
  },
  early_school: {
    school: ["{name}'s Power School Day 📚", "{name}'s Champion Study Day ⭐", "{name}'s Focus Day 🎯"],
    holiday: ["{name}'s Fun Family Day 🌻", "{name}'s Holiday Adventure 🎮", "{name}'s Chill Weekend 🏖️"],
  },
  pre_teen: {
    school: ["{name}'s Achievement Day 🎯", "{name}'s Goals Day 💪", "{name}'s Smart Study Day 📖"],
    holiday: ["{name}'s Recharge Day 🔋", "{name}'s Freedom Day 🌟", "{name}'s Growth Day 🚀"],
  },
};

function makeTitle(ageGroup: AgeGroup, childName: string, hasSchool: boolean, seed: number): string {
  const pool = ageGroup === "infant"
    ? TITLES.infant.any!
    : hasSchool
    ? (TITLES[ageGroup].school ?? TITLES[ageGroup].any ?? ["{name}'s Day"])
    : (TITLES[ageGroup].holiday ?? TITLES[ageGroup].any ?? ["{name}'s Day"]);
  const template = pick(pool, seed);
  return template.replace("{name}", childName);
}

// ─── Routine v2 Post-Processing ───────────────────────────────────────────────
// Re-anchors school-aware meal blocks, deduplicates meal names, and attaches
// per-block recipe + nutrition + age-band + Parent Hub pointers.

const AGE_BAND_MAP: Record<AgeGroup, "2-5" | "6-10" | "10+"> = {
  infant: "2-5",
  toddler: "2-5",
  preschool: "2-5",
  early_school: "6-10",
  pre_teen: "10+",
};

const PARENT_HUB_BY_CATEGORY: Record<string, string> = {
  homework: "Study Skills & Focus",
  bonding: "Family Bonding Ideas",
  play: "Age-Appropriate Play",
  creative: "Creative Development",
  study: "Independent Learning",
  screen: "Healthy Screen Habits",
  meal: "Nutrition & Picky Eaters",
  tiffin: "Tiffin Box Ideas",
  exercise: "Kids Fitness",
  reading: "Reading Habits",
};

// Returns a Parent Hub topic string annotated with the child's age band so
// deep-links open age-banded content in the Parent Hub (e.g. "Family Bonding
// Ideas · Ages 6–10"). Falls back to the base topic if category not found.
function parentHubTopicForBand(category: string, band: "2-5" | "6-10" | "10+"): string | null {
  const base = PARENT_HUB_BY_CATEGORY[category.toLowerCase()];
  if (!base) return null;
  const label = band === "2-5" ? "Ages 2–5" : band === "6-10" ? "Ages 6–10" : "Ages 10+";
  return `${base} · ${label}`;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function setItemTime(item: ScheduleItem, mins: number): void {
  item.time = minsToTime(mins);
}

function isMealBlock(it: ScheduleItem): boolean {
  const c = (it.category ?? "").toLowerCase();
  return c === "meal" || c === "tiffin";
}

// Extract the canonical meal "name" the user sees: notes look like
// "Options: A | B | C". We pick the first option as the canonical label.
function extractFirstMealName(it: ScheduleItem): string {
  const n = it.notes ?? "";
  if (n.startsWith("Options:")) {
    return (n.replace("Options:", "").split("|")[0] ?? it.activity).trim();
  }
  return it.activity;
}

// Build a fridge-aware fallback meal name when the deduper can't find a unique
// option. e.g. fridge has "tomato, paneer" → "Tomato paneer wrap".
function fridgeFallbackMeal(fridge: string[], used: Set<string>): string | null {
  if (fridge.length === 0) return null;
  const templates = [
    (a: string, b: string) => `${a} ${b} wrap`,
    (a: string, b: string) => `${a} & ${b} bowl`,
    (a: string, b: string) => `${a} stuffed paratha with ${b}`,
    (a: string) => `${a} toast`,
    (a: string, b: string) => `${a}-${b} stir-fry with rice`,
  ];
  for (const t of templates) {
    for (let i = 0; i < fridge.length; i++) {
      for (let j = 0; j < fridge.length; j++) {
        if (i === j) continue;
        const candidate = t(fridge[i], fridge[j] ?? fridge[i]);
        if (!used.has(candidate.toLowerCase())) return candidate;
      }
    }
  }
  return null;
}

// Generic non-fridge fallback bank used when the deduper has exhausted all
// options AND the parent didn't supply fridge items. Guarantees we can always
// hand back a unique meal name for the day.
const GENERIC_FALLBACK_MEALS = [
  "Veg pulao with raita",
  "Curd rice with pickle",
  "Khichdi with ghee",
  "Roti with dal & sabzi",
  "Paneer bhurji with toast",
  "Egg fried rice",
  "Pasta in tomato sauce",
  "Vegetable upma",
  "Stuffed paratha with curd",
  "Chole with rice",
];

// Strict guarantee: returns a meal name not already in `used`. Tries fridge
// fallbacks first, then generic bank, then suffixes the original until unique.
function uniqueMealName(seed: string, used: Set<string>, fridge: string[]): string {
  const tryName = (n: string): string | null => {
    if (!used.has(n.toLowerCase())) return n;
    return null;
  };
  const direct = tryName(seed);
  if (direct) return direct;
  const fridgeAlt = fridgeFallbackMeal(fridge, used);
  if (fridgeAlt) return fridgeAlt;
  for (const g of GENERIC_FALLBACK_MEALS) {
    const ok = tryName(g);
    if (ok) return ok;
  }
  // Absolute last resort: suffix the seed with a count so it is unique.
  let i = 2;
  while (used.has(`${seed} (v${i})`.toLowerCase())) i++;
  return `${seed} (v${i})`;
}

// Rotate through pipe-separated options to avoid repeating the same meal name
// twice in a single day. STRICT: the returned `primary` is guaranteed to be
// unique within `used` for the whole day. `activitySeed` is used as the
// preferred seed when notes are not in `Options:` format (e.g. "Lunch",
// "Tiffin") — this avoids deriving a meal name from a long sentence note.
function dedupMealNotes(notes: string, used: Set<string>, fridge: string[] = [], activitySeed = ""): { notes: string; primary: string } {
  if (!notes.startsWith("Options:")) {
    const seed = (activitySeed || notes).trim() || "Meal";
    const primary = uniqueMealName(seed, used, fridge);
    used.add(primary.toLowerCase());
    return { notes, primary };
  }
  const opts = notes.replace("Options:", "").split("|").map((s) => s.trim()).filter(Boolean);
  // Prefer first option not already used
  let chosen = opts.find((o) => !used.has(o.toLowerCase()));
  if (!chosen) {
    // All current options are duplicates — derive a strictly unique name.
    chosen = uniqueMealName(opts[0] ?? "Meal", used, fridge);
  }
  const rest = opts.filter((o) => o !== chosen);
  const reordered = "Options: " + [chosen, ...rest].join(" | ");
  used.add(chosen.toLowerCase());
  return { notes: reordered, primary: chosen };
}

type AnchorOpts = {
  hasSchool: boolean;
  schoolStartMins: number;
  schoolEndMins: number;
  ageGroup: AgeGroup;
  fridgeItems?: string;
};

// Light/quick options good for a 15-min "before school" meal — used both as a
// suggestion bank and as a baseline for the Quick Meal Before School notes.
const QUICK_BEFORE_SCHOOL_OPTIONS = [
  "Banana + milk + toast",
  "Idli with chutney",
  "Poha (no veggies needed)",
  "Boiled egg + toast",
  "Paratha roll-up",
  "Cornflakes with milk",
  "Upma (quick)",
];

// Apply the school-aware meal-window contract. We work directly on item array
// (mutating it) because callers always re-sort + dedupe afterwards.
function anchorMealWindows(items: ScheduleItem[], opts: AnchorOpts): ScheduleItem[] {
  const { hasSchool, schoolStartMins, schoolEndMins, ageGroup } = opts;
  const out = [...items];

  const findIdx = (pred: (it: ScheduleItem) => boolean): number => out.findIndex(pred);

  // 1. Breakfast handling
  const bfIdx = findIdx((it) => /^breakfast$/i.test(it.activity));
  if (bfIdx !== -1) {
    const bf = out[bfIdx];
    if (hasSchool) {
      // Quick Meal Before School — 15 min, anchored 15 min before school start.
      // Force the notes to a light/quick options bank so the meal type matches
      // the time budget (no heavy dishes that take 30+ min to eat).
      const target = Math.max(0, schoolStartMins - 15);
      bf.activity = "Quick Meal Before School";
      bf.duration = 15;
      setItemTime(bf, target);
      bf.notes = `Options: ${QUICK_BEFORE_SCHOOL_OPTIONS.slice(0, 4).join(" | ")}`;
    } else {
      // Non-school: anchor breakfast 8:00–9:00 AM if reachable
      const target = clamp(timeToMins(bf.time), 8 * 60, 9 * 60);
      setItemTime(bf, target);
    }
  } else if (hasSchool) {
    // No breakfast at all — insert Quick Meal Before School so the kid eats.
    out.push({
      time: minsToTime(Math.max(0, schoolStartMins - 15)),
      activity: "Quick Meal Before School",
      duration: 15,
      category: "meal",
      notes: `Options: ${QUICK_BEFORE_SCHOOL_OPTIONS.slice(0, 4).join(" | ")}`,
      status: "pending",
    });
  }

  // 2. School-day Tiffin eating block (kid eats tiffin at school — labelled slot)
  if (hasSchool && (ageGroup === "early_school" || ageGroup === "pre_teen" || ageGroup === "preschool")) {
    const hasTiffinEat = out.some((it) => /^tiffin$/i.test(it.activity) && (it.category ?? "").toLowerCase() === "tiffin");
    if (!hasTiffinEat) {
      out.push({
        time: minsToTime(schoolStartMins + 60),
        activity: "Tiffin",
        duration: 15,
        category: "tiffin",
        notes: "Options: Veg sandwich + fruit | Aloo paratha roll + yoghurt | Idli + chutney | Pasta salad cup",
        status: "pending",
      });
    }
  }

  // 3. Lunch handling
  const lunchIdx = findIdx((it) => /^lunch$/i.test(it.activity));
  if (lunchIdx !== -1) {
    const lunch = out[lunchIdx];
    if (hasSchool && (ageGroup === "preschool" || ageGroup === "early_school" || ageGroup === "pre_teen")) {
      // 30 min after school end (applies to all school-going age bands)
      setItemTime(lunch, schoolEndMins + 30);
    } else if (!hasSchool) {
      // Non-school: 13:30–14:30
      const t = clamp(timeToMins(lunch.time), 13 * 60 + 30, 14 * 60 + 30);
      setItemTime(lunch, t);
    }
  } else if (hasSchool && (ageGroup === "preschool" || ageGroup === "early_school" || ageGroup === "pre_teen")) {
    // Replace After-School Snack with Lunch if no lunch present (school-going kids).
    const snackIdx = findIdx((it) => /^after-school snack$/i.test(it.activity));
    if (snackIdx !== -1) {
      const snack = out[snackIdx];
      snack.activity = "Lunch";
      snack.duration = Math.max(snack.duration, 25);
      setItemTime(snack, schoolEndMins + 30);
    }
  }

  // 4. Drunch (5–6 PM) — guarantee one block in the 17:00–18:00 window every
  // day. First, try to upgrade an existing afternoon snack; otherwise, insert
  // a new Drunch block.
  const drunchIdx = findIdx((it) => /(^drunch$|afternoon snack|after-school snack|mid-morning snack|post-school snack|evening snack)/i.test(it.activity));
  if (drunchIdx !== -1) {
    const it = out[drunchIdx];
    it.activity = "Drunch";
    const cur = timeToMins(it.time);
    const target = clamp(cur, 17 * 60, 18 * 60);
    setItemTime(it, target);
    it.duration = Math.max(it.duration, 20);
    if (!it.notes || !it.notes.startsWith("Options:")) {
      it.notes = "Options: Cheese sandwich + milk | Idli + chutney | Fruit chaat + nuts | Paneer wrap";
    }
  } else {
    out.push({
      time: minsToTime(17 * 60 + 30),
      activity: "Drunch",
      duration: 25,
      category: "meal",
      notes: "Options: Cheese sandwich + milk | Idli + chutney | Fruit chaat + nuts | Paneer wrap",
      status: "pending",
    });
  }

  // 5. Dinner — anchor 20:00–21:00 if currently outside that band
  const dinIdx = findIdx((it) => /^dinner$/i.test(it.activity));
  if (dinIdx !== -1) {
    const din = out[dinIdx];
    const t = clamp(timeToMins(din.time), 20 * 60, 21 * 60);
    setItemTime(din, t);
  }

  return out;
}

// Attach `meal`, `recipe`, `nutrition` to every meal/tiffin block, dedupe meal
// names across the day, and tag activities with age-band + Parent Hub pointer.
function attachMealMetadata(items: ScheduleItem[], ageGroup: AgeGroup, fridgeItems?: string): ScheduleItem[] {
  const used = new Set<string>();
  const fridge = parseFridgeItems(fridgeItems);
  // Every block carries `meal`/`recipe`/`nutrition` fields in the response —
  // null for non-meal blocks so the contract is uniform across the day.
  const out: ScheduleItem[] = items.map((it) => {
    if (!isMealBlock(it)) {
      return { ...it, meal: undefined, recipe: undefined, nutrition: undefined };
    }
    const { notes, primary } = dedupMealNotes(it.notes ?? it.activity, used, fridge, it.activity);
    return {
      ...it,
      notes,
      meal: primary,
      recipe: recipeFor(primary),
      nutrition: nutritionFor(primary),
    };
  });

  // Tag activities with age band + age-banded Parent Hub topic deep-link.
  // CTA is appended only to the LAST block per category to avoid note spam.
  const band = AGE_BAND_MAP[ageGroup];
  const lastIdxByCat = new Map<string, number>();
  out.forEach((it, idx) => {
    if (parentHubTopicForBand((it.category ?? ""), band)) {
      lastIdxByCat.set((it.category ?? "").toLowerCase(), idx);
    }
  });
  return out.map((it, idx) => {
    const cat = (it.category ?? "").toLowerCase();
    const topic = parentHubTopicForBand(cat, band);
    if (!topic) return it;
    const isLast = lastIdxByCat.get(cat) === idx;
    const baseNotes = it.notes ?? "";
    const cta = ` · Explore more in Parent Hub → ${topic}`;
    return {
      ...it,
      ageBand: band,
      parentHubTopic: topic,
      notes: isLast && !baseNotes.includes("Parent Hub") ? `${baseNotes}${cta}` : baseNotes,
    };
  });
}

// Public entry: run the v2 post-processing on a generated routine.
export function applyRoutineV2(items: ScheduleItem[], opts: AnchorOpts): ScheduleItem[] {
  const anchored = anchorMealWindows(items, opts);
  const tagged = attachMealMetadata(anchored, opts.ageGroup, opts.fridgeItems);
  // Sort by time so any anchored insertions land in the right place.
  return [...tagged].sort((a, b) => timeToMins(a.time) - timeToMins(b.time));
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export function generateRuleBasedRoutine(params: RoutineParams): GeneratedRoutine {
  const {
    childName, ageGroup, wakeUpTime, sleepTime,
    schoolStartTime, schoolEndTime, travelMode, hasSchool,
    mood, foodType, region, specialPlans, fridgeItems, date,
    p1Free, p2Free, bothBusy,
  } = params;

  const seed = dateSeed(date, childName);
  // Accept both "non_veg" (canonical) and legacy "nonveg"
  const isVeg = foodType !== "non_veg" && foodType !== "nonveg";
  const travelMins = TRAVEL_DURATION[travelMode] ?? 20;
  const fridgeList = parseFridgeItems(fridgeItems);
  const meal = (key: MealKey, off = 0): string => {
    if (fridgeList.length > 0) {
      return mealFromItems(key, fridgeList, seed + off);
    }
    const arr = mealsFor(region, key);
    return arr[Math.abs(seed + off) % arr.length]!;
  };

  // Parse times
  let cursor = timeToMins(wakeUpTime);
  const sleepMins = timeToMins(sleepTime);
  const schoolStartMins = timeToMins(schoolStartTime);
  const schoolEndMins = timeToMins(schoolEndTime);

  const items: ScheduleItem[] = [];

  const add = (block: Block | null, overrideMins?: number): void => {
    if (!block) return;
    const at = overrideMins !== undefined ? overrideMins : cursor;
    items.push({ ...block, time: minsToTime(at), status: "pending", notes: block.notes ?? "" });
    cursor = at + block.duration;
  };

  const gap = (mins: number) => { cursor += mins; };

  // ── Infant mode: simplified care blocks ──────────────────────────────────
  if (ageGroup === "infant") {
    add({ activity: "Morning Wake & Feed", duration: 30, category: "meal", notes: "Morning feed (breast/formula). Skin-to-skin cuddle after feeding. Talk and smile at baby." });
    add(MORNING_HYGIENE.infant);
    add({ activity: "Tummy Time", duration: 15, category: "play", notes: "Place on firm surface. Builds neck strength. Never leave unattended. 10–15 min max." });
    add({ activity: "Morning Nap", duration: 90, category: "sleep", notes: "Infants need 14–17 hours of sleep daily. Follow baby's cues — yawning means sleepy." });
    add({ activity: "Mid-Morning Feed", duration: 20, category: "meal", notes: `${isVeg ? "Breast milk or formula" : "Breast milk, formula, or age-appropriate solids if 6m+"}. Feed on demand.` });
    add({ activity: "Sensory Play", duration: 20, category: "play", notes: "High-contrast toys, rattles, soft textures. Stimulates brain development. Narrate what you're doing." });
    add({ activity: "Outdoor Fresh Air", duration: 20, category: "play", notes: "Short stroll or sit in fresh air. Gentle sunlight (avoid harsh midday sun). Great for vitamin D." });
    add({ activity: "Afternoon Feed", duration: 20, category: "meal", notes: "Feed before nap — not after. A full baby sleeps better. Burp gently after feeding." });
    add({ activity: "Afternoon Nap", duration: 90, category: "sleep", notes: "Longer nap window — 1.5–2 hours. Room temperature 22–24°C. No loud noise." });
    add({ activity: "Baby Massage & Play", duration: 25, category: "play", notes: "Gentle oil massage (coconut/baby oil). Great for circulation and bonding. Sing or hum while massaging." });
    add({ activity: "Evening Feed", duration: 20, category: "meal", notes: "Evening feed — keep baby awake during feeding to avoid night confusion. Burp well." });
    add(WIND_DOWN.infant[0]!);
    add(WIND_DOWN.infant[1]!);
    items.push({ ...SLEEP_ANCHOR.infant, time: minsToTime(sleepMins), status: "pending" });
    return { title: makeTitle("infant", childName, false, seed), items: withRewardPoints(items) };
  }

  // ── Structured routine for toddler → pre_teen ─────────────────────────────

  // 1. Morning hygiene
  add(MORNING_HYGIENE[ageGroup]);

  // 2. Breakfast
  const bfOptions = meal(isVeg ? "VEG_BREAKFAST" : "NONVEG_BREAKFAST", 0);
  const bfDuration = ageGroup === "toddler" ? 20 : ageGroup === "preschool" ? 20 : 25;
  add({ activity: "Breakfast", duration: bfDuration, category: "meal", notes: `Options: ${bfOptions}` });

  gap(5); // transition buffer

  // 3. Special plans injection
  if (specialPlans?.trim()) {
    const spMins = Math.min(60, Math.max(30, 45));
    add({ activity: specialPlans.trim(), duration: spMins, category: "play", notes: "Special activity for today — enjoy every moment!" });
    gap(5);
  }

  // 4. School block or no-school activities
  if (hasSchool && ageGroup !== "toddler") {
    // Tiffin preparation — 20 min before travel departure
    const tiffinStart = schoolStartMins - travelMins - 20;
    if (tiffinStart > cursor + 5) {
      // Fill pre-tiffin gap with a morning activity
      const morningFill = ageGroup === "preschool"
        ? { activity: "Morning Free Play", duration: 20, category: "play", notes: "Unstructured play time before school — keeps mornings relaxed and joyful." }
        : { activity: "Morning Reading / Revision", duration: 20, category: "homework", notes: "Light reading or reviewing yesterday's lesson. Starts the brain gently." };
      if (tiffinStart - cursor >= 20) add(morningFill);
    }
    const tiffinOpts = meal(isVeg ? "VEG_TIFFIN" : "NONVEG_TIFFIN", 0);
    add({ activity: "Tiffin Box Preparation", duration: 20, category: "tiffin", notes: `Options: ${tiffinOpts}` });
    gap(5);
    add({ activity: `Travel to School (${travelMode})`, duration: travelMins, category: "travel", notes: `${travelMode === "walk" ? "Walking — great for morning energy!" : "Stay calm, avoid rushing. Play I-Spy or count trees on the way!"}` });
    const schoolDuration = schoolEndMins - schoolStartMins;
    add({ activity: "School Time", duration: schoolDuration > 0 ? schoolDuration : 360, category: "school", notes: `Class ${params.childClass ? params.childClass : ""} — stay focused, be kind to friends, ask questions!` }, schoolStartMins);
    cursor = schoolEndMins;
    add({ activity: `Return Home from School (${travelMode})`, duration: travelMins, category: "travel", notes: "Transition time — let them decompress. Don't ask about homework immediately." });
    const snackOpts = meal(isVeg ? "VEG_SNACKS" : "NONVEG_SNACKS", 1);
    add({ activity: "After-School Snack", duration: 15, category: "meal", notes: `Options: ${snackOpts}` });
    gap(5);
    // Homework block for school-age kids
    if (ageGroup === "early_school" || ageGroup === "pre_teen") {
      const hwDur = ageGroup === "pre_teen" ? 60 : 40;
      add({ activity: "Homework & Study", duration: hwDur, category: "homework", notes: ageGroup === "pre_teen" ? "Pomodoro: 25 min focus, 5 min break. No phone. Review notes first, then do homework." : "Homework first — get it done early. Parent nearby to guide, not do. Praise effort!" });
      gap(5);
    }
  } else if (hasSchool && ageGroup === "toddler") {
    // Toddler school (playschool/daycare) simplified
    const playschoolDur = Math.min(schoolEndMins - schoolStartMins, 180);
    if (schoolStartMins > cursor + 10) {
      add({ activity: "Playschool Preparation", duration: 15, category: "morning", notes: "Pack small bag, water bottle. Hug and reassure — separation anxiety is normal at this age." });
    }
    add({ activity: "Playschool", duration: playschoolDur > 0 ? playschoolDur : 180, category: "school", notes: "Play, friends, songs, and stories. Wonderful early socialisation." }, schoolStartMins);
    cursor = schoolEndMins;
    const snackOpts = meal(isVeg ? "VEG_SNACKS" : "NONVEG_SNACKS", 2);
    add({ activity: "Post-School Snack", duration: 15, category: "meal", notes: `Options: ${snackOpts}` });
  } else {
    // No school — fill morning with activities
    const morningPool = seededShuffle(AFTERNOON_ACTIVITIES[ageGroup], seed + 10);
    let filled = 0;
    const morningEnd = ageGroup === "toddler" ? cursor + 60 : cursor + 90;
    for (const act of morningPool) {
      if (cursor >= morningEnd || filled >= 2) break;
      add(act);
      gap(5);
      filled++;
    }
    if (ageGroup === "toddler" || ageGroup === "preschool") {
      const snackOpts = meal(isVeg ? "VEG_SNACKS" : "NONVEG_SNACKS", 3);
      add({ activity: "Mid-Morning Snack", duration: 15, category: "meal", notes: `Options: ${snackOpts}` });
      gap(5);
    }
  }

  // 5. Toddler nap / preschool rest
  if (ageGroup === "toddler") {
    // Aim for nap around 1–2 PM
    const napTarget = Math.max(cursor + 30, 12 * 60 + 30);
    const lunchOpts = meal(isVeg ? "VEG_LUNCH" : "NONVEG_LUNCH", 0);
    add({ activity: "Lunch", duration: 25, category: "meal", notes: `Options: ${lunchOpts}` }, napTarget - 30);
    gap(5);
    add(TODDLER_NAP);
    gap(10);
  } else if (ageGroup === "preschool") {
    const lunchOpts = meal(isVeg ? "VEG_LUNCH" : "NONVEG_LUNCH", 1);
    add({ activity: "Lunch", duration: 25, category: "meal", notes: `Options: ${lunchOpts}` });
    gap(5);
    if (!hasSchool) add(PRESCHOOL_REST);
    gap(5);
  } else {
    // For early_school and pre_teen on school days, lunch already happened at school
    // On no-school days, add lunch
    if (!hasSchool) {
      const lunchOpts = meal(isVeg ? "VEG_LUNCH" : "NONVEG_LUNCH", 2);
      add({ activity: "Lunch", duration: 30, category: "meal", notes: `Options: ${lunchOpts}` });
      gap(5);
      const snackOpts = meal(isVeg ? "VEG_SNACKS" : "NONVEG_SNACKS", 4);
      add({ activity: "Afternoon Snack", duration: 15, category: "meal", notes: `Options: ${snackOpts}` });
      gap(5);
    }
  }

  // 6. Afternoon activities — pick from pool
  const dinnerMins = sleepMins - 90; // dinner ~90 min before sleep
  const windDownStart = sleepMins - (WIND_DOWN[ageGroup].reduce((s, b) => s + b.duration, 0));
  const activityBudget = windDownStart - cursor;

  const actPool = seededShuffle(AFTERNOON_ACTIVITIES[ageGroup], seed + 20);
  const bondPool = seededShuffle(getBondingActivities(ageGroup), seed + 30);
  let bondAdded = 0;
  let actIdx = 0;
  let bondIdx = 0;

  // Adjust activity durations for mood
  const moodMultiplier = mood === "lazy" ? 0.7 : mood === "happy" ? 1.1 : 1.0;
  const moodSkipHeavy = mood === "angry";

  while (cursor + 20 < windDownStart - 15) {
    const remaining = windDownStart - cursor;
    if (remaining < 20) break;

    // Interleave bonding activity every 2 activities (max 2-3 bonding per day)
    const useBonding = bondAdded < 2 && bondIdx < bondPool.length && (actIdx % 2 === 1 || !actPool[actIdx]);
    if (useBonding) {
      const bond = bondPool[bondIdx]!;
      const dur = Math.min(bond.duration, remaining - 10);
      if (dur >= 15) {
        add({ ...bond, duration: dur });
        bondAdded++;
        gap(5);
        bondIdx++;
      } else break;
    } else if (actIdx < actPool.length) {
      const act = actPool[actIdx]!;
      // Skip heavy homework activities when angry
      if (moodSkipHeavy && act.category === "homework") {
        actIdx++;
        continue;
      }
      const dur = Math.min(Math.round(act.duration * moodMultiplier), remaining - 10);
      if (dur >= 15) {
        add({ ...act, duration: dur });
        gap(5);
      }
      actIdx++;
    } else {
      break;
    }
  }

  // Add 3rd bonding if parent is free and time allows
  if (bondAdded < 3 && !bothBusy && (p1Free || p2Free) && bondIdx < bondPool.length) {
    const bond = bondPool[bondIdx]!;
    const remaining = windDownStart - cursor;
    if (remaining >= bond.duration + 10) {
      add(bond);
      gap(5);
    }
  }

  // Mood booster for angry/lazy
  if (mood === "angry" && cursor + 15 < windDownStart) {
    add({ activity: "Calming Walk or Deep Breathing", duration: 15, category: "play", notes: "Go for a short quiet walk together, or try 5 deep breaths together. No pressure, just support." });
    gap(5);
  }
  if (mood === "lazy" && cursor + 10 < windDownStart) {
    add({ activity: "Quick Energy Game", duration: 10, category: "play", notes: "Simple fun to boost energy: jumping jacks, freeze dance, or a silly race inside the house." });
    gap(5);
  }

  // 7. Screen time (age-appropriate) if budget allows
  const screenAllowed = cursor + 30 < dinnerMins;
  if (screenAllowed) {
    const screenDur = ageGroup === "toddler" ? 20 : ageGroup === "preschool" ? 25 : 30;
    const screenNote = ageGroup === "toddler" || ageGroup === "preschool"
      ? "Educational content only (phonics, colors, nursery rhymes). Co-watch with parent. Max 30 min/day."
      : ageGroup === "early_school"
      ? "Educational or entertainment (30 min max). No violent content. Sit 60 cm+ from screen."
      : "60 min max total screen time. Prefer documentaries, educational videos. Phone on Do Not Disturb.";
    if (cursor + screenDur + 10 <= dinnerMins) {
      add({ activity: "Screen Time", duration: screenDur, category: "screen", notes: screenNote });
      gap(5);
    }
  }

  // 8. Dinner
  const dinnerOpts = meal(isVeg ? "VEG_DINNER" : "NONVEG_DINNER", 0);
  const dinnerDur = ageGroup === "toddler" ? 25 : 30;
  add({ activity: "Dinner", duration: dinnerDur, category: "meal", notes: `Options: ${dinnerOpts}` }, Math.max(cursor, dinnerMins - 30));
  gap(5);

  // 9. Wind-down sequence
  for (const block of WIND_DOWN[ageGroup]) {
    add(block);
  }

  // 10. Sleep anchor
  items.push({ ...SLEEP_ANCHOR[ageGroup], time: minsToTime(sleepMins), status: "pending" });

  const title = makeTitle(ageGroup, childName, hasSchool, seed);
  const v2Items = applyRoutineV2(items, {
    hasSchool,
    schoolStartMins,
    schoolEndMins,
    ageGroup,
    fridgeItems,
  });
  return { title, items: withRewardPoints(v2Items) };
}

// ─── Rule-Based Insights Generator ───────────────────────────────────────────

type RoutineStat = {
  childName: string;
  date: string;
  completionRate: number;
  completed: number;
  skipped: number;
  delayed: number;
  pending: number;
  total: number;
  categories: string[];
};

export type Insight = { type: "positive" | "warning" | "suggestion"; message: string; icon: string };
export type InsightsResult = { insights: Insight[]; summary: string };

export function generateRuleBasedInsights(stats: RoutineStat[]): InsightsResult {
  if (stats.length === 0) {
    return {
      insights: [{ type: "suggestion", message: "Start by generating your first routine to get weekly insights!", icon: "✨" }],
      summary: "No routine data yet. Generate some routines to see insights here.",
    };
  }

  const insights: Insight[] = [];
  const avgCompletion = Math.round(stats.reduce((s, r) => s + r.completionRate, 0) / stats.length);
  const totalSkipped = stats.reduce((s, r) => s + r.skipped, 0);
  const totalDelayed = stats.reduce((s, r) => s + r.delayed, 0);
  const totalCompleted = stats.reduce((s, r) => s + r.completed, 0);
  const recentStats = stats.slice(0, 7);
  const avgRecent = recentStats.length > 0
    ? Math.round(recentStats.reduce((s, r) => s + r.completionRate, 0) / recentStats.length)
    : avgCompletion;

  // Category analysis
  const catCounts: Record<string, number> = {};
  const catSkipped: Record<string, number> = {};
  for (const r of stats) {
    for (const c of r.categories) {
      catCounts[c] = (catCounts[c] ?? 0) + 1;
    }
  }

  // Child-level analysis
  const childStats: Record<string, { total: number; completed: number; days: number }> = {};
  for (const r of stats) {
    if (!childStats[r.childName]) childStats[r.childName] = { total: 0, completed: 0, days: 0 };
    childStats[r.childName]!.total += r.total;
    childStats[r.childName]!.completed += r.completed;
    childStats[r.childName]!.days += 1;
  }

  // Overall performance
  if (avgCompletion >= 80) {
    insights.push({ type: "positive", message: `Excellent routine consistency! Average completion rate of ${avgCompletion}% — your family is building strong habits.`, icon: "🏆" });
  } else if (avgCompletion >= 60) {
    insights.push({ type: "suggestion", message: `Good progress with ${avgCompletion}% average completion. Aim for 80% — try reducing the number of tasks to make the routine more achievable.`, icon: "📈" });
  } else {
    insights.push({ type: "warning", message: `Completion rate is ${avgCompletion}% — routines may be overloaded. Try a lighter schedule with 8–10 tasks instead of more.`, icon: "⚠️" });
  }

  // Trend analysis
  if (stats.length >= 7) {
    const older = stats.slice(7);
    const avgOlder = older.length > 0 ? Math.round(older.reduce((s, r) => s + r.completionRate, 0) / older.length) : avgRecent;
    if (avgRecent > avgOlder + 10) {
      insights.push({ type: "positive", message: `Routines are improving! This week's completion (${avgRecent}%) is better than last week (${avgOlder}%). Keep it up!`, icon: "🚀" });
    } else if (avgRecent < avgOlder - 10) {
      insights.push({ type: "warning", message: `Routine completion dipped this week (${avgRecent}% vs ${avgOlder}% before). Check if schedules are too packed or if there's extra stress.`, icon: "📉" });
    }
  }

  // Skipped tasks
  if (totalSkipped > stats.length * 2) {
    insights.push({ type: "warning", message: `${totalSkipped} tasks were skipped across routines. Review which tasks are frequently skipped — they may not be realistic or needed.`, icon: "⏭️" });
  } else if (totalSkipped === 0 && stats.length >= 3) {
    insights.push({ type: "positive", message: "Zero tasks skipped — wonderful routine adherence! Every planned activity is being followed through.", icon: "✅" });
  }

  // Delayed tasks
  if (totalDelayed > stats.length * 3) {
    insights.push({ type: "suggestion", message: "Many tasks are being delayed. Try adding 5-minute buffer gaps between activities — tight schedules create a domino effect of delays.", icon: "⏱️" });
  }

  // Child-specific insights
  for (const [name, data] of Object.entries(childStats)) {
    const rate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
    if (rate >= 85) {
      insights.push({ type: "positive", message: `${name} is crushing it with ${rate}% task completion — celebrate this consistency with them!`, icon: "⭐" });
    } else if (rate < 50 && data.days >= 3) {
      insights.push({ type: "suggestion", message: `${name}'s completion rate (${rate}%) suggests the routine may be too ambitious. Try 2–3 fewer activities per day.`, icon: "💡" });
    }
  }

  // Category-specific tips
  if (catCounts["screen"] && catCounts["screen"] > stats.length) {
    insights.push({ type: "suggestion", message: "Screen time appears daily in routines — ensure it stays within age-appropriate limits and is always scheduled, not spontaneous.", icon: "📱" });
  }
  if (catCounts["bonding"] && catCounts["bonding"] >= stats.length) {
    insights.push({ type: "positive", message: "Bonding activities are part of every routine — this is one of the most important investments you make in your child.", icon: "❤️" });
  }
  if (!catCounts["play"] || catCounts["play"] < stats.length / 2) {
    insights.push({ type: "suggestion", message: "Unstructured play time appears infrequently — children need at least 30 min of free play daily for healthy development.", icon: "🎮" });
  }

  // Encouragement if few routines
  if (stats.length <= 3) {
    insights.push({ type: "suggestion", message: `You have ${stats.length} routine${stats.length > 1 ? "s" : ""} so far. Generating routines daily for a week gives you meaningful insights and builds family rhythm!`, icon: "📅" });
  }

  // Keep max 6 insights
  const final = insights.slice(0, 6);

  const summaryParts = [
    `You have ${stats.length} routine${stats.length !== 1 ? "s" : ""} logged with an average completion of ${avgCompletion}%.`,
    avgCompletion >= 75
      ? "Your family is building excellent daily habits — keep the momentum going!"
      : "Every routine completed is progress — consistency beats perfection every time!",
  ];

  return { insights: final, summary: summaryParts.join(" ") };
}

// ─── Rule-Based Partial Regeneration ─────────────────────────────────────────

type ExistingItem = { time: string; activity: string; duration: number; category: string; notes?: string; status?: string };

export function generatePartialRoutine(params: {
  childName: string;
  ageGroup: AgeGroup;
  childAge: number;
  foodType: string;
  goals: string;
  keptItems: ExistingItem[];
  startMins: number;
  sleepMins: number;
  newActivity?: { name: string; duration?: number };
  date: string;
  region?: Region;
  fridgeItems?: string;
}): ScheduleItem[] {
  const { childName, ageGroup, foodType, region, fridgeItems, keptItems, startMins, sleepMins, newActivity, date } = params;
  const seed = dateSeed(date, childName);
  const isVeg = foodType !== "non_veg" && foodType !== "nonveg";
  const fridgeList = parseFridgeItems(fridgeItems);
  const meal = (key: MealKey, off = 0): string => {
    if (fridgeList.length > 0) {
      return mealFromItems(key, fridgeList, seed + off);
    }
    const arr = mealsFor(region, key);
    return arr[Math.abs(seed + off) % arr.length]!;
  };

  // Categories already present in kept items
  const usedActivities = new Set(keptItems.map((i) => i.activity.toLowerCase()));

  let cursor = startMins;
  const items: ScheduleItem[] = [];

  const add = (block: Block) => {
    if (cursor + block.duration > sleepMins - 30) return;
    items.push({ ...block, time: minsToTime(cursor), status: "pending", notes: block.notes ?? "" });
    cursor += block.duration + 5;
  };

  // Insert new activity first if requested
  if (newActivity) {
    add({
      activity: newActivity.name,
      duration: newActivity.duration ?? 30,
      category: "play",
      notes: "Added activity — enjoy!",
    });
  }

  // Pick activities not yet done
  const pool = seededShuffle([...AFTERNOON_ACTIVITIES[ageGroup], ...getBondingActivities(ageGroup)], seed + cursor);
  let bondAdded = 0;
  for (const act of pool) {
    if (cursor + 20 >= sleepMins - 60) break;
    if (usedActivities.has(act.activity.toLowerCase())) continue;
    if (act.category === "bonding" && bondAdded >= 1) continue;
    add(act);
    usedActivities.add(act.activity.toLowerCase());
    if (act.category === "bonding") bondAdded++;
  }

  // Dinner if not already in kept items and not yet added
  const hasDinner = keptItems.some((i) => i.activity.toLowerCase().includes("dinner"));
  if (!hasDinner && cursor + 30 < sleepMins - 30) {
    const dinnerOpts = meal(isVeg ? "VEG_DINNER" : "NONVEG_DINNER", 0);
    add({ activity: "Dinner", duration: 30, category: "meal", notes: `Options: ${dinnerOpts}` });
  }

  // Wind-down
  const wdBlocks = WIND_DOWN[ageGroup];
  for (const block of wdBlocks) {
    if (cursor + block.duration < sleepMins) add(block);
  }

  // Sleep anchor
  items.push({ ...SLEEP_ANCHOR[ageGroup], time: minsToTime(sleepMins), status: "pending" });

  return withRewardPoints(items);
}
