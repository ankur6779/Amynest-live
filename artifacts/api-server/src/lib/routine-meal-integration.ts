/**
 * Unified routine + meal integration — country dishes, energy flow, meal-aware ordering.
 */
import type { LaunchCountry } from "./routine-country-profile.js";
import { getCountryRoutineProfile, normalizeCountryCode } from "./routine-country-profile.js";
import type { InterpretedBehavioralState } from "./routine-context-engine.js";
import {
  classifyStructureBlock,
  getCountryStructureOrder,
  isOutdoorBlockedByHeat,
  isPreDinnerActiveBlock,
  orderItemsByCountryStructure,
  type StructureBlockKind,
} from "./routine-country-structure.js";
import { parseFridgeItems, type Region } from "./routine-templates.js";
import {
  getAgeGroup,
  applyAgeFeedingRoutineFlow,
  enrichAgeFeedingMeals,
  resolveAgeFeedingDishes,
  validateAgeFeedingIntegration,
  type AgeFeedingMeta,
  type FeedingAgeGroup,
  type InfantFeedingMeta,
} from "./routine-age-feeding.js";
import {
  mealSlotsByPriority,
  prefersFridgeAccent,
  type MealPrioritySlot,
} from "./routine-priority-engine.js";
import {
  clampDurationForCategory,
  parseTimeToMins,
  minsToTime24,
  type RoutineScheduleItem,
} from "./routine-scheduler.js";

export type MealSlot =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "tiffin"
  | "drunch";

export type MealEnergyImpact =
  | "post-meal wind-down"
  | "post-meal light activity"
  | "post-meal rest"
  | "post-snack active play"
  | "pre-dinner active"
  | "midday recharge";

export type IntegratedMealMeta = {
  meal: string;
  dishes: string[];
  culturalReason: string;
  energyImpact: MealEnergyImpact;
};

export type IntegratedRoutineOpts = {
  hasSchool?: boolean;
  schoolEndMins?: number;
  schoolStartMins?: number;
  sleepMins?: number;
  wakeMins?: number;
  /** Child age in months — drives infant/toddler feeding before country meals. */
  ageInMonths?: number;
  feedingType?: "breastfeeding" | "formula" | "mixed";
  /** Pre-resolved feeding group (from getAgeGroup). */
  feedingAgeGroup?: FeedingAgeGroup;
};

type MealBank = Partial<Record<MealSlot, readonly string[]>>;

const GAP_MINS = 10;
const MAX_FRIDGE_DISH_SHARE = 0.4;

/** Post-school meal block — main lunch is assumed at school. */
export const AFTER_SCHOOL_REFUEL_LABEL = "After-school refuel";
const SCHOOL_LUNCH_IMPLICIT_NOTE =
  "School lunch eaten at school (implicit).";

/** Round clock minutes to nearest step (default 5). */
export function roundRoutineClockMins(mins: number, step = 5): number {
  return Math.round(mins / step) * step;
}

function humanJitterMins(mins: number, seed: number): number {
  const jitter = (Math.abs(seed * 17 + mins) % 9) - 4;
  return mins + jitter;
}

/** Dishes that must not appear for a given country (fridge template leakage). */
const FORBIDDEN_DISH_PATTERNS: Record<LaunchCountry, RegExp[]> = {
  US: [/paratha|khichdi|idli|dosa|sambar|rajma|chole|roti with dal/i],
  UK: [/paratha|khichdi|idli|dosa|mac & cheese/i],
  AU: [/paratha|khichdi|idli|dosa|beans on toast/i],
  NZ: [/paratha|khichdi|idli|dosa/i],
  AT: [/paratha|khichdi|idli|dosa|mac & cheese|tacos|nuggets/i],
  AE: [/mac & cheese|beans on toast|paratha|porridge with/i],
  IN: [/mac & cheese|beans on toast|vegemite|nuggets/i],
};

const COUNTRY_MEAL_BANKS: Record<LaunchCountry, MealBank> = {
  US: {
    breakfast: [
      "Scrambled eggs & toast | Oatmeal with banana | Cereal with milk",
      "Pancakes with berries | Yogurt parfait | Bagel with cream cheese",
    ],
    lunch: [
      "Turkey & cheese sandwich | Pasta salad | Chicken wrap with veggies",
      "PB&J with apple slices | Mac & cheese cup | Veggie quesadilla",
    ],
    dinner: [
      "Mac & cheese | Grilled cheese with tomato soup | Chicken nuggets & veggies",
      "Beef or bean tacos | Spaghetti with marinara | Baked potato with toppings",
    ],
    snack: ["Apple slices & peanut butter | Cheese sticks & crackers | Yogurt & granola"],
    tiffin: ["PB&J sandwich & fruit | Turkey wrap & carrots | Cheese quesadilla & grapes"],
  },
  UK: {
    breakfast: [
      "Beans on toast | Porridge with honey | Egg on toast",
      "Weetabix with milk | Scrambled eggs & soldiers | Fruit & yogurt",
    ],
    lunch: [
      "Cheese & ham sandwich | Jacket potato with beans | Pasta pot",
      "Chicken wrap | Egg mayo sandwich | Soup with bread roll",
    ],
    dinner: [
      "Beans on toast supper | Fish fingers & peas | Jacket potato with cheese",
      "Sausage & mash | Pasta bake | Chicken pie with veg",
    ],
    snack: ["Digestive biscuits & milk | Fruit pot | Cheese cubes & grapes"],
    tiffin: ["Cheese sandwich & apple | Wrap with hummus | Mini sausage roll & fruit"],
  },
  AU: {
    breakfast: [
      "Vegemite toast | Weet-Bix with milk | Eggs on toast",
      "Pancakes | Fruit & yogurt | Avocado toast",
    ],
    lunch: [
      "BBQ chicken wrap | Salad wrap | Ham & cheese roll",
      "Veggie burger wrap | Tuna wrap | Pasta salad",
    ],
    dinner: [
      "Sausages & salad (BBQ style) | Grilled chicken & corn | Fish & chips (light)",
      "Beef burgers with salad | Lamb chops & veg | Veggie skewers & rice",
    ],
    snack: ["Fruit & yogurt | Cheese & crackers | Smoothie"],
    tiffin: ["Ham wrap & fruit | Cheese sandwich & carrot sticks | Chicken wrap"],
  },
  NZ: {
    breakfast: [
      "Weet-Bix & milk | Toast with honey | Scrambled eggs",
      "Porridge with fruit | Yogurt & muesli | French toast",
    ],
    lunch: [
      "Chicken wrap | Salad roll | Tuna sandwich",
      "Cheese & vegemite scroll | Pasta salad | Mini pies (occasional)",
    ],
    dinner: [
      "Lamb & veg roast (light) | Fish with salad | BBQ sausages & salad",
      "Chicken kebabs & rice | Veggie frittata | Beef stir-fry with rice",
    ],
    snack: ["Fruit & cheese | Yogurt | Muesli bar & milk"],
    tiffin: ["Cheese roll & apple | Chicken wrap | Egg sandwich"],
  },
  AT: {
    breakfast: [
      "Semmel with butter & jam | Müsli with yogurt | Soft-boiled egg & bread",
      "Farmer's bread with honey | Yogurt with berries | Buttered roll with cheese",
    ],
    lunch: [
      "Bread with cheese & ham | Clear soup with bread | Schnitzel with salad (light)",
      "Noodle soup | Open sandwich platter | Käsespätzle (small portion)",
    ],
    dinner: [
      "Vegetable soup & bread | Light käsespätzle | Bread with cheese & pickles",
      "Clear broth with noodles | Salad with boiled egg | Potato salad (light)",
    ],
    snack: ["Apple slices | Yogurt | Bread with butter"],
    tiffin: ["Bread roll with cheese | Sandwich with cucumber | Fruit & nuts"],
  },
  AE: {
    breakfast: [
      "Labneh with flatbread | Cheese & olives plate | Shakshuka with bread",
      "Dates & milk | Manakish (cheese) | Eggs with Arabic bread",
    ],
    lunch: [
      "Chicken shawarma wrap | Rice with grilled chicken | Falafel wrap",
      "Grilled fish with rice | Lentil soup with bread | Mixed mezze plate",
    ],
    dinner: [
      "Flatbread with hummus & falafel | Grilled kebabs & salad | Lamb kofta with yogurt",
      "Grilled kebabs & salad | Vegetable stew with bread | Chicken shawarma plate",
    ],
    snack: [
      "Watermelon & cucumber sticks | Orange segments & dates | Labneh with cucumber",
      "Fruit cup with mint water | Banana & dates | Hydration smoothie (light)",
    ],
    tiffin: ["Cheese fatayer | Chicken wrap | Hummus & pita box"],
  },
  IN: {
    breakfast: [
      "Poha with peanuts | Idli with sambar | Paratha with curd",
      "Dosa with chutney | Upma | Besan chilla",
    ],
    lunch: [
      "Dal, roti & sabzi | Rajma chawal | Chole rice",
      "Sambar rice with papad | Veg pulao with raita | Paneer sabzi with roti",
    ],
    dinner: [
      "Khichdi with ghee | Roti with dal & sabzi | Curd rice with pickle",
      "Light paratha with curd | Moong dal khichdi | Vegetable soup with bread",
    ],
    snack: ["Fruit bowl & milk | Sprouts chaat | Banana shake"],
    tiffin: ["Paratha roll | Idli box with chutney | Veg sandwich & fruit"],
  },
};

