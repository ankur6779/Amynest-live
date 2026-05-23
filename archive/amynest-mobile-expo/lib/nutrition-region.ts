// nutrition-region.ts
// Globally-adaptive nutrition: region-aware food sources, authority mapping,
// dietary filtering, and smart food substitutions.
// Works on web (React) and mobile (React Native) — pure TS, no platform APIs.

import { useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegionCode = "IN" | "US" | "GB" | "AU" | "CA" | "NZ" | "global";
export type DietFilter = "veg" | "nonveg" | "all";

export interface RegionConfig {
  code: RegionCode;
  flag: string;
  guidelineBadge: string;
  authorityShort: string;
  foodSourceTitle: string;
  sourceRef: string;
  trustLabel: string;
}

// ─── Region Configs ───────────────────────────────────────────────────────────

export const REGION_CONFIGS: Record<RegionCode, RegionConfig> = {
  IN: {
    code: "IN", flag: "🇮🇳",
    guidelineBadge: "Science-backed · WHO / ICMR",
    authorityShort: "ICMR-NIN & WHO",
    foodSourceTitle: "Indian Food Sources",
    sourceRef: "Source: ICMR-NIN Nutrient Requirements for Indians (2020) & WHO Guidelines",
    trustLabel: "Popular in India",
  },
  US: {
    code: "US", flag: "🇺🇸",
    guidelineBadge: "Science-backed · AAP / USDA",
    authorityShort: "AAP, USDA & WHO",
    foodSourceTitle: "Common US Food Sources",
    sourceRef: "Source: USDA Dietary Guidelines (2020–2025), AAP Nutritional Guidelines & WHO",
    trustLabel: "Common in the US",
  },
  GB: {
    code: "GB", flag: "🇬🇧",
    guidelineBadge: "Science-backed · NHS / WHO",
    authorityShort: "NHS & WHO",
    foodSourceTitle: "UK Family Food Sources",
    sourceRef: "Source: NHS Eatwell Guide, Public Health England & WHO Global Nutrition Guidelines",
    trustLabel: "UK family-friendly",
  },
  AU: {
    code: "AU", flag: "🇦🇺",
    guidelineBadge: "Science-backed · NHMRC · WHO",
    authorityShort: "Australian Dietary Guidelines & WHO",
    foodSourceTitle: "Australian Food Sources",
    sourceRef: "Source: Australian Dietary Guidelines (NHMRC 2013, review 2024) & WHO",
    trustLabel: "Common in Australia",
  },
  CA: {
    code: "CA", flag: "🇨🇦",
    guidelineBadge: "Science-backed · Canada Food Guide",
    authorityShort: "Health Canada & WHO",
    foodSourceTitle: "Canadian Food Sources",
    sourceRef: "Source: Health Canada Food Guide (2019), Dietitians of Canada & WHO",
    trustLabel: "Common in Canada",
  },
  NZ: {
    code: "NZ", flag: "🇳🇿",
    guidelineBadge: "Science-backed · NZ Health · WHO",
    authorityShort: "NZ Ministry of Health & WHO",
    foodSourceTitle: "New Zealand Food Sources",
    sourceRef: "Source: NZ Ministry of Health Eating & Activity Guidelines (2020) & WHO",
    trustLabel: "Common in New Zealand",
  },
  global: {
    code: "global", flag: "🌍",
    guidelineBadge: "Science-backed · WHO",
    authorityShort: "WHO Global Guidelines",
    foodSourceTitle: "Recommended Food Sources",
    sourceRef: "Source: WHO Global Nutrition Guidelines & International Paediatric Dietary Standards",
    trustLabel: "Globally recommended",
  },
};

// ─── Timezone → Region ────────────────────────────────────────────────────────

const TIMEZONE_TO_REGION: Partial<Record<string, RegionCode>> = {
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Los_Angeles": "US", "America/Phoenix": "US", "America/Anchorage": "US",
  "America/Boise": "US", "America/Indiana/Indianapolis": "US", "America/Detroit": "US",
  "America/Kentucky/Louisville": "US", "America/Indiana/Vincennes": "US",
  "America/Juneau": "US", "Pacific/Honolulu": "US",
  "Europe/London": "GB", "Europe/Belfast": "GB",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU",
  "Australia/Perth": "AU", "Australia/Adelaide": "AU", "Australia/Darwin": "AU",
  "Australia/Hobart": "AU", "Australia/Canberra": "AU",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA",
  "America/Winnipeg": "CA", "America/Regina": "CA", "America/Halifax": "CA",
  "America/St_Johns": "CA", "America/Whitehorse": "CA",
  "Pacific/Auckland": "NZ", "Pacific/Chatham": "NZ",
};

export function detectNutritionRegion(): RegionCode {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_TO_REGION[tz] ?? "global";
  } catch {
    return "global";
  }
}

// ─── Regional Food Source Type ────────────────────────────────────────────────

export interface RegionalFoodSource {
  name: string;
  emoji: string;
  type: "veg" | "nonveg" | "both";
  serving: string;
  amount: string;
  trustTag?: string;
}

// ─── Regional Food Databases ──────────────────────────────────────────────────
// "IN" is intentionally absent — `null` return from getRegionalSources signals
// the UI to fall back to the existing India-specific nutrient.sources array.

type NonIndia = Exclude<RegionCode, "IN">;
type RegionalDB = Partial<Record<NonIndia, RegionalFoodSource[]>>;

