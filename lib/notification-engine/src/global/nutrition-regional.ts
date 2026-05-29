import type { CulturalRegion } from "../locales.js";

export interface RegionalFoodItem {
  slug: string;
  label: string;
  topic: string;
  diet: "veg" | "egg" | "any";
  regions: CulturalRegion[];
}

/** Region-tagged foods — merged with India-default pool at runtime. */
export const REGIONAL_FOOD_ITEMS: RegionalFoodItem[] = [
  // North America
  { slug: "yogurt_berries_us", label: "Greek yogurt with berries", topic: "snacks_dairy", diet: "veg", regions: ["north_america", "oceania"] },
  { slug: "trail_mix", label: "homemade trail mix", topic: "snacks_energy", diet: "veg", regions: ["north_america", "europe", "oceania"] },
  { slug: "pb_banana_us", label: "peanut butter banana slices", topic: "snacks_protein", diet: "veg", regions: ["north_america"] },
  { slug: "turkey_roll_us", label: "turkey and cheese roll-up", topic: "lunch_handheld", diet: "any", regions: ["north_america"] },
  // UK / Europe
  { slug: "beans_toast", label: "beans on toast", topic: "breakfast_comfort", diet: "veg", regions: ["europe"] },
  { slug: "porridge_uk", label: "porridge with honey", topic: "breakfast_fiber", diet: "veg", regions: ["europe"] },
  // Japan / East Asia
  { slug: "onigiri", label: "onigiri with salmon", topic: "snacks_rice", diet: "any", regions: ["east_asia"] },
  { slug: "miso_soup", label: "miso soup with tofu", topic: "dinner_warm", diet: "veg", regions: ["east_asia"] },
  { slug: "fruit_plate_jp", label: "seasonal fruit plate", topic: "snacks_fruit", diet: "veg", regions: ["east_asia"] },
  { slug: "kimchi_rice", label: "vegetable bibimbap bowl", topic: "lunch_grain", diet: "veg", regions: ["east_asia"] },
  // Middle East
  { slug: "dates_laban", label: "dates with laban", topic: "snacks_tradition", diet: "veg", regions: ["middle_east"] },
  { slug: "hummus_pita", label: "hummus with pita", topic: "snacks_protein", diet: "veg", regions: ["middle_east"] },
  { slug: "falafel_wrap", label: "falafel wrap", topic: "lunch_handheld", diet: "veg", regions: ["middle_east"] },
  // Latin America
  { slug: "arepa", label: "cheese arepa", topic: "breakfast_comfort", diet: "veg", regions: ["latin_america"] },
  { slug: "fruit_smoothie_br", label: "tropical fruit smoothie", topic: "snacks_fruit", diet: "veg", regions: ["latin_america"] },
  // Southeast Asia
  { slug: "nasi_goreng", label: "vegetable fried rice", topic: "lunch_grain", diet: "veg", regions: ["southeast_asia"] },
  { slug: "mango_sticky", label: "mango with sticky rice", topic: "snacks_fruit", diet: "veg", regions: ["southeast_asia"] },
];

export function regionalFoodsFor(culturalRegion: CulturalRegion): RegionalFoodItem[] {
  return REGIONAL_FOOD_ITEMS.filter((f) => f.regions.includes(culturalRegion));
}