const HIGH_ENERGY_CATS = new Set(["play", "outdoor", "exercise", "activity"]);

function mealSlotFromActivity(activity: string, category: string): MealSlot | null {
  const a = activity.toLowerCase();
  const cat = category.toLowerCase();
  if (/\bbreakfast\b/i.test(a) || /\bquick meal before school\b/i.test(a)) return "breakfast";
  if (
    (/\blunch\b/i.test(a) ||
      /\b(after-school refuel|refuel)\b/i.test(a)) &&
    cat === "meal"
  ) {
    return "lunch";
  }
  if (/\bdinner\b/i.test(a)) return "dinner";
  if (/\btiffin\b/i.test(a) || cat === "tiffin") return "tiffin";
  if (/\bdrunch\b/i.test(a)) return "drunch";
  if (/\bsnack\b/i.test(a) && cat === "meal") return "snack";
  return null;
}

function dishBase(dish: string): string {
  const d = dish.toLowerCase();
  if (/\brice\b|chawal|biryani|pulao/i.test(d)) return "rice";
  if (/\bkhichdi\b/i.test(d)) return "khichdi";
  if (/\broti\b|bread|toast|paratha|wrap|sandwich|pasta|noodle|mac\b/i.test(d)) {
    return "grain";
  }
  if (/\bdal\b|lentil|beans\b|rajma|chole/i.test(d)) return "legume";
  if (/\bchicken|meat|fish|egg|nugget|sausage|lamb|beef/i.test(d)) return "protein";
  if (/\bsoup\b/i.test(d)) return "soup";
  if (/\bcheese|dairy|milk|yogurt|curd/i.test(d)) return "dairy";
  return d.split(/\s+/).slice(0, 2).join("_");
}

type DishVarietyProfile = {
  grain: string;
  protein: string;
  prep: string;
};

function dishVarietyProfile(dish: string): DishVarietyProfile {
  const d = dish.toLowerCase();
  let grain = "other";
  if (/\brice|chawal|pulao|biryani/i.test(d)) grain = "rice";
  else if (/\broti|bread|toast|paratha|wrap|sandwich|pasta|noodle|mac|potato|idli|dosa/i.test(d)) {
    grain = "grain";
  }

  let protein = "veg";
  if (/\bchicken|turkey|nugget/i.test(d)) protein = "poultry";
  else if (/\bfish|tuna|salmon/i.test(d)) protein = "fish";
  else if (/\begg/i.test(d)) protein = "egg";
  else if (/\blamb|beef|kebab|kofta|sausage/i.test(d)) protein = "meat";
  else if (/\bdal|rajma|chole|lentil|paneer|cheese|hummus|falafel/i.test(d)) {
    protein = "plant_protein";
  }

  let prep = "plated";
  if (/\bgrilled|bbq|kebab/i.test(d)) prep = "grilled";
  else if (/\bbaked|roast|jacket/i.test(d)) prep = "baked";
  else if (/\bsoup|broth|stew|curry|dal\b/i.test(d)) prep = "wet";
  else if (/\bwrap|sandwich|roll|toast/i.test(d)) prep = "handheld";
  else if (/\bsalad|raw|fruit/i.test(d)) prep = "fresh";

  return { grain, protein, prep };
}

function varietyKey(profile: DishVarietyProfile): string {
  return `${profile.grain}|${profile.protein}|${profile.prep}`;
}

export function normalizeDishName(dish: string): string {
  return dish
    .toLowerCase()
    .replace(/[^\w\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Same dish must not repeat across refuel and dinner. */
export function dishDuplicatesAcrossMeals(a: string, b: string): boolean {
  const na = normalizeDishName(a);
  const nb = normalizeDishName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) {
    const ratio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
    return ratio >= 0.85;
  }
  return false;
}

function dishConflictsWithUsed(
  dish: string,
  usedNames: Set<string>,
  opts?: { refuelDishes?: string[]; slot?: MealSlot },
): boolean {
  const d = dish.toLowerCase();
  if (opts?.slot === "dinner" && opts.refuelDishes?.length) {
    for (const refuel of opts.refuelDishes) {
      if (dishDuplicatesAcrossMeals(dish, refuel)) return true;
    }
  }
  for (const used of usedNames) {
    if (d === used) return true;
    if (opts?.slot === "dinner" && dishDuplicatesAcrossMeals(dish, used)) {
      return true;
    }
    const tokens = ["mac", "rice", "bread", "egg", "pasta", "wrap", "sandwich", "soup"];
    for (const t of tokens) {
      if (d.includes(t) && used.includes(t)) return true;
    }
  }
  return false;
}

function mealPatternFromDishes(dishes: string[]): string {
  const profiles = dishes.map(dishVarietyProfile);
  const grain = profiles.map((p) => p.grain).sort().join("+");
  const protein = profiles.map((p) => p.protein).sort().join("+");
  const prep = profiles[0]?.prep ?? "plated";
  return `${grain}::${protein}::${prep}`;
}

function parseDishRow(row: string): string[] {
  return row.split("|").map((s) => s.trim()).filter(Boolean);
}

function isDishAllowedForCountry(country: LaunchCountry, dish: string): boolean {
  const patterns = FORBIDDEN_DISH_PATTERNS[country] ?? [];
  return !patterns.some((re) => re.test(dish));
}

function culturalReasonFor(country: LaunchCountry, slot: MealSlot): string {
  const reasons: Record<LaunchCountry, Partial<Record<MealSlot, string>>> = {
    US: {
      dinner: "US early dinner — sports and outdoor play finish before this meal",
      snack: "After-school snack before sports or clubs",
      lunch: "After-school refuel — school lunch was at school",
    },
    UK: {
      dinner: "UK teatime — calm family evening after dinner",
      snack: "Light snack before homework",
      lunch: "After-school refuel — school lunch was at school",
    },
    AU: {
      dinner: "AU dinner after outdoor play and sport",
      snack: "Refuel between outdoor play and practice",
      lunch: "Solid lunch after school",
    },
    NZ: {
      dinner: "NZ family dinner after sport",
      snack: "Afternoon snack between play blocks",
      lunch: "Lunch after school before activities",
    },
    AT: {
      breakfast: "Austrian dairy-forward breakfast",
      dinner: "Light Austrian supper",
      lunch: "Structured lunch before homework",
    },
    AE: {
      dinner: "UAE late shared dinner after evening outdoor time",
      lunch: "After-school refuel — indoor rest follows in hot hours",
      snack: "Light hydration snack during hot afternoon",
    },
    IN: {
      lunch: "After-school refuel — school lunch was at school",
      dinner: "Moderate dinner — optional light revision may follow",
    },
  };
  return reasons[country]?.[slot] ?? `${country} meal norms`;
}

function energyImpactFor(slot: MealSlot, country: LaunchCountry): MealEnergyImpact {
  if (slot === "dinner") return "post-meal wind-down";
  if (slot === "snack" || slot === "drunch") return "post-snack active play";
  if (slot === "lunch") return country === "IN" ? "midday recharge" : "post-meal light activity";
  if (slot === "breakfast") return "pre-dinner active";
  return "post-meal light activity";
}

function isSchoolItem(item: RoutineScheduleItem): boolean {
  return (item.category ?? "").toLowerCase() === "school";
}

function isSleepItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  return cat === "sleep" || /lights out|bedtime|sleep/i.test(item.activity);
}

function isDinnerItem(item: RoutineScheduleItem): boolean {
  return /\bdinner\b/i.test(item.activity) && (item.category ?? "").toLowerCase() === "meal";
}

function isLunchItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (cat !== "meal") return false;
  return (
    /\blunch\b/i.test(item.activity) ||
    /\b(after-school refuel|refuel)\b/i.test(item.activity)
  );
}

