/** Curated food & snack lexicon — veg / egg / non-veg tags. */
export interface FoodItem {
  slug: string;
  label: string;
  topic: string;
  diet: "veg" | "egg" | "any";
  mealSlots: Array<"breakfast" | "snack" | "lunch" | "dinner">;
}

export const FOOD_ITEMS: FoodItem[] = [
  { slug: "makhana", label: "roasted makhana", topic: "snacks_crunchy", diet: "veg", mealSlots: ["snack"] },
  { slug: "fruit_chaat", label: "fruit chaat", topic: "snacks_fruit", diet: "veg", mealSlots: ["snack", "breakfast"] },
  { slug: "yogurt_berries", label: "yogurt with berries", topic: "snacks_dairy", diet: "veg", mealSlots: ["snack", "breakfast"] },
  { slug: "boiled_corn", label: "boiled corn cups", topic: "snacks_veg", diet: "veg", mealSlots: ["snack"] },
  { slug: "roasted_chana", label: "roasted chana", topic: "snacks_protein", diet: "veg", mealSlots: ["snack"] },
  { slug: "peanut_laddoo", label: "small peanut laddoo", topic: "snacks_protein", diet: "veg", mealSlots: ["snack"] },
  { slug: "cucumber_sticks", label: "cucumber sticks with hummus", topic: "snacks_veg", diet: "veg", mealSlots: ["snack"] },
  { slug: "carrot_sticks", label: "carrot sticks with dip", topic: "snacks_veg", diet: "veg", mealSlots: ["snack"] },
  { slug: "banana_pancake", label: "mini banana pancakes", topic: "breakfast_sweet", diet: "veg", mealSlots: ["breakfast", "snack"] },
  { slug: "idli", label: "soft idli with chutney", topic: "breakfast_south", diet: "veg", mealSlots: ["breakfast"] },
  { slug: "poha", label: "vegetable poha", topic: "breakfast_west", diet: "veg", mealSlots: ["breakfast"] },
  { slug: "upma", label: "veggie upma", topic: "breakfast_south", diet: "veg", mealSlots: ["breakfast"] },
  { slug: "paratha_roll", label: "mini paratha roll with veggies", topic: "breakfast_north", diet: "veg", mealSlots: ["breakfast", "lunch"] },
  { slug: "moong_dal_cheela", label: "moong dal cheela", topic: "breakfast_protein", diet: "veg", mealSlots: ["breakfast"] },
  { slug: "oats_bowl", label: "warm oats with banana", topic: "breakfast_fiber", diet: "veg", mealSlots: ["breakfast"] },
  { slug: "smoothie_bowl", label: "berry smoothie bowl", topic: "breakfast_fruit", diet: "veg", mealSlots: ["breakfast"] },
  { slug: "sprouts_salad", label: "sprouts salad", topic: "lunch_fiber", diet: "veg", mealSlots: ["lunch", "snack"] },
  { slug: "veggie_pulao", label: "colourful veggie pulao", topic: "lunch_grain", diet: "veg", mealSlots: ["lunch", "dinner"] },
  { slug: "dal_rice", label: "dal chawal with ghee", topic: "lunch_comfort", diet: "veg", mealSlots: ["lunch", "dinner"] },
  { slug: "khichdi", label: "moong khichdi", topic: "dinner_comfort", diet: "veg", mealSlots: ["dinner", "lunch"] },
  { slug: "paneer_tikka", label: "paneer tikka bites", topic: "dinner_protein", diet: "veg", mealSlots: ["dinner", "lunch"] },
  { slug: "palak_paneer", label: "palak paneer with roti", topic: "dinner_iron", diet: "veg", mealSlots: ["dinner"] },
  { slug: "veggie_pasta", label: "whole-wheat veggie pasta", topic: "dinner_wheat", diet: "veg", mealSlots: ["dinner", "lunch"] },
  { slug: "soup_bread", label: "tomato soup with bread", topic: "dinner_warm", diet: "veg", mealSlots: ["dinner"] },
  { slug: "stuffed_paratha", label: "stuffed aloo paratha", topic: "breakfast_north", diet: "veg", mealSlots: ["breakfast", "dinner"] },
  { slug: "dosa", label: "mini masala dosa", topic: "breakfast_south", diet: "veg", mealSlots: ["breakfast", "dinner"] },
  { slug: "uttapam", label: "veggie uttapam", topic: "breakfast_south", diet: "veg", mealSlots: ["breakfast"] },
  { slug: "ragi_porridge", label: "ragi porridge with jaggery", topic: "breakfast_millet", diet: "veg", mealSlots: ["breakfast"] },
  { slug: "besan_chilla", label: "besan chilla with veggies", topic: "breakfast_protein", diet: "veg", mealSlots: ["breakfast", "snack"] },
  { slug: "millet_bowl", label: "millet veggie bowl", topic: "lunch_millet", diet: "veg", mealSlots: ["lunch", "dinner"] },
  { slug: "rajma_rice", label: "rajma with rice", topic: "lunch_protein", diet: "veg", mealSlots: ["lunch", "dinner"] },
  { slug: "chole_bhature_mini", label: "mini chole with bhatura", topic: "lunch_comfort", diet: "veg", mealSlots: ["lunch"] },
  { slug: "veggie_wrap", label: "whole-wheat veggie wrap", topic: "lunch_handheld", diet: "veg", mealSlots: ["lunch", "snack"] },
  { slug: "fruit_popsicle", label: "homemade fruit popsicle", topic: "snacks_fruit", diet: "veg", mealSlots: ["snack"] },
  { slug: "coconut_water", label: "coconut water with fruit plate", topic: "snacks_hydration", diet: "veg", mealSlots: ["snack"] },
  { slug: "dry_fruit_mix", label: "small dry-fruit mix", topic: "snacks_energy", diet: "veg", mealSlots: ["snack"] },
  { slug: "boiled_egg", label: "boiled egg with toast soldiers", topic: "breakfast_protein", diet: "egg", mealSlots: ["breakfast", "snack"] },
  { slug: "egg_bhurji", label: "soft egg bhurji with roti", topic: "breakfast_protein", diet: "egg", mealSlots: ["breakfast", "dinner"] },
  { slug: "omelette_veg", label: "veggie omelette", topic: "breakfast_protein", diet: "egg", mealSlots: ["breakfast"] },
  { slug: "paneer_cubes", label: "paneer cubes with pepper", topic: "snacks_protein", diet: "veg", mealSlots: ["snack"] },
  { slug: "cheese_sandwich", label: "grilled cheese sandwich", topic: "lunch_handheld", diet: "veg", mealSlots: ["lunch", "snack"] },
  { slug: "veggie_fried_rice", label: "veggie fried rice", topic: "lunch_grain", diet: "veg", mealSlots: ["lunch", "dinner"] },
  { slug: "lemon_rice", label: "lemon rice with peanuts", topic: "lunch_south", diet: "veg", mealSlots: ["lunch"] },
  { slug: "curd_rice", label: "curd rice with pickle", topic: "lunch_south", diet: "veg", mealSlots: ["lunch"] },
  { slug: "sabzi_roti", label: "seasonal sabzi with roti", topic: "dinner_comfort", diet: "veg", mealSlots: ["dinner"] },
  { slug: "pumpkin_soup", label: "pumpkin soup", topic: "dinner_warm", diet: "veg", mealSlots: ["dinner"] },
  { slug: "sweet_potato_fries", label: "baked sweet potato fries", topic: "snacks_crunchy", diet: "veg", mealSlots: ["snack"] },
  { slug: "peanut_butter_banana", label: "peanut butter banana bites", topic: "snacks_energy", diet: "veg", mealSlots: ["snack", "breakfast"] },
  { slug: "jowar_roti", label: "jowar roti with ghee", topic: "dinner_millet", diet: "veg", mealSlots: ["dinner"] },
  { slug: "bajra_khichdi", label: "bajra veggie khichdi", topic: "dinner_millet", diet: "veg", mealSlots: ["dinner"] },
  { slug: "fruit_yogurt_pops", label: "frozen fruit-yogurt pops", topic: "snacks_fruit", diet: "veg", mealSlots: ["snack"] },
  { slug: "til_ladoo", label: "til ladoo (small portion)", topic: "snacks_energy", diet: "veg", mealSlots: ["snack"] },
  { slug: "veggie_cutlets", label: "baked veggie cutlets", topic: "snack_handheld", diet: "veg", mealSlots: ["snack", "dinner"] },
];