const REGIONAL_FOOD_SOURCES: Record<string, RegionalDB> = {

  protein: {
    US: [
      { name: "Chicken breast", emoji: "🍗", type: "nonveg", serving: "100g cooked", amount: "27g" },
      { name: "Greek yogurt", emoji: "🥣", type: "veg", serving: "150g", amount: "15g" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "12g" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "18g" },
      { name: "Peanut butter", emoji: "🥜", type: "veg", serving: "2 tbsp", amount: "8g" },
      { name: "Black beans", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "15g" },
      { name: "Cottage cheese", emoji: "🧀", type: "veg", serving: "100g", amount: "11g" },
      { name: "Canned tuna", emoji: "🐟", type: "nonveg", serving: "100g", amount: "25g" },
    ],
    GB: [
      { name: "Chicken breast", emoji: "🍗", type: "nonveg", serving: "100g cooked", amount: "27g" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "12g" },
      { name: "Baked beans", emoji: "🫘", type: "veg", serving: "200g", amount: "10g", trustTag: "UK staple" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "18g" },
      { name: "Greek-style yogurt", emoji: "🥣", type: "veg", serving: "150g", amount: "12g" },
      { name: "Salmon", emoji: "🐟", type: "nonveg", serving: "100g", amount: "25g" },
      { name: "Quorn (mycoprotein)", emoji: "🍄", type: "veg", serving: "100g", amount: "14g", trustTag: "UK family-friendly" },
      { name: "Mackerel", emoji: "🐟", type: "nonveg", serving: "100g", amount: "19g" },
    ],
    AU: [
      { name: "Chicken breast", emoji: "🍗", type: "nonveg", serving: "100g cooked", amount: "27g" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "12g" },
      { name: "Greek yogurt", emoji: "🥣", type: "veg", serving: "150g", amount: "15g" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "18g" },
      { name: "Lean beef", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "26g" },
      { name: "Canned tuna", emoji: "🐟", type: "nonveg", serving: "100g", amount: "25g" },
      { name: "Tofu (firm)", emoji: "🍶", type: "veg", serving: "100g", amount: "8g" },
      { name: "Kidney beans", emoji: "🫘", type: "veg", serving: "1 cup", amount: "13g" },
    ],
    CA: [
      { name: "Chicken breast", emoji: "🍗", type: "nonveg", serving: "100g cooked", amount: "27g" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "12g" },
      { name: "Greek yogurt", emoji: "🥣", type: "veg", serving: "150g", amount: "15g" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "18g" },
      { name: "Salmon (Pacific)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "25g", trustTag: "BC wild salmon" },
      { name: "Black beans", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "15g" },
      { name: "Peanut butter", emoji: "🥜", type: "veg", serving: "2 tbsp", amount: "8g" },
      { name: "Tempeh", emoji: "🫘", type: "veg", serving: "100g", amount: "19g" },
    ],
    NZ: [
      { name: "Chicken", emoji: "🍗", type: "nonveg", serving: "100g cooked", amount: "27g" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "12g" },
      { name: "Lamb", emoji: "🥩", type: "nonveg", serving: "100g", amount: "26g", trustTag: "NZ grass-fed" },
      { name: "Greek yogurt", emoji: "🥣", type: "veg", serving: "150g", amount: "15g" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "18g" },
      { name: "Salmon (King/Chinook)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "25g", trustTag: "NZ farmed" },
      { name: "Cottage cheese", emoji: "🧀", type: "veg", serving: "100g", amount: "11g" },
      { name: "Chickpeas", emoji: "🫘", type: "veg", serving: "1 cup", amount: "15g" },
    ],
    global: [
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "12g" },
      { name: "Chicken", emoji: "🍗", type: "nonveg", serving: "100g cooked", amount: "27g" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "18g" },
      { name: "Chickpeas", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "15g" },
      { name: "Yogurt (plain)", emoji: "🥣", type: "veg", serving: "150g", amount: "9g" },
      { name: "Tuna", emoji: "🐟", type: "nonveg", serving: "100g", amount: "25g" },
      { name: "Tofu", emoji: "🍶", type: "veg", serving: "100g", amount: "8g" },
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 cup (240ml)", amount: "8g" },
    ],
  },

  iron: {
    US: [
      { name: "Lean beef", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "2.7mg" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "6.4mg" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "6.6mg" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "4–8mg", trustTag: "Check label" },
      { name: "Kidney beans", emoji: "🫘", type: "veg", serving: "1 cup", amount: "3.9mg" },
      { name: "Oysters", emoji: "🦪", type: "nonveg", serving: "85g", amount: "8mg" },
      { name: "Pumpkin seeds", emoji: "🎃", type: "veg", serving: "30g", amount: "2.5mg" },
      { name: "Dark chocolate (70%+)", emoji: "🍫", type: "veg", serving: "30g", amount: "3.4mg" },
    ],
    GB: [
      { name: "Lean red meat (beef/lamb)", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "2.7mg" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "6.4mg" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "6.6mg" },
      { name: "Baked beans", emoji: "🫘", type: "veg", serving: "200g", amount: "2.8mg", trustTag: "UK staple" },
      { name: "Fortified breakfast cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "4–8mg" },
      { name: "Fortified bread", emoji: "🍞", type: "veg", serving: "2 slices", amount: "2mg" },
      { name: "Tofu", emoji: "🍶", type: "veg", serving: "100g", amount: "2.7mg" },
      { name: "Dried apricots", emoji: "🍑", type: "veg", serving: "30g", amount: "1.5mg" },
    ],
    AU: [
      { name: "Lean beef", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "2.7mg" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "6.4mg" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "6.6mg" },
      { name: "Weet-Bix (fortified)", emoji: "🌾", type: "veg", serving: "2 biscuits", amount: "2.5mg", trustTag: "AU iconic" },
      { name: "Lamb", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "1.9mg" },
      { name: "Pumpkin seeds", emoji: "🎃", type: "veg", serving: "30g", amount: "2.5mg" },
      { name: "Tofu", emoji: "🍶", type: "veg", serving: "100g", amount: "2.7mg" },
      { name: "Dried apricots", emoji: "🍑", type: "veg", serving: "30g", amount: "1.5mg" },
    ],
    CA: [
      { name: "Lean beef", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "2.7mg" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "6.4mg" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "6.6mg" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "4–8mg" },
      { name: "Black beans", emoji: "🫘", type: "veg", serving: "1 cup", amount: "3.6mg" },
      { name: "Pumpkin seeds", emoji: "🎃", type: "veg", serving: "30g", amount: "2.5mg" },
      { name: "Tofu", emoji: "🍶", type: "veg", serving: "100g", amount: "2.7mg" },
      { name: "Quinoa", emoji: "🌾", type: "veg", serving: "1 cup cooked", amount: "2.8mg" },
    ],
    NZ: [
      { name: "Lamb", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "1.9mg", trustTag: "NZ grass-fed" },
      { name: "Lean beef", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "2.7mg" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "6.4mg" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "6.6mg" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "4–8mg" },
      { name: "Venison", emoji: "🦌", type: "nonveg", serving: "100g cooked", amount: "3.4mg", trustTag: "NZ specialty" },
      { name: "Pumpkin seeds", emoji: "🎃", type: "veg", serving: "30g", amount: "2.5mg" },
      { name: "Tofu", emoji: "🍶", type: "veg", serving: "100g", amount: "2.7mg" },
    ],
    global: [
      { name: "Lean red meat", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "2.7mg" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "6.4mg" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "6.6mg" },
      { name: "Chickpeas", emoji: "🫘", type: "veg", serving: "1 cup", amount: "4.7mg" },
      { name: "Pumpkin seeds", emoji: "🎃", type: "veg", serving: "30g", amount: "2.5mg" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "4–8mg" },
      { name: "Tofu", emoji: "🍶", type: "veg", serving: "100g", amount: "2.7mg" },
      { name: "Kidney beans", emoji: "🫘", type: "veg", serving: "1 cup", amount: "3.9mg" },
    ],
  },

  calcium: {
    US: [
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 cup (240ml)", amount: "300mg" },
      { name: "Greek yogurt", emoji: "🥣", type: "veg", serving: "150g", amount: "200mg" },
      { name: "Cheddar cheese", emoji: "🧀", type: "veg", serving: "30g", amount: "200mg" },
      { name: "Fortified plant milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "300mg" },
      { name: "Tofu (calcium-set)", emoji: "🍶", type: "veg", serving: "100g", amount: "350mg" },
      { name: "Sardines (canned)", emoji: "🐟", type: "nonveg", serving: "85g", amount: "325mg" },
      { name: "Kale (cooked)", emoji: "🥬", type: "veg", serving: "1 cup", amount: "180mg" },
      { name: "Fortified orange juice", emoji: "🍊", type: "veg", serving: "1 cup", amount: "300mg" },
    ],
    GB: [
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 cup (240ml)", amount: "300mg" },
      { name: "Cheese", emoji: "🧀", type: "veg", serving: "30g", amount: "200mg" },
      { name: "Yogurt (natural)", emoji: "🥣", type: "veg", serving: "150g", amount: "180mg" },
      { name: "Sardines (tinned)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "350mg", trustTag: "UK family-friendly" },
      { name: "Fortified plant milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "300mg" },
      { name: "Tofu (calcium-set)", emoji: "🍶", type: "veg", serving: "100g", amount: "350mg" },
      { name: "Kale", emoji: "🥬", type: "veg", serving: "1 cup cooked", amount: "180mg" },
      { name: "White beans", emoji: "🫘", type: "veg", serving: "1 cup", amount: "161mg" },
    ],
    AU: [
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 cup (240ml)", amount: "300mg" },
      { name: "Cheese", emoji: "🧀", type: "veg", serving: "30g", amount: "200mg" },
      { name: "Yogurt (plain)", emoji: "🥣", type: "veg", serving: "150g", amount: "180mg" },
      { name: "Canned salmon (with bones)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "300mg" },
      { name: "Fortified soy milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "300mg" },
      { name: "Tofu (calcium-set)", emoji: "🍶", type: "veg", serving: "100g", amount: "350mg" },
      { name: "Kale", emoji: "🥬", type: "veg", serving: "1 cup cooked", amount: "180mg" },
      { name: "Almonds", emoji: "🌰", type: "veg", serving: "30g", amount: "76mg" },
    ],
    CA: [
      { name: "Milk (fortified)", emoji: "🥛", type: "veg", serving: "1 cup", amount: "300mg", trustTag: "Vit D added" },
      { name: "Fortified plant milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "300mg" },
      { name: "Cheese", emoji: "🧀", type: "veg", serving: "30g", amount: "200mg" },
      { name: "Yogurt (plain)", emoji: "🥣", type: "veg", serving: "150g", amount: "180mg" },
      { name: "Tofu (calcium-set)", emoji: "🍶", type: "veg", serving: "100g", amount: "350mg" },
      { name: "Sardines (canned)", emoji: "🐟", type: "nonveg", serving: "85g", amount: "325mg" },
      { name: "Kale", emoji: "🥬", type: "veg", serving: "1 cup cooked", amount: "180mg" },
      { name: "Bok choy", emoji: "🥬", type: "veg", serving: "1 cup cooked", amount: "160mg" },
    ],
    NZ: [
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 cup (240ml)", amount: "300mg" },
      { name: "Cheese", emoji: "🧀", type: "veg", serving: "30g", amount: "200mg" },
      { name: "Yogurt (plain)", emoji: "🥣", type: "veg", serving: "150g", amount: "180mg" },
      { name: "Canned sardines / salmon", emoji: "🐟", type: "nonveg", serving: "100g", amount: "325mg" },
      { name: "Fortified plant milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "300mg" },
      { name: "Tofu (calcium-set)", emoji: "🍶", type: "veg", serving: "100g", amount: "350mg" },
      { name: "Kale / Silverbeet", emoji: "🥬", type: "veg", serving: "1 cup cooked", amount: "180mg" },
      { name: "Almonds", emoji: "🌰", type: "veg", serving: "30g", amount: "76mg" },
    ],
    global: [
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 cup (240ml)", amount: "300mg" },
      { name: "Yogurt (plain)", emoji: "🥣", type: "veg", serving: "150g", amount: "180mg" },
      { name: "Cheese", emoji: "🧀", type: "veg", serving: "30g", amount: "200mg" },
      { name: "Tofu (calcium-set)", emoji: "🍶", type: "veg", serving: "100g", amount: "350mg" },
      { name: "Sardines (with bones)", emoji: "🐟", type: "nonveg", serving: "85g", amount: "325mg" },
      { name: "Kale (cooked)", emoji: "🥬", type: "veg", serving: "1 cup", amount: "180mg" },
      { name: "Fortified plant milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "300mg" },
      { name: "Almonds", emoji: "🌰", type: "veg", serving: "30g", amount: "76mg" },
    ],
  },

  vitamin_a: {
    US: [
      { name: "Sweet potato", emoji: "🍠", type: "veg", serving: "1 medium baked", amount: "961mcg RAE" },
      { name: "Butternut squash", emoji: "🎃", type: "veg", serving: "1 cup", amount: "1144mcg RAE" },
      { name: "Carrots", emoji: "🥕", type: "veg", serving: "1 medium", amount: "509mcg RAE" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "943mcg RAE" },
      { name: "Kale (cooked)", emoji: "🥬", type: "veg", serving: "1 cup", amount: "885mcg RAE" },
      { name: "Beef liver", emoji: "🫀", type: "nonveg", serving: "85g", amount: "6582mcg RAE" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "149mcg RAE" },
      { name: "Fortified milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "149mcg RAE" },
    ],
    GB: [
      { name: "Carrots", emoji: "🥕", type: "veg", serving: "1 medium", amount: "509mcg RAE" },
      { name: "Sweet potato", emoji: "🍠", type: "veg", serving: "1 medium", amount: "961mcg RAE" },
      { name: "Butternut squash", emoji: "🎃", type: "veg", serving: "1 cup", amount: "1144mcg RAE" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "943mcg RAE" },
      { name: "Kale", emoji: "🥬", type: "veg", serving: "1 cup cooked", amount: "885mcg RAE" },
      { name: "Liver", emoji: "🫀", type: "nonveg", serving: "85g", amount: "5000mcg+ RAE", trustTag: "Limit in pregnancy" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "149mcg RAE" },
      { name: "Mackerel", emoji: "🐟", type: "nonveg", serving: "100g", amount: "50mcg RAE" },
    ],
    AU: [
      { name: "Pumpkin (butternut)", emoji: "🎃", type: "veg", serving: "1 cup", amount: "1144mcg RAE" },
      { name: "Carrots", emoji: "🥕", type: "veg", serving: "1 medium", amount: "509mcg RAE" },
      { name: "Sweet potato", emoji: "🍠", type: "veg", serving: "1 medium", amount: "961mcg RAE" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "943mcg RAE" },
      { name: "Rockmelon (cantaloupe)", emoji: "🍈", type: "veg", serving: "1 cup", amount: "270mcg RAE" },
      { name: "Kale", emoji: "🥬", type: "veg", serving: "1 cup", amount: "885mcg RAE" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "149mcg RAE" },
      { name: "Papaya", emoji: "🍑", type: "veg", serving: "1 cup", amount: "149mcg RAE" },
    ],
    CA: [
      { name: "Sweet potato", emoji: "🍠", type: "veg", serving: "1 medium", amount: "961mcg RAE" },
      { name: "Butternut squash", emoji: "🎃", type: "veg", serving: "1 cup", amount: "1144mcg RAE" },
      { name: "Carrots", emoji: "🥕", type: "veg", serving: "1 medium", amount: "509mcg RAE" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "943mcg RAE" },
      { name: "Kale (cooked)", emoji: "🥬", type: "veg", serving: "1 cup", amount: "885mcg RAE" },
      { name: "Cantaloupe", emoji: "🍈", type: "veg", serving: "1 cup", amount: "270mcg RAE" },
      { name: "Beef liver", emoji: "🫀", type: "nonveg", serving: "85g", amount: "6582mcg RAE" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "149mcg RAE" },
    ],
    NZ: [
      { name: "Kumara (sweet potato)", emoji: "🍠", type: "veg", serving: "1 medium", amount: "961mcg RAE", trustTag: "NZ iconic" },
      { name: "Pumpkin", emoji: "🎃", type: "veg", serving: "1 cup", amount: "1144mcg RAE" },
      { name: "Carrots", emoji: "🥕", type: "veg", serving: "1 medium", amount: "509mcg RAE" },
      { name: "Spinach", emoji: "🌿", type: "veg", serving: "1 cup cooked", amount: "943mcg RAE" },
      { name: "Silverbeet (Swiss chard)", emoji: "🥬", type: "veg", serving: "1 cup", amount: "500mcg RAE", trustTag: "NZ garden staple" },
      { name: "Kale", emoji: "🥬", type: "veg", serving: "1 cup", amount: "885mcg RAE" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "149mcg RAE" },
      { name: "Mango", emoji: "🥭", type: "veg", serving: "1 cup", amount: "89mcg RAE" },
    ],
    global: [
      { name: "Carrots", emoji: "🥕", type: "veg", serving: "1 medium", amount: "509mcg RAE" },
      { name: "Sweet potato", emoji: "🍠", type: "veg", serving: "1 medium", amount: "961mcg RAE" },
      { name: "Pumpkin / squash", emoji: "🎃", type: "veg", serving: "1 cup", amount: "1144mcg RAE" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "943mcg RAE" },
      { name: "Kale (cooked)", emoji: "🥬", type: "veg", serving: "1 cup", amount: "885mcg RAE" },
      { name: "Mango", emoji: "🥭", type: "veg", serving: "1 cup", amount: "89mcg RAE" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "149mcg RAE" },
      { name: "Liver", emoji: "🫀", type: "nonveg", serving: "85g", amount: "5000mcg+ RAE" },
    ],
  },

  vitamin_c: {
    US: [
      { name: "Red bell pepper", emoji: "🫑", type: "veg", serving: "½ cup raw", amount: "95mg" },
      { name: "Orange", emoji: "🍊", type: "veg", serving: "1 medium", amount: "70mg" },
      { name: "Strawberries", emoji: "🍓", type: "veg", serving: "1 cup", amount: "85mg" },
      { name: "Kiwi", emoji: "🥝", type: "veg", serving: "1 medium", amount: "64mg" },
      { name: "Broccoli", emoji: "🥦", type: "veg", serving: "1 cup", amount: "81mg" },
      { name: "Brussels sprouts", emoji: "🥦", type: "veg", serving: "½ cup cooked", amount: "48mg" },
      { name: "Cantaloupe", emoji: "🍈", type: "veg", serving: "1 cup", amount: "57mg" },
      { name: "Tomato", emoji: "🍅", type: "veg", serving: "1 medium", amount: "23mg" },
    ],
    GB: [
      { name: "Blackcurrant", emoji: "🫐", type: "veg", serving: "100g", amount: "200mg", trustTag: "UK's highest Vit C fruit" },
      { name: "Red bell pepper", emoji: "🫑", type: "veg", serving: "½ cup raw", amount: "95mg" },
      { name: "Kiwi", emoji: "🥝", type: "veg", serving: "1 medium", amount: "64mg" },
      { name: "Strawberries", emoji: "🍓", type: "veg", serving: "1 cup", amount: "85mg" },
      { name: "Orange", emoji: "🍊", type: "veg", serving: "1 medium", amount: "70mg" },
      { name: "Broccoli", emoji: "🥦", type: "veg", serving: "1 cup cooked", amount: "81mg" },
      { name: "Blackberries", emoji: "🫐", type: "veg", serving: "1 cup", amount: "30mg" },
      { name: "Cabbage (raw)", emoji: "🥬", type: "veg", serving: "1 cup", amount: "33mg" },
    ],
    AU: [
      { name: "Kiwi", emoji: "🥝", type: "veg", serving: "1 medium", amount: "64mg" },
      { name: "Red bell pepper", emoji: "🫑", type: "veg", serving: "½ cup raw", amount: "95mg" },
      { name: "Orange", emoji: "🍊", type: "veg", serving: "1 medium", amount: "70mg" },
      { name: "Strawberries", emoji: "🍓", type: "veg", serving: "1 cup", amount: "85mg" },
      { name: "Guava", emoji: "🍐", type: "veg", serving: "1 medium", amount: "228mg" },
      { name: "Mango", emoji: "🥭", type: "veg", serving: "1 cup", amount: "60mg" },
      { name: "Papaya", emoji: "🍑", type: "veg", serving: "1 cup", amount: "88mg" },
      { name: "Broccoli", emoji: "🥦", type: "veg", serving: "1 cup", amount: "81mg" },
    ],
    CA: [
      { name: "Red bell pepper", emoji: "🫑", type: "veg", serving: "½ cup raw", amount: "95mg" },
      { name: "Orange", emoji: "🍊", type: "veg", serving: "1 medium", amount: "70mg" },
      { name: "Kiwi", emoji: "🥝", type: "veg", serving: "1 medium", amount: "64mg" },
      { name: "Strawberries", emoji: "🍓", type: "veg", serving: "1 cup", amount: "85mg" },
      { name: "Wild blueberries", emoji: "🫐", type: "veg", serving: "1 cup", amount: "14mg", trustTag: "Canadian wild blueberries" },
      { name: "Broccoli", emoji: "🥦", type: "veg", serving: "1 cup", amount: "81mg" },
      { name: "Grapefruit", emoji: "🍊", type: "veg", serving: "½ fruit", amount: "39mg" },
      { name: "Brussels sprouts", emoji: "🥦", type: "veg", serving: "½ cup", amount: "48mg" },
    ],
    NZ: [
      { name: "Kiwifruit", emoji: "🥝", type: "veg", serving: "1 medium", amount: "64mg", trustTag: "Native to NZ!" },
      { name: "Red bell pepper", emoji: "🫑", type: "veg", serving: "½ cup raw", amount: "95mg" },
      { name: "Orange", emoji: "🍊", type: "veg", serving: "1 medium", amount: "70mg" },
      { name: "Strawberries", emoji: "🍓", type: "veg", serving: "1 cup", amount: "85mg" },
      { name: "Feijoa", emoji: "🍃", type: "veg", serving: "100g", amount: "20mg", trustTag: "NZ specialty" },
      { name: "Guava", emoji: "🍐", type: "veg", serving: "1 medium", amount: "228mg" },
      { name: "Broccoli", emoji: "🥦", type: "veg", serving: "1 cup", amount: "81mg" },
      { name: "Kale", emoji: "🥬", type: "veg", serving: "1 cup raw", amount: "53mg" },
    ],
    global: [
      { name: "Guava", emoji: "🍐", type: "veg", serving: "1 medium", amount: "228mg" },
      { name: "Red bell pepper", emoji: "🫑", type: "veg", serving: "½ cup raw", amount: "95mg" },
      { name: "Kiwi", emoji: "🥝", type: "veg", serving: "1 medium", amount: "64mg" },
      { name: "Orange", emoji: "🍊", type: "veg", serving: "1 medium", amount: "70mg" },
      { name: "Strawberries", emoji: "🍓", type: "veg", serving: "1 cup", amount: "85mg" },
      { name: "Broccoli", emoji: "🥦", type: "veg", serving: "1 cup", amount: "81mg" },
      { name: "Mango", emoji: "🥭", type: "veg", serving: "1 cup", amount: "60mg" },
      { name: "Papaya", emoji: "🍑", type: "veg", serving: "1 cup", amount: "88mg" },
    ],
  },

  vitamin_d: {
    US: [
      { name: "Salmon (Atlantic)", emoji: "🐟", type: "nonveg", serving: "100g cooked", amount: "570–988 IU" },
      { name: "Fortified milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "120 IU" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "40–100 IU" },
      { name: "Egg yolk", emoji: "🥚", type: "nonveg", serving: "1 large", amount: "44 IU" },
      { name: "Mushrooms (UV-exposed)", emoji: "🍄", type: "veg", serving: "100g", amount: "400 IU+", trustTag: "Place in sunlight 15 min" },
      { name: "Canned tuna", emoji: "🐟", type: "nonveg", serving: "85g", amount: "154 IU" },
      { name: "Cod liver oil", emoji: "💊", type: "nonveg", serving: "1 tsp", amount: "450 IU" },
      { name: "Fortified OJ", emoji: "🍊", type: "veg", serving: "1 cup", amount: "120 IU" },
    ],
    GB: [
      { name: "Oily fish (mackerel / herring)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "360–1628 IU", trustTag: "NHS recommended" },
      { name: "Salmon", emoji: "🐟", type: "nonveg", serving: "100g cooked", amount: "600 IU" },
      { name: "Egg yolk", emoji: "🥚", type: "nonveg", serving: "1 large", amount: "44 IU" },
      { name: "Mushrooms (UV-exposed)", emoji: "🍄", type: "veg", serving: "100g", amount: "400 IU+" },
      { name: "Sardines (canned)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "193 IU" },
      { name: "Fortified plant milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "80 IU" },
      { name: "Red meat", emoji: "🥩", type: "nonveg", serving: "100g", amount: "40 IU" },
      { name: "Supplement (Oct–Mar)", emoji: "💊", type: "both", serving: "Daily tablet", amount: "400 IU", trustTag: "NHS recommends all children year-round" },
    ],
    AU: [
      { name: "Sunlight", emoji: "☀️", type: "both", serving: "5–15 min (arms & legs)", amount: "Primary source", trustTag: "Key source across Australia" },
      { name: "Salmon", emoji: "🐟", type: "nonveg", serving: "100g cooked", amount: "600 IU" },
      { name: "Mackerel", emoji: "🐟", type: "nonveg", serving: "100g", amount: "360 IU" },
      { name: "Egg yolk", emoji: "🥚", type: "nonveg", serving: "1 large", amount: "44 IU" },
      { name: "Mushrooms (UV-exposed)", emoji: "🍄", type: "veg", serving: "100g", amount: "400 IU+" },
      { name: "Sardines (canned)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "193 IU" },
      { name: "Fortified soy milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "80 IU" },
      { name: "Fortified milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "80 IU" },
    ],
    CA: [
      { name: "Fortified milk (mandatory)", emoji: "🥛", type: "veg", serving: "1 cup", amount: "165 IU", trustTag: "All Canadian milk is fortified" },
      { name: "Salmon (Pacific)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "600 IU" },
      { name: "Fortified plant milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "160 IU" },
      { name: "Egg yolk", emoji: "🥚", type: "nonveg", serving: "1 large", amount: "44 IU" },
      { name: "Mushrooms (UV-exposed)", emoji: "🍄", type: "veg", serving: "100g", amount: "400 IU+" },
      { name: "Canned tuna", emoji: "🐟", type: "nonveg", serving: "85g", amount: "154 IU" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "40–100 IU" },
      { name: "Supplement (Oct–Apr)", emoji: "💊", type: "both", serving: "Daily", amount: "400–1000 IU", trustTag: "Dietitians of Canada recommends" },
    ],
    NZ: [
      { name: "Sunlight", emoji: "☀️", type: "both", serving: "5–15 min", amount: "Primary source", trustTag: "Good UV in most NZ regions" },
      { name: "Salmon (King / Chinook)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "600 IU", trustTag: "NZ farmed" },
      { name: "Mackerel", emoji: "🐟", type: "nonveg", serving: "100g", amount: "360 IU" },
      { name: "Egg yolk", emoji: "🥚", type: "nonveg", serving: "1 large", amount: "44 IU" },
      { name: "Mushrooms (UV-exposed)", emoji: "🍄", type: "veg", serving: "100g", amount: "400 IU+" },
      { name: "Sardines (canned)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "193 IU" },
      { name: "Fortified plant milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "80 IU" },
      { name: "Supplement (Jun–Aug)", emoji: "💊", type: "both", serving: "Daily", amount: "400 IU" },
    ],
    global: [
      { name: "Fatty fish (salmon / mackerel)", emoji: "🐟", type: "nonveg", serving: "100g cooked", amount: "400–600 IU" },
      { name: "Sunlight", emoji: "☀️", type: "both", serving: "5–15 min", amount: "Primary source" },
      { name: "Egg yolk", emoji: "🥚", type: "nonveg", serving: "1 large", amount: "44 IU" },
      { name: "Mushrooms (UV-exposed)", emoji: "🍄", type: "veg", serving: "100g", amount: "400 IU+" },
      { name: "Fortified milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "80–165 IU" },
      { name: "Sardines (canned)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "193 IU" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "40–100 IU" },
      { name: "Cod liver oil", emoji: "💊", type: "nonveg", serving: "1 tsp", amount: "450 IU" },
    ],
  },

  vitamin_b: {
    US: [
      { name: "Fortified breakfast cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "Full B-complex" },
      { name: "Whole wheat bread", emoji: "🍞", type: "veg", serving: "2 slices", amount: "B1, B2, folate" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "B2, B12" },
      { name: "Lean beef", emoji: "🥩", type: "nonveg", serving: "100g", amount: "B3, B6, B12" },
      { name: "Sunflower seeds", emoji: "🌻", type: "veg", serving: "30g", amount: "B1, B6" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "B1, B6, folate" },
      { name: "Salmon", emoji: "🐟", type: "nonveg", serving: "100g", amount: "B3, B6, B12" },
      { name: "Chicken", emoji: "🍗", type: "nonveg", serving: "100g", amount: "B3, B6" },
    ],
    GB: [
      { name: "Marmite", emoji: "🫙", type: "veg", serving: "1 tsp spread", amount: "B1, B2, B3, B12", trustTag: "UK iconic" },
      { name: "Fortified bread", emoji: "🍞", type: "veg", serving: "2 slices", amount: "B1, B2, folate" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "B2, B12" },
      { name: "Salmon / mackerel", emoji: "🐟", type: "nonveg", serving: "100g", amount: "B3, B6, B12" },
      { name: "Chicken", emoji: "🍗", type: "nonveg", serving: "100g", amount: "B3, B6" },
      { name: "Pork", emoji: "🥩", type: "nonveg", serving: "100g", amount: "B1, B3" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "B-complex" },
      { name: "Sunflower seeds", emoji: "🌻", type: "veg", serving: "30g", amount: "B1, B6" },
    ],
    AU: [
      { name: "Vegemite", emoji: "🫙", type: "veg", serving: "1 tsp spread", amount: "B1, B2, B3, folate", trustTag: "AU iconic" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "B-complex" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "B2, B12" },
      { name: "Salmon", emoji: "🐟", type: "nonveg", serving: "100g", amount: "B3, B6, B12" },
      { name: "Chicken", emoji: "🍗", type: "nonveg", serving: "100g", amount: "B3, B6" },
      { name: "Whole grain bread", emoji: "🍞", type: "veg", serving: "2 slices", amount: "B1, B3" },
      { name: "Sunflower seeds", emoji: "🌻", type: "veg", serving: "30g", amount: "B1, B6" },
      { name: "Brown rice", emoji: "🍚", type: "veg", serving: "1 cup cooked", amount: "B1, B3" },
    ],
    CA: [
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "Full B-complex" },
      { name: "Whole wheat bread", emoji: "🍞", type: "veg", serving: "2 slices", amount: "B1, B2, folate" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "B2, B12" },
      { name: "Salmon (Pacific)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "B3, B6, B12" },
      { name: "Lean beef", emoji: "🥩", type: "nonveg", serving: "100g", amount: "B3, B6, B12" },
      { name: "Sunflower seeds", emoji: "🌻", type: "veg", serving: "30g", amount: "B1, B6" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup", amount: "B1, B6, folate" },
      { name: "Brown rice", emoji: "🍚", type: "veg", serving: "1 cup cooked", amount: "B1, B3" },
    ],
    NZ: [
      { name: "Marmite / Vegemite", emoji: "🫙", type: "veg", serving: "1 tsp spread", amount: "B1, B2, B3, folate", trustTag: "NZ kitchen staple" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "B-complex" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "B2, B12" },
      { name: "Salmon", emoji: "🐟", type: "nonveg", serving: "100g", amount: "B3, B6, B12" },
      { name: "Lamb", emoji: "🥩", type: "nonveg", serving: "100g", amount: "B3, B6, B12" },
      { name: "Chicken", emoji: "🍗", type: "nonveg", serving: "100g", amount: "B3, B6" },
      { name: "Sunflower seeds", emoji: "🌻", type: "veg", serving: "30g", amount: "B1, B6" },
      { name: "Whole grain bread", emoji: "🍞", type: "veg", serving: "2 slices", amount: "B1, B3" },
    ],
    global: [
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "B2, B12" },
      { name: "Chicken", emoji: "🍗", type: "nonveg", serving: "100g", amount: "B3, B6" },
      { name: "Whole grains (oats / rice)", emoji: "🌾", type: "veg", serving: "1 cup cooked", amount: "B1, B3" },
      { name: "Lentils", emoji: "🫘", type: "veg", serving: "1 cup cooked", amount: "B1, B6, folate" },
      { name: "Sunflower seeds", emoji: "🌻", type: "veg", serving: "30g", amount: "B1, B6" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "B-complex" },
      { name: "Salmon", emoji: "🐟", type: "nonveg", serving: "100g", amount: "B3, B6, B12" },
      { name: "Nutritional yeast (fortified)", emoji: "🫙", type: "veg", serving: "1 tbsp", amount: "B-complex" },
    ],
  },

  vitamin_b12: {
    US: [
      { name: "Clams", emoji: "🦪", type: "nonveg", serving: "85g cooked", amount: "84mcg" },
      { name: "Lean beef", emoji: "🥩", type: "nonveg", serving: "100g", amount: "2.4mcg" },
      { name: "Salmon", emoji: "🐟", type: "nonveg", serving: "100g", amount: "3.2mcg" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "1.5–6mcg" },
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "1.2mcg" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "1mcg" },
      { name: "Fortified nutritional yeast", emoji: "🫙", type: "veg", serving: "2 tbsp", amount: "4mcg" },
      { name: "Chicken", emoji: "🍗", type: "nonveg", serving: "100g", amount: "0.3mcg" },
    ],
    GB: [
      { name: "Beef / lamb", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "2.4mcg" },
      { name: "Mackerel", emoji: "🐟", type: "nonveg", serving: "100g", amount: "8.7mcg" },
      { name: "Salmon", emoji: "🐟", type: "nonveg", serving: "100g", amount: "3.2mcg" },
      { name: "Marmite (fortified)", emoji: "🫙", type: "veg", serving: "1 tsp", amount: "0.7mcg", trustTag: "UK vegan-friendly" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "1mcg" },
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "1.2mcg" },
      { name: "Fortified plant milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "1.2mcg" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "1.5–6mcg" },
    ],
    AU: [
      { name: "Beef", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "2.4mcg" },
      { name: "Salmon", emoji: "🐟", type: "nonveg", serving: "100g", amount: "3.2mcg" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "1mcg" },
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "1.2mcg" },
      { name: "Fortified plant milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "1.2mcg" },
      { name: "Fortified cereal (Weet-Bix)", emoji: "🌾", type: "veg", serving: "2 biscuits", amount: "1.5mcg", trustTag: "AU iconic" },
      { name: "Tuna (canned)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "2.2mcg" },
      { name: "Nutritional yeast (fortified)", emoji: "🫙", type: "veg", serving: "2 tbsp", amount: "4mcg" },
    ],
    CA: [
      { name: "Lean beef", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "2.4mcg" },
      { name: "Salmon (Pacific)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "3.2mcg" },
      { name: "Clams", emoji: "🦪", type: "nonveg", serving: "85g", amount: "84mcg" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "1.5–6mcg" },
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "1.2mcg" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "1mcg" },
      { name: "Fortified nutritional yeast", emoji: "🫙", type: "veg", serving: "2 tbsp", amount: "4mcg" },
      { name: "Chicken", emoji: "🍗", type: "nonveg", serving: "100g", amount: "0.3mcg" },
    ],
    NZ: [
      { name: "Lamb", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "2.1mcg", trustTag: "NZ grass-fed" },
      { name: "Beef", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "2.4mcg" },
      { name: "Salmon (King)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "3.2mcg" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "1mcg" },
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "1.2mcg" },
      { name: "Fortified plant milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "1.2mcg" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "1.5–6mcg" },
      { name: "Tuna (canned)", emoji: "🐟", type: "nonveg", serving: "100g", amount: "2.2mcg" },
    ],
    global: [
      { name: "Beef / lamb", emoji: "🥩", type: "nonveg", serving: "100g cooked", amount: "2.4mcg" },
      { name: "Salmon", emoji: "🐟", type: "nonveg", serving: "100g", amount: "3.2mcg" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 large", amount: "1mcg" },
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "1.2mcg" },
      { name: "Fortified cereal", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "1.5–6mcg" },
      { name: "Fortified plant milk", emoji: "🥛", type: "veg", serving: "1 cup", amount: "1.2mcg" },
      { name: "Fortified nutritional yeast", emoji: "🫙", type: "veg", serving: "2 tbsp", amount: "4mcg" },
      { name: "Chicken", emoji: "🍗", type: "nonveg", serving: "100g", amount: "0.3mcg" },
    ],
  },

  vitamin_k: {
    US: [
      { name: "Kale (cooked)", emoji: "🥬", type: "veg", serving: "1 cup", amount: "1062mcg" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "888mcg" },
      { name: "Broccoli (cooked)", emoji: "🥦", type: "veg", serving: "1 cup", amount: "220mcg" },
      { name: "Brussels sprouts", emoji: "🥦", type: "veg", serving: "½ cup cooked", amount: "109mcg" },
      { name: "Parsley", emoji: "🌿", type: "veg", serving: "¼ cup", amount: "246mcg" },
      { name: "Romaine lettuce", emoji: "🥗", type: "veg", serving: "1 cup", amount: "57mcg" },
      { name: "Soybean oil", emoji: "🫙", type: "veg", serving: "1 tbsp", amount: "25mcg" },
      { name: "Green onions", emoji: "🌿", type: "veg", serving: "¼ cup", amount: "103mcg" },
    ],
    GB: [
      { name: "Kale", emoji: "🥬", type: "veg", serving: "1 cup cooked", amount: "1062mcg" },
      { name: "Spinach", emoji: "🌿", type: "veg", serving: "1 cup cooked", amount: "888mcg" },
      { name: "Broccoli", emoji: "🥦", type: "veg", serving: "1 cup cooked", amount: "220mcg" },
      { name: "Brussels sprouts", emoji: "🥦", type: "veg", serving: "½ cup cooked", amount: "109mcg", trustTag: "UK holiday staple" },
      { name: "Parsley", emoji: "🌿", type: "veg", serving: "¼ cup", amount: "246mcg" },
      { name: "Spring onions", emoji: "🌿", type: "veg", serving: "¼ cup", amount: "103mcg" },
      { name: "Olive oil", emoji: "🫙", type: "veg", serving: "1 tbsp", amount: "8mcg" },
      { name: "Romaine lettuce", emoji: "🥗", type: "veg", serving: "1 cup", amount: "57mcg" },
    ],
    AU: [
      { name: "Kale", emoji: "🥬", type: "veg", serving: "1 cup cooked", amount: "1062mcg" },
      { name: "Spinach", emoji: "🌿", type: "veg", serving: "1 cup cooked", amount: "888mcg" },
      { name: "Broccoli", emoji: "🥦", type: "veg", serving: "1 cup cooked", amount: "220mcg" },
      { name: "Asian greens (bok choy)", emoji: "🥬", type: "veg", serving: "1 cup", amount: "72mcg", trustTag: "Common in AU" },
      { name: "Brussels sprouts", emoji: "🥦", type: "veg", serving: "½ cup", amount: "109mcg" },
      { name: "Parsley", emoji: "🌿", type: "veg", serving: "¼ cup", amount: "246mcg" },
      { name: "Olive oil", emoji: "🫙", type: "veg", serving: "1 tbsp", amount: "8mcg" },
      { name: "Spring onions", emoji: "🌿", type: "veg", serving: "¼ cup", amount: "103mcg" },
    ],
    CA: [
      { name: "Kale", emoji: "🥬", type: "veg", serving: "1 cup cooked", amount: "1062mcg" },
      { name: "Spinach", emoji: "🌿", type: "veg", serving: "1 cup cooked", amount: "888mcg" },
      { name: "Broccoli", emoji: "🥦", type: "veg", serving: "1 cup cooked", amount: "220mcg" },
      { name: "Brussels sprouts", emoji: "🥦", type: "veg", serving: "½ cup", amount: "109mcg" },
      { name: "Parsley", emoji: "🌿", type: "veg", serving: "¼ cup", amount: "246mcg" },
      { name: "Canola oil", emoji: "🫙", type: "veg", serving: "1 tbsp", amount: "10mcg", trustTag: "Canadian crop" },
      { name: "Green onions", emoji: "🌿", type: "veg", serving: "¼ cup", amount: "103mcg" },
      { name: "Romaine lettuce", emoji: "🥗", type: "veg", serving: "1 cup", amount: "57mcg" },
    ],
    NZ: [
      { name: "Kale", emoji: "🥬", type: "veg", serving: "1 cup cooked", amount: "1062mcg" },
      { name: "Silverbeet (Swiss chard)", emoji: "🥬", type: "veg", serving: "1 cup", amount: "830mcg", trustTag: "NZ garden staple" },
      { name: "Spinach", emoji: "🌿", type: "veg", serving: "1 cup cooked", amount: "888mcg" },
      { name: "Broccoli", emoji: "🥦", type: "veg", serving: "1 cup cooked", amount: "220mcg" },
      { name: "Brussels sprouts", emoji: "🥦", type: "veg", serving: "½ cup", amount: "109mcg" },
      { name: "Parsley", emoji: "🌿", type: "veg", serving: "¼ cup", amount: "246mcg" },
      { name: "Spring onions", emoji: "🌿", type: "veg", serving: "¼ cup", amount: "103mcg" },
      { name: "Olive oil", emoji: "🫙", type: "veg", serving: "1 tbsp", amount: "8mcg" },
    ],
    global: [
      { name: "Kale (cooked)", emoji: "🥬", type: "veg", serving: "1 cup", amount: "1062mcg" },
      { name: "Spinach (cooked)", emoji: "🌿", type: "veg", serving: "1 cup", amount: "888mcg" },
      { name: "Broccoli (cooked)", emoji: "🥦", type: "veg", serving: "1 cup", amount: "220mcg" },
      { name: "Brussels sprouts", emoji: "🥦", type: "veg", serving: "½ cup", amount: "109mcg" },
      { name: "Parsley", emoji: "🌿", type: "veg", serving: "¼ cup", amount: "246mcg" },
      { name: "Lettuce (dark green)", emoji: "🥗", type: "veg", serving: "1 cup", amount: "57mcg" },
      { name: "Olive oil", emoji: "🫙", type: "veg", serving: "1 tbsp", amount: "8mcg" },
      { name: "Green onions", emoji: "🌿", type: "veg", serving: "¼ cup", amount: "103mcg" },
    ],
  },
};

// ─── Get Regional Sources ──────────────────────────────────────────────────────

export function getRegionalSources(
  nutrientId: string,
  region: RegionCode,
  diet: DietFilter = "all",
): RegionalFoodSource[] | null {
  if (region === "IN") return null; // signal: use existing India-specific nutrient.sources
  const byRegion = REGIONAL_FOOD_SOURCES[nutrientId];
  if (!byRegion) return null;
  const sources = byRegion[region as NonIndia] ?? byRegion.global ?? null;
  if (!sources) return null;
  if (diet === "veg") return sources.filter(s => s.type === "veg" || s.type === "both");
  return sources;
}

// ─── Smart Substitutions ──────────────────────────────────────────────────────

export interface SmartSub {
  name: string;
  emoji: string;
  note?: string;
}

export const SMART_SUBS: Record<string, Partial<Record<RegionCode | "global", SmartSub>>> = {
  "Ragi (Finger Millet)": {
    US: { name: "Oatmeal", emoji: "🥣", note: "Similar whole-grain energy profile" },
    GB: { name: "Porridge oats", emoji: "🥣" },
    AU: { name: "Weet-Bix", emoji: "🥣", note: "AU whole-grain staple" },
    CA: { name: "Oatmeal", emoji: "🥣" },
    NZ: { name: "Weet-Bix / rolled oats", emoji: "🥣" },
    global: { name: "Rolled oats / whole grain porridge", emoji: "🥣" },
  },
  "Paneer": {
    US: { name: "Cottage cheese", emoji: "🧀" },
    GB: { name: "Cottage cheese", emoji: "🧀" },
    AU: { name: "Ricotta or cottage cheese", emoji: "🧀" },
    CA: { name: "Cottage cheese", emoji: "🧀" },
    NZ: { name: "Cottage cheese", emoji: "🧀" },
    global: { name: "Firm tofu or cottage cheese", emoji: "🧀" },
  },
  "Dahi (Curd)": {
    US: { name: "Greek yogurt", emoji: "🥣" },
    GB: { name: "Natural yogurt", emoji: "🥣" },
    AU: { name: "Plain yogurt", emoji: "🥣" },
    CA: { name: "Plain Greek yogurt", emoji: "🥣" },
    NZ: { name: "Natural yogurt", emoji: "🥣" },
    global: { name: "Plain yogurt", emoji: "🥣" },
  },
  "Amla (Indian Gooseberry)": {
    US: { name: "Kiwi or strawberries", emoji: "🍓", note: "Very high in Vitamin C" },
    GB: { name: "Blackcurrant", emoji: "🫐", note: "UK's highest Vitamin C fruit" },
    AU: { name: "Kiwifruit", emoji: "🥝" },
    CA: { name: "Kiwi or strawberries", emoji: "🥝" },
    NZ: { name: "Kiwifruit", emoji: "🥝" },
    global: { name: "Guava or kiwi", emoji: "🍐" },
  },
  "Jaggery (Gud)": {
    US: { name: "Molasses (small amounts)", emoji: "🍯" },
    GB: { name: "Blackstrap molasses", emoji: "🍯" },
    AU: { name: "Raw / dark sugar (small)", emoji: "🍯" },
    CA: { name: "Maple syrup (minimal)", emoji: "🍁" },
    NZ: { name: "Raw sugar or golden syrup", emoji: "🍯" },
    global: { name: "Molasses or dark sugar", emoji: "🍯" },
  },
  "Drumstick Leaves (Moringa)": {
    US: { name: "Kale or spinach", emoji: "🥬" },
    GB: { name: "Kale or spinach", emoji: "🥬" },
    AU: { name: "Kale or Asian greens", emoji: "🥬" },
    CA: { name: "Kale or spinach", emoji: "🥬" },
    NZ: { name: "Kale or silverbeet", emoji: "🥬" },
    global: { name: "Kale or spinach", emoji: "🥬" },
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNutritionRegion() {
  const regionCode = useMemo<RegionCode>(() => detectNutritionRegion(), []);
  const config = REGION_CONFIGS[regionCode];

  const getRegional = useMemo(
    () => (nutrientId: string, diet: DietFilter = "all") =>
      getRegionalSources(nutrientId, regionCode, diet),
    [regionCode],
  );

  const getSmartSub = useMemo(
    () => (originalFood: string): SmartSub | null =>
      (SMART_SUBS[originalFood]?.[regionCode] ?? SMART_SUBS[originalFood]?.["global"] ?? null),
    [regionCode],
  );

  function localizeNote(note?: string): string | undefined {
    if (!note || regionCode === "IN") return note;
    return note.replace(/ICMR-NIN\s*20\d\d/g, config.authorityShort);
  }

  return { regionCode, config, getRegional, getSmartSub, localizeNote };
}