function isSnackItem(item: RoutineScheduleItem): boolean {
  return (
    (/\b(snack|hydration|refuel)\b/i.test(item.activity) ||
      /\bdrunch\b/i.test(item.activity)) &&
    (item.category ?? "").toLowerCase() === "meal" &&
    !isLunchItem(item)
  );
}

function isWindDownItem(item: RoutineScheduleItem): boolean {
  const kind = effectiveKind(item);
  return (
    kind === "wind_down" ||
    /\b(wind.?down|story time|bedtime story|lights out prep)\b/i.test(item.activity)
  );
}

function isPostDinnerStudy(item: RoutineScheduleItem): boolean {
  return (
    (item as { structureKind?: string }).structureKind === "post_dinner_study" ||
    (/\b(optional revision|light revision|post-dinner study)\b/i.test(item.activity) &&
      classifyStructureBlock(item) === "study_optional")
  );
}

function effectiveKind(item: RoutineScheduleItem): StructureBlockKind {
  if ((item as { structureKind?: string }).structureKind === "post_dinner_study") {
    return "post_dinner_study";
  }
  return classifyStructureBlock(item);
}

function isHighEnergyItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (HIGH_ENERGY_CATS.has(cat)) return true;
  if (isPreDinnerActiveBlock(item) && !isPostDinnerStudy(item)) return true;
  return /\b(soccer|sports practice|football club)\b/i.test(item.activity);
}

const MAX_FRIDGE_ACCENTS_PER_DAY = 1;

function fridgeAccentDish(
  fridgeItems: string | undefined,
  seed: number,
  usedFridgeCombos: Set<string>,
  country: LaunchCountry,
): string | null {
  const list = parseFridgeItems(fridgeItems);
  if (list.length === 0) return null;
  const countryOff = country.charCodeAt(0) % 3;
  for (let attempt = 0; attempt < list.length * 2; attempt++) {
    const s = seed + attempt + countryOff * 11;
    const a = list[Math.abs(s) % list.length]!;
    const b = list[Math.abs(s + 2) % list.length] ?? a;
    const templates = [
      `${a} & ${b} wrap`,
      `${b} with ${a} (quick plate)`,
      `Warm ${a} & ${b} bowl`,
      `${a} snack plate with ${b}`,
    ];
    const candidate = templates[(Math.abs(s) + countryOff) % templates.length]!;
    const comboKey = `${country}:${candidate.toLowerCase()}`;
    if (!usedFridgeCombos.has(comboKey)) {
      usedFridgeCombos.add(comboKey);
      return candidate;
    }
  }
  return null;
}

/** Country-native dishes only; fridge adds at most one validated accent (≤40%). */
export function resolveCountryMealDishes(
  country: string | LaunchCountry,
  slot: MealSlot,
  opts: {
    isVeg?: boolean;
    fridgeItems?: string;
    seed?: number;
    usedBases?: Set<string>;
    usedNames?: Set<string>;
    usedVarietyKeys?: Set<string>;
    usedMealPatterns?: Set<string>;
    usedFridgeCombos?: Set<string>;
    /** Fridge-accent dishes favored for snack/refuel (not dinner). */
    preferFridgeAccent?: boolean;
    /** Dishes already chosen for after-school refuel — dinner must not repeat. */
    usedRefuelDishes?: string[];
    /** When true, skip fridge-accent (max once per day). */
    skipFridgeAccent?: boolean;
  } = {},
): IntegratedMealMeta {
  const c = normalizeCountryCode(country);
  const bank = COUNTRY_MEAL_BANKS[c];
  const rows = bank[slot] ?? COUNTRY_MEAL_BANKS.IN[slot] ?? ["Healthy balanced meal"];
  const seed = opts.seed ?? 0;

  const usedBases = opts.usedBases ?? new Set<string>();
  const usedNames = opts.usedNames ?? new Set<string>();
  const usedVarietyKeys = opts.usedVarietyKeys ?? new Set<string>();
  const usedMealPatterns = opts.usedMealPatterns ?? new Set<string>();
  const usedFridgeCombos = opts.usedFridgeCombos ?? new Set<string>();

  let cultural: string[] = [];
  for (let rowIdx = 0; rowIdx < rows.length && cultural.length < 2; rowIdx++) {
    const row = rows[(Math.abs(seed) + rowIdx) % rows.length]!;
    let candidates = parseDishRow(row).filter((d) => {
      if (!isDishAllowedForCountry(c, d)) return false;
      if (usedNames.has(d.toLowerCase())) return false;
      if (
        dishConflictsWithUsed(d, usedNames, {
          slot,
          refuelDishes: opts.usedRefuelDishes,
        })
      ) {
        return false;
      }
      const base = dishBase(d);
      if (usedBases.has(base)) return false;
      if (slot === "dinner" && usedBases.has("rice") && base === "rice") return false;
      if (slot === "dinner" && usedBases.has("grain") && base === "grain") return false;
      const vk = varietyKey(dishVarietyProfile(d));
      if (usedVarietyKeys.has(vk)) return false;
      return true;
    });
    if (candidates.length < 2) {
      candidates = parseDishRow(row).filter((d) => isDishAllowedForCountry(c, d));
    }
    for (const d of candidates) {
      if (cultural.length >= 3) break;
      if (!cultural.includes(d)) cultural.push(d);
    }
  }

  const dishes: string[] = [];
  for (const d of cultural) {
    if (dishes.length >= 3) break;
    dishes.push(d);
    usedBases.add(dishBase(d));
    usedNames.add(d.toLowerCase());
    usedVarietyKeys.add(varietyKey(dishVarietyProfile(d)));
  }

  const maxFridgeSlots = Math.floor(3 * MAX_FRIDGE_DISH_SHARE);
  const allowFridge =
    !opts.skipFridgeAccent &&
    (opts.preferFridgeAccent ?? prefersFridgeAccent(slot as MealPrioritySlot));
  if (maxFridgeSlots > 0 && dishes.length >= 2 && allowFridge) {
    const accent = fridgeAccentDish(opts.fridgeItems, seed, usedFridgeCombos, c);
    if (
      accent &&
      isDishAllowedForCountry(c, accent) &&
      !usedNames.has(accent.toLowerCase()) &&
      (allowFridge || Math.abs(seed) % 5 < 2)
    ) {
      dishes.push(accent);
      usedNames.add(accent.toLowerCase());
    }
  }

  while (dishes.length < 2) {
    const fallback = parseDishRow(rows[0] ?? "Healthy balanced meal").find(
      (d) => isDishAllowedForCountry(c, d) && !dishes.includes(d),
    );
    if (!fallback) break;
    dishes.push(fallback);
    usedBases.add(dishBase(fallback));
  }

  const pattern = mealPatternFromDishes(dishes);
  usedMealPatterns.add(pattern);

  const mealLabel =
    slot === "breakfast"
      ? "Breakfast"
      : slot === "lunch"
        ? AFTER_SCHOOL_REFUEL_LABEL
        : slot === "dinner"
          ? "Dinner"
          : slot === "tiffin"
            ? "Tiffin"
            : slot === "drunch"
              ? "Drunch"
              : "Snack";

  return {
    meal: mealLabel,
    dishes,
    culturalReason: culturalReasonFor(c, slot),
    energyImpact: energyImpactFor(slot, c),
  };
}