export const NUTRITION_BODY_TEMPLATES = [
  "Try {item} for {name} — a fresh pick that fits today's rhythm.",
  "{name} might enjoy {item} today — simple, balanced, and kid-friendly.",
  "Snack idea: {item} for {name}. Quick to prep and easy to love.",
  "How about {item} for {name}? A nice change from yesterday's routine.",
  "Fuel {name}'s afternoon with {item} — light, tasty, and nutritious.",
  "Today's nutrition nudge: {item} for {name}. Tap for more meal ideas.",
  "{name} could try {item} — parents tell us kids love the texture.",
  "Mix it up: serve {item} to {name} and see what sticks.",
  "Balanced bite for {name}: {item}. Small portion, big nutrition win.",
  "Meal inspiration — {item} works well for {name} at this age.",
];

export const NUTRITION_TITLE_TEMPLATES = [
  "Snack time idea 🍎",
  "Fresh meal idea for {name} 🥗",
  "Nutrition nudge 🌿",
  "Today's food pick 🍽️",
  "Healthy bite for {name} ✨",
];

export const NUTRITION_INSIGHT_BODIES: Array<{ topic: string; theme: string; body: string }> = [
  { topic: "hydration", theme: "hydration", body: "Offer water before snacks — {name} often eats better when hydrated first." },
  { topic: "colours", theme: "plate_colours", body: "Aim for two colours on {name}'s plate today — eyes eat before mouths do." },
  { topic: "protein_breakfast", theme: "breakfast_protein", body: "Protein at breakfast helps {name} focus through the morning." },
  { topic: "small_portions", theme: "portions", body: "Toddlers do best with small, frequent meals — trust {name}'s hunger cues." },
  { topic: "family_meal", theme: "family_eating", body: "One shared family meal this week can improve {name}'s willingness to try new foods." },
  { topic: "iron", theme: "iron", body: "Pair iron-rich foods with vitamin C for {name} — absorption doubles." },
  { topic: "screen_meals", theme: "mindful_eating", body: "Screen-free meals help {name} notice fullness — even 10 minutes counts." },
  { topic: "new_food", theme: "food_exposure", body: "It can take 10+ tries before {name} accepts a new food — keep offering without pressure." },
];