function defaultDinnerStart(country: LaunchCountry, sleepMins: number): number {
  const profile = getCountryRoutineProfile(country);
  const mid = Math.round((profile.dinnerWindow[0] + profile.dinnerWindow[1]) / 2);
  return Math.min(mid, sleepMins - 120);
}

function ensureAfterSchoolRefuel(
  items: RoutineScheduleItem[],
  schoolEndMins: number,
): RoutineScheduleItem[] {
  if (items.some(isLunchItem)) return items;
  return [
    ...items,
    {
      time: minsToTime24(schoolEndMins + 15),
      activity: AFTER_SCHOOL_REFUEL_LABEL,
      duration: 35,
      category: "meal",
      status: "pending",
      notes: SCHOOL_LUNCH_IMPLICIT_NOTE,
      energyImpact: "post-meal light activity",
    },
  ];
}

function tagImplicitSchoolLunch(school: RoutineScheduleItem | undefined): void {
  if (!school) return;
  if (school.notes?.includes("implicit")) return;
  school.notes = [school.notes, SCHOOL_LUNCH_IMPLICIT_NOTE].filter(Boolean).join(" ");
}

function removeMorningSnacks(
  items: RoutineScheduleItem[],
  schoolEndMins: number,
): RoutineScheduleItem[] {
  return items.filter((it) => {
    if (!isSnackItem(it)) return true;
    const start = parseTimeToMins(it.time);
    return start >= schoolEndMins;
  });
}

function stripPreDinnerWindDown(items: RoutineScheduleItem[], dinnerStart: number): void {
  for (const it of items) {
    if (!isWindDownItem(it) || isSleepItem(it) || isDinnerItem(it)) continue;
    if (parseTimeToMins(it.time) < dinnerStart) {
      it.category = "rest";
      it.activity = it.activity.replace(/wind.?down/i, "Quiet rest");
      (it as { structureKind?: string }).structureKind = "indoor_rest";
    }
  }
}

/**
 * Final timeline: lunch anchor, pre-dinner country order, dinner → wind-down → optional study → sleep.
 */
export function enforceIntegratedRoutineFlow(
  items: RoutineScheduleItem[],
  state: Pick<InterpretedBehavioralState, "country" | "countryProfile">,
  opts: IntegratedRoutineOpts = {},
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  const feedingGroup =
    opts.feedingAgeGroup ??
    (opts.ageInMonths != null ? getAgeGroup(opts.ageInMonths) : "child");

  if (feedingGroup !== "child") {
    return applyAgeFeedingRoutineFlow(items, feedingGroup, {
      wakeMins: opts.wakeMins,
      sleepMins: opts.sleepMins,
      ageInMonths: opts.ageInMonths,
      feedingType: opts.feedingType,
    });
  }

  const adjustments: string[] = [];
  const country = state.country;
  const schoolEnd = opts.schoolEndMins ?? 15 * 60;
  const sleepMins = opts.sleepMins ?? 21 * 60;
  const wakeMins = opts.wakeMins ?? 7 * 60;
  const hasSchool = opts.hasSchool !== false;

  let working = [...items].filter((it) => {
    if (!/\bdrunch\b/i.test(it.activity)) return true;
    return country === "IN";
  });
  working = working.filter((it) => !/\bfree time\b/i.test(it.activity));

  if (hasSchool) {
    working = removeMorningSnacks(working, schoolEnd);
    adjustments.push("removed pre-school snacks");
    working = ensureAfterSchoolRefuel(working, schoolEnd);
    adjustments.push("ensured after-school refuel (school lunch implicit)");
  }

  let dinner =
    working.find(isDinnerItem) ??
    ({
      time: minsToTime24(defaultDinnerStart(country, sleepMins)),
      activity: "Dinner",
      duration: 35,
      category: "meal",
      status: "pending",
    } as RoutineScheduleItem);
  if (!working.some(isDinnerItem)) {
    working.push(dinner);
    adjustments.push("inserted dinner anchor");
  }

  const dinnerStart = defaultDinnerStart(country, sleepMins);
  dinner.time = minsToTime24(
    Math.max(dinnerStart, parseTimeToMins(dinner.time) || dinnerStart),
  );
  dinner.duration = clampDurationForCategory("meal", dinner.duration ?? 35);

  stripPreDinnerWindDown(working, parseTimeToMins(dinner.time));

  const splitDinnerStart = defaultDinnerStart(country, sleepMins);
  const dinnerEnd = splitDinnerStart + dinner.duration;

  const pinned = new Set<RoutineScheduleItem>();
  const school = working.find(isSchoolItem);
  if (hasSchool) tagImplicitSchoolLunch(school);
  const sleep = working.find(isSleepItem);
  const breakfast = working.find((i) => mealSlotFromActivity(i.activity, i.category ?? "") === "breakfast");
  const lunch = working.find(isLunchItem);
  if (school) pinned.add(school);
  if (sleep) pinned.add(sleep);
  if (breakfast) pinned.add(breakfast);
  if (lunch) pinned.add(lunch);
  pinned.add(dinner);

  const preDinner: RoutineScheduleItem[] = [];
  const postDinner: RoutineScheduleItem[] = [];

  for (const it of working) {
    if (pinned.has(it) || isSleepItem(it) || isDinnerItem(it)) continue;
    if (
      isPostDinnerStudy(it) ||
      (country === "IN" && /\brevision\b/i.test(it.activity)) ||
      isWindDownItem(it)
    ) {
      postDinner.push(it);
    } else if (parseTimeToMins(it.time) >= dinnerEnd) {
      if (isHighEnergyItem(it)) {
        preDinner.push(it);
        adjustments.push(`moved "${it.activity}" from post-dinner to pre-dinner`);
      } else if (country === "AE" && /\bfamily\b/i.test(it.activity)) {
        postDinner.push(it);
      } else if (/\brelax\b/i.test(it.activity) && ["AU", "NZ"].includes(country)) {
        postDinner.push(it);
      } else {
        postDinner.push({
          ...it,
          activity: "Wind-down & story",
          category: "rest",
          structureKind: "wind_down",
        });
        adjustments.push(`converted post-dinner "${it.activity}" to wind-down`);
      }
    } else {
      preDinner.push(it);
    }
  }

  const order = getCountryStructureOrder(country);
  const preOrdered = orderItemsByCountryStructure(preDinner, country).filter((it) => {
    const k = effectiveKind(it);
    if (
      k === "wind_down" ||
      k === "study_optional" ||
      k === "post_dinner_study" ||
      isPostDinnerStudy(it)
    ) {
      return false;
    }
    if (country === "AT" && (k === "indoor_creative" || k === "play")) {
      return false;
    }
    return true;
  });

  if (country === "UK" && hasSchool && !preOrdered.some((i) => effectiveKind(i) === "study")) {
    preOrdered.unshift({
      time: minsToTime24(schoolEnd + 25),
      activity: "Homework & reading",
      duration: 40,
      category: "study",
      status: "pending",
      structureKind: "study",
    });
    adjustments.push("inserted UK homework before clubs");
  }

  if (
    country === "IN" &&
    hasSchool &&
    !preOrdered.some((i) => isSnackItem(i))
  ) {
    preOrdered.push({
      time: minsToTime24(17 * 60 + 15),
      activity: "Afternoon snack",
      duration: 20,
      category: "meal",
      status: "pending",
      structureKind: "snack",
      notes: "Light snack before evening play — school refuel was earlier.",
    });
    adjustments.push("inserted India afternoon snack");
  }

  if (country === "AE") {
    if (
      hasSchool &&
      !preOrdered.some(
        (i) => isSnackItem(i) || parseTimeToMins(i.time) >= 17 * 60 - 5,
      )
    ) {
      preOrdered.push({
        time: minsToTime24(17 * 60),
        activity: "Afternoon snack (hydration)",
        duration: 15,
        category: "meal",
        status: "pending",
        structureKind: "snack",
        notes: "Hydration and fruit during hot afternoon.",
      });
      adjustments.push("inserted UAE 17:00 hydration snack");
    }
    if (!preOrdered.some((i) => effectiveKind(i) === "indoor_rest")) {
      preOrdered.unshift({
        time: minsToTime24(schoolEnd + 20),
        activity: "Indoor rest & quiet time",
        duration: 35,
        category: "rest",
        status: "pending",
        structureKind: "indoor_rest",
      });
      adjustments.push("inserted UAE afternoon indoor rest");
    }
    if (!preOrdered.some((i) => effectiveKind(i) === "indoor_creative")) {
      const restIdx = preOrdered.findIndex((i) => effectiveKind(i) === "indoor_rest");
      preOrdered.splice(restIdx + 1, 0, {
        time: minsToTime24(schoolEnd + 60),
        activity: "Indoor creative time",
        duration: 40,
        category: "creative",
        status: "pending",
        structureKind: "indoor_creative",
      });
      adjustments.push("inserted UAE indoor creative block");
    }
  }

  if (
    country === "UK" &&
    hasSchool &&
    !preOrdered.some((i) => /\bfootball club\b/i.test(i.activity))
  ) {
    const club = {
      time: minsToTime24(schoolEnd + 90),
      activity: "Football club",
      duration: 45,
      category: "exercise",
      status: "pending" as const,
      structureKind: "extracurricular" as const,
    };
    const snackIdx = preOrdered.findIndex(isSnackItem);
    if (snackIdx >= 0) {
      preOrdered.splice(snackIdx + 1, 0, club);
    } else {
      preOrdered.push(club);
    }
    adjustments.push("inserted UK football club (activity-first clubs after snack)");
  }

  if (
    country === "US" &&
    hasSchool &&
    !preOrdered.some((i) => /\bsoccer\b/i.test(i.activity))
  ) {
    preOrdered.push({
      time: minsToTime24(schoolEnd + 60),
      activity: "Soccer practice",
      duration: 45,
      category: "exercise",
      status: "pending",
      structureKind: "extracurricular",
    });
    adjustments.push("inserted US soccer practice before dinner");
  }

  if (
    (country === "US" || country === "UK") &&
    !preOrdered.some(isSnackItem) &&
    hasSchool
  ) {
    preOrdered.unshift({
      time: minsToTime24(schoolEnd + 15),
      activity: "After-school snack",
      duration: 20,
      category: "meal",
      status: "pending",
    });
    adjustments.push("inserted after-school snack before sports");
  }

  if (
    country === "AU" &&
    !preOrdered.some((i) => effectiveKind(i) === "extracurricular") &&
    hasSchool
  ) {
    preOrdered.push({
      time: minsToTime24(schoolEnd + 120),
      activity: "Sports practice",
      duration: 45,
      category: "exercise",
      status: "pending",
      structureKind: "extracurricular",
    });
    adjustments.push("inserted AU structured sports before dinner");
  }

  if (
    (country === "AU" || country === "NZ") &&
    !preOrdered.some(isSnackItem) &&
    hasSchool
  ) {
    const outdoorIdx = preOrdered.findIndex(
      (i) => effectiveKind(i) === "outdoor" || (i.category ?? "").toLowerCase() === "outdoor",
    );
    const snackBlock = {
      time: minsToTime24(schoolEnd + 90),
      activity: "After-school snack",
      duration: 20,
      category: "meal",
      status: "pending" as const,
    };
    if (outdoorIdx >= 0) {
      preOrdered.splice(outdoorIdx + 1, 0, snackBlock);
    } else {
      preOrdered.unshift(snackBlock);
    }
    adjustments.push("inserted AU/NZ snack between outdoor and sports");
  }

  if (country === "AT" && hasSchool) {
    if (!preOrdered.some((i) => effectiveKind(i) === "study")) {
      preOrdered.unshift({
        time: minsToTime24(schoolEnd + 25),
        activity: "Hausaufgaben (homework)",
        duration: 40,
        category: "study",
        status: "pending",
        structureKind: "study",
      });
      adjustments.push("inserted Austria homework block");
    }
    const hwIdx = preOrdered.findIndex((i) => effectiveKind(i) === "study");
    if (hwIdx >= 0 && !preOrdered.some((i) => /transition|wash up/i.test(i.activity))) {
      preOrdered.splice(hwIdx + 1, 0, {
        time: minsToTime24(schoolEnd + 70),
        activity: "Transition — wash up & pack bag",
        duration: 10,
        category: "self_care",
        status: "pending",
        structureKind: "independence",
      });
      adjustments.push("inserted Austria transition block");
    }
    if (!preOrdered.some((i) => effectiveKind(i) === "outdoor_structured")) {
      preOrdered.push({
        time: minsToTime24(schoolEnd + 85),
        activity: "Structured outdoor time",
        duration: 40,
        category: "outdoor",
        status: "pending",
        structureKind: "outdoor_structured",
      });
      adjustments.push("inserted Austria structured outdoor block");
    }
  }

  const preOrderedFinal = orderItemsByCountryStructure(preOrdered, country);

  let cursor = schoolEnd + (lunch ? (lunch.duration ?? 35) + GAP_MINS : GAP_MINS);
  if (lunch) {
    lunch.time = minsToTime24(Math.max(schoolEnd + 15, Math.min(schoolEnd + 60, parseTimeToMins(lunch.time) || schoolEnd + 15)));
    cursor = parseTimeToMins(lunch.time) + (lunch.duration ?? 35) + GAP_MINS;
  }

  const placedPre: RoutineScheduleItem[] = [];
  const profile = getCountryRoutineProfile(country);
  const preLimit =
    country === "US" ||
    country === "UK" ||
    country === "AU" ||
    country === "NZ" ||
    country === "AT"
      ? profile.dinnerWindow[1] - GAP_MINS
      : defaultDinnerStart(country, sleepMins) - GAP_MINS;
  for (const it of preOrderedFinal) {
    if (isSnackItem(it) && parseTimeToMins(it.time) < schoolEnd) continue;
    let dur = clampDurationForCategory(it.category ?? "play", it.duration ?? 30);
    if (country === "IN" && effectiveKind(it) === "study" && !isPostDinnerStudy(it)) {
      dur = Math.min(dur, 50);
    }
    const dinnerLimit = preLimit - dur;
    const kind = effectiveKind(it);
    if (cursor > dinnerLimit) {
      if (country === "UK" && kind === "extracurricular") {
        it.duration = Math.max(25, Math.min(dur, Math.floor((preLimit - cursor) / 5) * 5));
        if (it.duration < 25) continue;
      } else if (kind === "outdoor_evening" || (kind === "outdoor" && country === "IN")) {
        dur = Math.min(dur, 20);
        const eveningStart = Math.min(
          preLimit - dur,
          Math.max(18 * 60 + 30, cursor, schoolEnd + 90),
        );
        it.time = minsToTime24(eveningStart);
        it.duration = dur;
        placedPre.push(it);
        cursor = eveningStart + dur + GAP_MINS;
        continue;
      } else {
        break;
      }
    }
    it.time = minsToTime24(cursor);
    it.duration = dur;
    placedPre.push(it);
    cursor += dur + GAP_MINS;
  }

  const profileDinner = defaultDinnerStart(country, sleepMins);
  if (parseTimeToMins(dinner.time) < cursor + 20) {
    dinner.time = minsToTime24(Math.max(cursor + 15, profileDinner));
  }
  if (country === "AE") {
    dinner.time = minsToTime24(
      Math.max(profileDinner, parseTimeToMins(dinner.time)),
    );
  }
  if (country === "UK") {
    dinner.time = minsToTime24(
      Math.max(parseTimeToMins(dinner.time), cursor + 15, 19 * 60),
    );
  }
  if (country === "AU" || country === "NZ" || country === "AT") {
    dinner.time = minsToTime24(
      Math.max(cursor + 15, Math.min(profile.dinnerWindow[1], profile.dinnerWindow[0] + 15)),
    );
  }
  if (country === "AT") {
    dinner.duration = Math.min(dinner.duration ?? 35, 32);
  }
  if (country === "IN") {
    const revBudget = 20;
    const windBudget = 20;
    const targetDinner = roundRoutineClockMins(20 * 60, 10);
    const latestDinnerStart =
      sleepMins - (dinner.duration ?? 35) - GAP_MINS - revBudget - GAP_MINS - windBudget - GAP_MINS;
    dinner.time = minsToTime24(
      Math.min(
        targetDinner,
        Math.max(schoolEnd + 120, latestDinnerStart),
      ),
    );
  }
  const finalDinnerEnd = parseTimeToMins(dinner.time) + dinner.duration;

  cursor = finalDinnerEnd + GAP_MINS;

  const placedPost: RoutineScheduleItem[] = [];
  const postSlots: RoutineScheduleItem[] = [];

  if (country === "IN") {
    const revision = postDinner.find(isPostDinnerStudy);
    const revBudget = 25;
    const windBudget = 25;
    const roomBeforeSleep =
      sleepMins - cursor - revBudget - windBudget - GAP_MINS * 2;
    if (revision && roomBeforeSleep >= 0) {
      revision.structureKind = "post_dinner_study";
      postSlots.push(revision);
    } else if (!revision && roomBeforeSleep >= 15) {
      postSlots.push({
        time: minsToTime24(cursor),
        activity: "Optional revision with parent",
        duration: 20,
        category: "study",
        status: "pending",
        structureKind: "post_dinner_study",
      });
      adjustments.push("inserted India post-dinner revision (optional, sleep margin OK)");
    }
  }

  if (country === "AU" || country === "NZ") {
    const relax = postDinner.find((p) => effectiveKind(p) === "relax") ?? {
      time: minsToTime24(cursor),
      activity: "Relax & unwind",
      duration: 25,
      category: "rest",
      status: "pending",
      structureKind: "relax",
    };
    postSlots.push(relax);
  }

  let windDown = postDinner.find(isWindDownItem);
  if (!windDown) {
    windDown = {
      time: minsToTime24(cursor),
      activity: "Wind-down & story",
      duration: 25,
      category: "rest",
      status: "pending",
      structureKind: "wind_down",
      energyImpact: "post-meal wind-down",
    };
    adjustments.push("inserted wind-down after dinner");
  }
  windDown.structureKind = "wind_down";
  windDown.energyImpact = "post-meal wind-down";
  postSlots.push(windDown);

  const reserveBeforeSleep = 5;
  let postBudget = sleepMins - cursor - reserveBeforeSleep;
  for (let i = 0; i < postSlots.length; i++) {
    const slot = postSlots[i]!;
    const isLast = i === postSlots.length - 1;
    const remaining = postSlots.length - i;
    const minDur = country === "IN" && isPostDinnerStudy(slot) ? 12 : 15;
    const maxEnd = sleepMins - (isLast ? 0 : GAP_MINS);
    const maxDur = clampDurationForCategory(
      slot.category ?? "rest",
      slot.duration ?? 25,
    );
    let dur: number;
    if (isLast) {
      dur = Math.max(minDur, Math.min(maxDur, maxEnd - cursor));
    } else {
      dur = Math.max(
        minDur,
        Math.min(
          maxDur,
          Math.floor(postBudget / remaining) - GAP_MINS,
          maxEnd - cursor,
        ),
      );
    }
    if (cursor + dur > maxEnd) {
      dur = Math.max(minDur, maxEnd - cursor);
    }
    if (dur < minDur) continue;
    slot.time = minsToTime24(cursor);
    slot.duration = dur;
    placedPost.push(slot);
    cursor += dur + (isLast ? 0 : GAP_MINS);
    postBudget -= dur + (isLast ? 0 : GAP_MINS);
  }

  if (sleep) {
    sleep.time = minsToTime24(sleepMins);
    sleep.duration = clampDurationForCategory("sleep", sleep.duration ?? 30);
  }

  const morning = working.filter(
    (it) =>
      !pinned.has(it) &&
      !placedPre.includes(it) &&
      !placedPost.includes(it) &&
      parseTimeToMins(it.time) < (school?.duration ? parseTimeToMins(school.time) : schoolEnd),
  );

  const result = [
    ...morning.filter((m) => m !== breakfast),
    ...(breakfast ? [breakfast] : []),
    ...morning.filter((m) => m === breakfast),
    ...(school ? [school] : []),
    ...(lunch ? [lunch] : []),
    ...placedPre,
    dinner,
    ...placedPost,
    ...(sleep ? [sleep] : []),
  ]
    .filter(Boolean)
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));

  const deduped: RoutineScheduleItem[] = [];
  const seen = new Set<string>();
  for (const it of result) {
    const key = `${it.activity}|${it.category}`;
    if (seen.has(key) && !isMealDuplicateAllowed(it)) continue;
    if (isLunchItem(it) || isDinnerItem(it) || isSnackItem(it)) {
      deduped.push(it);
      seen.add(key);
      continue;
    }
    seen.add(key);
    deduped.push(it);
  }
  if (hasSchool && !deduped.some(isLunchItem)) {
    deduped.push({
      time: minsToTime24(schoolEnd + 15),
      activity: AFTER_SCHOOL_REFUEL_LABEL,
      duration: 35,
      category: "meal",
      status: "pending",
      notes: SCHOOL_LUNCH_IMPLICIT_NOTE,
    });
    adjustments.push("re-inserted after-school refuel after dedupe");
  }

  const wakeItem = deduped.find((i) => /wake|freshen up/i.test(i.activity));
  if (wakeItem) wakeItem.time = minsToTime24(wakeMins);
  if (breakfast) {
    breakfast.time = minsToTime24(
      Math.max(wakeMins + (wakeItem?.duration ?? 30) + GAP_MINS, parseTimeToMins(breakfast.time)),
    );
  }

  let polished = polishIntegratedTimeline(deduped, {
    country,
    wakeMins,
    sleepMins,
    schoolEndMins: schoolEnd,
    seed: schoolEnd + country.charCodeAt(0),
  });

  if (hasSchool) {
    tagImplicitSchoolLunch(polished.find(isSchoolItem));
    if (!polished.some(isLunchItem)) {
      polished = [
        ...polished,
        {
          time: minsToTime24(schoolEnd + 15),
          activity: AFTER_SCHOOL_REFUEL_LABEL,
          duration: 35,
          category: "meal",
          status: "pending" as const,
          notes: SCHOOL_LUNCH_IMPLICIT_NOTE,
        },
      ].sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
      polished = polishIntegratedTimeline(polished, {
        country,
        wakeMins,
        sleepMins,
        schoolEndMins: schoolEnd,
        seed: schoolEnd + country.charCodeAt(0) + 3,
      });
      adjustments.push("re-applied after-school refuel post-polish");
    }
  }

  void order;
  return { items: polished, adjustments };
}

function polishIntegratedTimeline(
  items: RoutineScheduleItem[],
  opts: {
    country: LaunchCountry;
    wakeMins: number;
    sleepMins: number;
    schoolEndMins: number;
    seed: number;
  },
): RoutineScheduleItem[] {
  const step = opts.country === "IN" ? 5 : 5;
  const sorted = [...items].sort(
    (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
  );

  const school = sorted.find(isSchoolItem);
  const sleep = sorted.find(isSleepItem);
  const wake = sorted.find((i) => /wake|freshen up/i.test(i.activity));

  let prevEnd = opts.wakeMins;

  const pinnedMeals = new Set(
    sorted.filter((i) => isLunchItem(i) || isDinnerItem(i) || isSnackItem(i)),
  );

  for (let i = 0; i < sorted.length; i++) {
    const it = sorted[i]!;
    if (pinnedMeals.has(it) && (isLunchItem(it) || isDinnerItem(it))) {
      let start = roundRoutineClockMins(parseTimeToMins(it.time), step);
      if (isLunchItem(it) && start < opts.schoolEndMins + 10) {
        start = roundRoutineClockMins(opts.schoolEndMins + 15, step);
      }
      if (start < prevEnd + GAP_MINS) {
        start = roundRoutineClockMins(prevEnd + GAP_MINS, step);
      }
      if (isDinnerItem(it) && opts.country === "IN") {
        start = roundRoutineClockMins(20 * 60, 10);
      }
      it.time = minsToTime24(start);
      prevEnd = start + (it.duration ?? 30);
      continue;
    }
    if (it === sleep) {
      it.time = minsToTime24(opts.sleepMins);
      continue;
    }
    if (it === wake) {
      it.time = minsToTime24(opts.wakeMins);
      prevEnd = opts.wakeMins + (it.duration ?? 30);
      continue;
    }
    if (it === school) {
      prevEnd = parseTimeToMins(it.time) + (it.duration ?? 360);
      continue;
    }

    let start = parseTimeToMins(it.time);
    if (isLunchItem(it) && start < opts.schoolEndMins) {
      start = opts.schoolEndMins + 15;
    }

    start = roundRoutineClockMins(
      humanJitterMins(start, opts.seed + i * 13),
      step,
    );

    if (start < prevEnd + GAP_MINS) {
      start = roundRoutineClockMins(prevEnd + GAP_MINS, step);
    }

    if (isDinnerItem(it) && opts.country === "IN") {
      start = roundRoutineClockMins(20 * 60, 10);
      if (start < prevEnd + GAP_MINS) {
        start = roundRoutineClockMins(prevEnd + GAP_MINS, 10);
      }
    }
    if (/\bhydration\b/i.test(it.activity)) {
      start = roundRoutineClockMins(17 * 60, 5);
      if (start < prevEnd + GAP_MINS) {
        start = roundRoutineClockMins(prevEnd + GAP_MINS, 5);
      }
    }
    if (isWindDownItem(it)) {
      const dur = it.duration ?? 20;
      start = Math.max(start, prevEnd + GAP_MINS);
      const latestStart = opts.sleepMins - dur - GAP_MINS;
      start = Math.min(start, latestStart);
      start = roundRoutineClockMins(start, step);
      if (start < prevEnd + GAP_MINS) {
        start = roundRoutineClockMins(prevEnd + GAP_MINS, step);
      }
      const maxDur = Math.max(10, opts.sleepMins - start - GAP_MINS);
      it.duration = Math.min(dur, maxDur);
    }
    if (
      opts.country === "AE" &&
      (effectiveKind(it) === "outdoor_evening" ||
        /\bevening outdoor\b/i.test(it.activity)) &&
      isOutdoorBlockedByHeat(start, "AE")
    ) {
      start = roundRoutineClockMins(18 * 60 + 30, 5);
      if (start < prevEnd + GAP_MINS) {
        start = roundRoutineClockMins(prevEnd + GAP_MINS, 5);
      }
    }

    it.time = minsToTime24(start);
    prevEnd = start + (it.duration ?? 30);
  }

  return sorted.sort((a, b) => {
    if (isSleepItem(a)) return 1;
    if (isSleepItem(b)) return -1;
    return parseTimeToMins(a.time) - parseTimeToMins(b.time);
  });
}

function isMealDuplicateAllowed(item: RoutineScheduleItem): boolean {
  return isDinnerItem(item) || isLunchItem(item);
}

/** @deprecated Use enforceIntegratedRoutineFlow */
export function applyMealAwareScheduling(
  items: RoutineScheduleItem[],
  state: Pick<InterpretedBehavioralState, "country" | "countryProfile">,
  opts: IntegratedRoutineOpts = {},
): { items: RoutineScheduleItem[]; adjustments: string[] } {
  return enforceIntegratedRoutineFlow(items, state, opts);
}

export function enrichRoutineMeals(
  items: RoutineScheduleItem[],
  opts: {
    country: string | LaunchCountry;
    isVeg?: boolean;
    fridgeItems?: string;
    seed?: number;
    ageInMonths?: number;
    feedingType?: "breastfeeding" | "formula" | "mixed";
    feedingAgeGroup?: FeedingAgeGroup;
  },
): RoutineScheduleItem[] {
  const feedingGroup =
    opts.feedingAgeGroup ??
    (opts.ageInMonths != null ? getAgeGroup(opts.ageInMonths) : "child");

  if (feedingGroup !== "child") {
    return enrichAgeFeedingMeals(items, feedingGroup, {
      ageInMonths: opts.ageInMonths,
      seed: opts.seed,
      feedingType: opts.feedingType,
    });
  }

  const c = normalizeCountryCode(opts.country);
  const usedBases = new Set<string>();
  const usedNames = new Set<string>();
  const usedVarietyKeys = new Set<string>();
  const usedMealPatterns = new Set<string>();
  const usedFridgeCombos = new Set<string>();
  const seedBase = opts.seed ?? 1;

  const mealOrder = mealSlotsByPriority() as readonly MealSlot[];
  const refuelDishes: string[] = [];
  let fridgeAccentUsedToday = false;

  const sorted = [...items].sort((a, b) => {
    const sa = mealSlotFromActivity(a.activity, a.category ?? "");
    const sb = mealSlotFromActivity(b.activity, b.category ?? "");
    const ia = sa ? mealOrder.indexOf(sa as MealSlot) : 99;
    const ib = sb ? mealOrder.indexOf(sb as MealSlot) : 99;
    return ia - ib || parseTimeToMins(a.time) - parseTimeToMins(b.time);
  });

  const enriched = new Map<RoutineScheduleItem, RoutineScheduleItem>();

  for (const it of sorted) {
    const slot = mealSlotFromActivity(it.activity, it.category ?? "");
    if (!slot) continue;

    const meta = resolveCountryMealDishes(c, slot, {
      isVeg: opts.isVeg,
      fridgeItems: opts.fridgeItems,
      seed: seedBase + usedNames.size,
      usedBases,
      usedNames,
      usedVarietyKeys,
      usedMealPatterns,
      usedFridgeCombos,
      preferFridgeAccent: prefersFridgeAccent(slot as MealPrioritySlot),
      usedRefuelDishes: slot === "dinner" ? [...refuelDishes] : undefined,
      skipFridgeAccent: fridgeAccentUsedToday,
    });

    for (const d of meta.dishes) {
      usedBases.add(dishBase(d));
      usedNames.add(d.toLowerCase());
      if (slot === "lunch") refuelDishes.push(d);
    }
    if (
      meta.dishes.some((d) =>
        /\b(sandwich|wrap|bowl|toast|snack plate|quick plate)\b/i.test(d),
      )
    ) {
      fridgeAccentUsedToday = true;
    }

    const mealNotes =
      slot === "lunch"
        ? `${SCHOOL_LUNCH_IMPLICIT_NOTE} Options: ${meta.dishes.join(" | ")}`
        : `Options: ${meta.dishes.join(" | ")}`;

    enriched.set(it, {
      ...it,
      meal: meta.meal,
      activity:
        /\b(breakfast|lunch|dinner|tiffin|drunch|snack|quick meal before school|refuel)\b/i.test(
          it.activity,
        )
          ? it.activity.match(/quick meal/i)
            ? "Quick Meal Before School"
            : meta.meal
          : it.activity,
      notes: mealNotes,
      dishes: meta.dishes,
      culturalReason: meta.culturalReason,
      energyImpact: meta.energyImpact,
    });
  }

  return items.map((it) => enriched.get(it) ?? it);
}

export function validateMealActivityIntegration(
  items: RoutineScheduleItem[],
  country: string | LaunchCountry,
  opts: IntegratedRoutineOpts = {},
): string[] {
  const feedingGroup =
    opts.feedingAgeGroup ??
    (opts.ageInMonths != null ? getAgeGroup(opts.ageInMonths) : "child");

  const ageWarnings = validateAgeFeedingIntegration(items, feedingGroup);
  if (feedingGroup !== "child") {
    return ageWarnings;
  }

  const warnings: string[] = [];
  const c = normalizeCountryCode(country);
  const profile = getCountryRoutineProfile(c);
  const schoolEnd = opts.schoolEndMins ?? 15 * 60;

  if (opts.hasSchool !== false) {
    const refuel = items.find(isLunchItem);
    if (!refuel) {
      warnings.push("meal-flow: missing after-school refuel on school day");
    } else {
      const t = parseTimeToMins(refuel.time);
      if (t < schoolEnd || t > schoolEnd + 75) {
        warnings.push(
          `meal-flow: after-school refuel at ${refuel.time} outside post-school window`,
        );
      }
    }
    const school = items.find(isSchoolItem);
    if (school && !school.notes?.includes("implicit")) {
      warnings.push("meal-flow: school block missing implicit school lunch note");
    }
    const earlySnack = items.find(
      (i) => isSnackItem(i) && parseTimeToMins(i.time) < schoolEnd,
    );
    if (earlySnack) {
      warnings.push(`meal-flow: snack at ${earlySnack.time} before school end`);
    }
  }

  const refuelMeal = items.find(isLunchItem);
  const dinner = items.find(isDinnerItem);
  if (refuelMeal?.dishes?.length && dinner?.dishes?.length) {
    for (const rd of refuelMeal.dishes) {
      for (const dd of dinner.dishes) {
        if (dishDuplicatesAcrossMeals(rd, dd)) {
          warnings.push(
            `meal-flow: same dish at refuel and dinner — "${rd}" / "${dd}"`,
          );
        }
      }
    }
  }

  if (dinner) {
    const dinnerStart = parseTimeToMins(dinner.time);
    const dinnerEnd = dinnerStart + (dinner.duration ?? 35);

    const between = items.filter((it) => {
      if (it === dinner || isSleepItem(it)) return false;
      const s = parseTimeToMins(it.time);
      return s >= dinnerStart && s < dinnerEnd && !isDinnerItem(it);
    });
    if (between.length > 0) {
      warnings.push("meal-flow: activity overlapping dinner window");
    }

    const afterDinner = items
      .filter((it) => !isSleepItem(it) && it !== dinner)
      .filter((it) => parseTimeToMins(it.time) >= dinnerEnd);

    const firstAfter = afterDinner.sort(
      (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
    )[0];

    const allowRelaxFirst =
      (c === "AU" || c === "NZ") && /\brelax\b/i.test(firstAfter?.activity ?? "");
    if (
      firstAfter &&
      !isWindDownItem(firstAfter) &&
      !isPostDinnerStudy(firstAfter) &&
      !allowRelaxFirst
    ) {
      warnings.push(
        `meal-flow: "${firstAfter.activity}" between dinner and wind-down (expected wind-down first)`,
      );
    }

    for (const it of afterDinner) {
      if (isHighEnergyItem(it) && !isPostDinnerStudy(it)) {
        warnings.push(`meal-flow: high-energy "${it.activity}" after dinner`);
      }
    }

    const majorAfter = afterDinner.filter(
      (it) => !isWindDownItem(it) && !isPostDinnerStudy(it) && (it.duration ?? 0) >= 25,
    );
    if (majorAfter.length > 1) {
      warnings.push("meal-flow: multiple major activities after dinner");
    }

    const t = parseTimeToMins(dinner.time);
    if (t < profile.dinnerWindow[0] - 45 || t > profile.dinnerWindow[1] + 45) {
      warnings.push(`meal-timing: dinner at ${dinner.time} outside ${c} window`);
    }
  }

  const meals = items.filter((i) => mealSlotFromActivity(i.activity, i.category ?? ""));
  for (let i = 1; i < meals.length; i++) {
    const prev = meals[i - 1]!;
    const curr = meals[i]!;
    const prevEnd = parseTimeToMins(prev.time) + (prev.duration ?? 30);
    const currStart = parseTimeToMins(curr.time);
    if (currStart < prevEnd - 1) {
      warnings.push(`meal-overlap: "${prev.activity}" overlaps "${curr.activity}"`);
    }
  }

  const mealBlocks = items.filter(
    (i) => (i.category ?? "").toLowerCase() === "meal" && (i.dishes?.length ?? 0) > 0,
  );
  const patterns = new Set<string>();
  for (const m of mealBlocks) {
    const pattern = mealPatternFromDishes(m.dishes!);
    if (patterns.has(pattern)) {
      warnings.push(`meal-variety: repeated meal pattern "${pattern}" in ${m.activity}`);
    }
    patterns.add(pattern);
  }

  const refuel = items.find(isLunchItem);
  const dinnerItem = items.find(isDinnerItem);
  if (refuel?.dishes?.length && dinnerItem?.dishes?.length) {
    const refuelBases = new Set(refuel.dishes.map(dishBase));
    const refuelKeys = new Set(refuel.dishes.map((d) => varietyKey(dishVarietyProfile(d))));
    for (const d of dinnerItem.dishes) {
      const b = dishBase(d);
      const vk = varietyKey(dishVarietyProfile(d));
      if (refuelBases.has(b) && (b === "rice" || b === "grain")) {
        warnings.push(`meal-variety: shared ${b} base at refuel and dinner`);
      }
      if (refuelKeys.has(vk)) {
        warnings.push(`meal-variety: duplicate grain/protein/prep at refuel and dinner`);
      }
    }
  }

  for (const it of items) {
    const mins = parseTimeToMins(it.time);
    if (mins % 5 !== 0 && c === "IN") {
      warnings.push(`meal-timing: India time ${it.time} not rounded to 5 minutes`);
    }
  }

  if (c === "AE" && opts.hasSchool !== false) {
    const hydrationSnack = items.find(
      (i) =>
        isSnackItem(i) &&
        parseTimeToMins(i.time) >= 16 * 60 + 45 &&
        parseTimeToMins(i.time) <= 17 * 60 + 15,
    );
    if (!hydrationSnack) {
      warnings.push("meal-flow: UAE missing afternoon hydration snack (~17:00)");
    }
  }

  if (c === "AE") {
    const outdoor = items.filter(
      (i) =>
        (i.category ?? "").toLowerCase() === "outdoor" ||
        /outdoor|evening walk/i.test(i.activity),
    );
    for (const o of outdoor) {
      const s = parseTimeToMins(o.time);
      if (isOutdoorBlockedByHeat(s, c)) {
        warnings.push(`meal-flow: UAE outdoor "${o.activity}" in heat window`);
      }
    }
    const indoor = items.filter(
      (i) =>
        /indoor rest|indoor creative/i.test(i.activity) ||
        effectiveKind(i) === "indoor_rest" ||
        effectiveKind(i) === "indoor_creative",
    );
    if (indoor.length < 1) {
      warnings.push("meal-flow: UAE missing afternoon indoor block");
    }
  }

  if (c === "IN") {
    const rev = items.find(isPostDinnerStudy);
    const play = items.find((i) => effectiveKind(i) === "play");
    if (rev && dinner && play && parseTimeToMins(rev.time) < parseTimeToMins(dinner.time)) {
      warnings.push("meal-flow: India revision should be after dinner");
    }
    if (play && dinner && parseTimeToMins(play.time) > parseTimeToMins(dinner.time)) {
      warnings.push("meal-flow: India play should be before dinner");
    }
  }

  return warnings;
}

export { getAgeGroup, type FeedingAgeGroup } from "./routine-age-feeding.js";

/** Meal generation — branches on age before country/fridge logic. */
export function generateMeals(
  input: {
    country: string | LaunchCountry;
    slot: MealSlot | "feeding" | "soft_meal" | "toddler_meal";
    ageInMonths: number;
    isVeg?: boolean;
    fridgeItems?: string;
    seed?: number;
  },
): IntegratedMealMeta | AgeFeedingMeta | InfantFeedingMeta {
  const group = getAgeGroup(input.ageInMonths);
  if (group !== "child") {
    let ageSlot: "feeding" | "soft_meal" | "toddler_meal" = "feeding";
    if (group === "infant_0_6") {
      ageSlot = "feeding";
    } else if (group === "infant_6_12") {
      ageSlot =
        input.slot === "feeding" || input.slot === "soft_meal"
          ? input.slot
          : "soft_meal";
    } else {
      ageSlot = "toddler_meal";
    }
    return resolveAgeFeedingDishes(group, ageSlot, {
      seed: input.seed,
      ageInMonths: input.ageInMonths,
    });
  }
  return resolveCountryMealDishes(input.country, input.slot as MealSlot, {
    isVeg: input.isVeg,
    fridgeItems: input.fridgeItems,
    seed: input.seed,
  });
}

export function regionForCountry(country: LaunchCountry, mealPattern: string): Region {
  if (mealPattern === "indian") return "pan_indian";
  if (mealPattern === "middle_eastern") return "global";
  return "global";
}
