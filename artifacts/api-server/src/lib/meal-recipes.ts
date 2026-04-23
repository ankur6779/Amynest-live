// Rule-based recipe + nutrition lookups.
// These are deterministic fallbacks attached to every meal/tiffin block in
// the generated routine so that the UI always has something to display
// without round-tripping to /api/ai/recipe.

export type MealRecipe = {
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  steps: string[];
  tip?: string;
};

export type MealNutrition = {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes?: string;
};

const KEYWORD_RECIPES: Array<{ match: RegExp; recipe: MealRecipe }> = [
  {
    match: /(idli|dosa|uttapam|appam)/i,
    recipe: {
      prepTime: "10 min",
      cookTime: "15 min",
      servings: "1 child",
      ingredients: [
        "1 cup fermented batter",
        "Oil or ghee for cooking",
        "Coconut chutney or sambar to serve",
      ],
      steps: [
        "Heat a non-stick tawa on medium.",
        "Pour batter and cook until golden underneath.",
        "Flip if needed and cook for 1–2 min.",
        "Serve hot with chutney/sambar.",
      ],
      tip: "Add finely grated carrot to the batter to sneak in veggies.",
    },
  },
  {
    match: /(paratha|roti|chapati|phulka|naan|kulcha|bhakri|thepla)/i,
    recipe: {
      prepTime: "15 min",
      cookTime: "10 min",
      servings: "1 child",
      ingredients: [
        "1 small ball whole-wheat dough",
        "Stuffing of choice (aloo / paneer / methi)",
        "Ghee or oil",
      ],
      steps: [
        "Roll the dough into a small disc, place stuffing, seal and roll again.",
        "Cook on a hot tawa, flipping once.",
        "Brush with ghee, cool slightly and serve with curd.",
      ],
      tip: "Cut into small triangles for easier kid grip.",
    },
  },
  {
    match: /(rice|pulao|biryani|khichdi|khichuri|bhaat)/i,
    recipe: {
      prepTime: "10 min",
      cookTime: "20 min",
      servings: "1 child",
      ingredients: [
        "1/2 cup rice",
        "1/4 cup mixed veg or dal/protein",
        "Salt, turmeric, mild spices",
        "1 tsp ghee",
      ],
      steps: [
        "Wash rice and pressure-cook with veg/dal and 1.5 cups water for 2 whistles.",
        "Temper with cumin and ghee.",
        "Mix gently and serve warm with curd.",
      ],
      tip: "One-pot meals are perfect for fussy eaters — easy to portion.",
    },
  },
  {
    match: /(omelette|bhurji|scrambled|egg)/i,
    recipe: {
      prepTime: "5 min",
      cookTime: "5 min",
      servings: "1 child",
      ingredients: [
        "1 egg",
        "1 tbsp chopped onion + tomato",
        "Pinch of salt and pepper",
        "1 tsp oil/butter",
      ],
      steps: [
        "Whisk egg with veggies and seasoning.",
        "Cook on a non-stick pan, folding gently.",
        "Serve warm with toast or paratha.",
      ],
      tip: "Add a sprinkle of cheese for picky eaters.",
    },
  },
  {
    match: /(sandwich|toast|wrap|frankie|roll)/i,
    recipe: {
      prepTime: "5 min",
      cookTime: "5 min",
      servings: "1 child",
      ingredients: [
        "2 slices whole-wheat bread or 1 wrap",
        "Filling: cheese, paneer, egg, or veggies",
        "Butter or chutney",
      ],
      steps: [
        "Spread butter/chutney on bread or wrap.",
        "Add filling, fold/close.",
        "Toast lightly until golden.",
      ],
      tip: "Cut into fun shapes — kids eat more when food looks playful.",
    },
  },
  {
    match: /(curry|sabzi|stew|masala|kosha|jhol|kurma|saar|amti)/i,
    recipe: {
      prepTime: "10 min",
      cookTime: "20 min",
      servings: "1 child",
      ingredients: [
        "1/2 cup main veg/protein",
        "1 small onion, 1 tomato, ginger-garlic",
        "Mild spices, salt",
        "1 tsp oil/ghee",
      ],
      steps: [
        "Sauté onion, ginger-garlic, then tomato until soft.",
        "Add main ingredient and spices, cook 8–10 min with a splash of water.",
        "Finish with a pinch of garam masala. Serve with rice/roti.",
      ],
      tip: "Keep spice gentle — chilli powder can be served on the side for adults.",
    },
  },
  {
    match: /(soup|daliya|porridge|oats)/i,
    recipe: {
      prepTime: "5 min",
      cookTime: "15 min",
      servings: "1 child",
      ingredients: [
        "1/4 cup oats / daliya",
        "1 cup milk or water",
        "Veggies / banana / dates",
        "Pinch of salt or jaggery",
      ],
      steps: [
        "Bring liquid to a boil.",
        "Add oats/daliya and stir 5–7 min until thick.",
        "Top with banana / berries / nuts and serve warm.",
      ],
      tip: "A spoon of nut butter makes it more filling for active kids.",
    },
  },
  {
    match: /(fruit|salad|smoothie|chaat|bowl)/i,
    recipe: {
      prepTime: "5 min",
      cookTime: "0 min",
      servings: "1 child",
      ingredients: [
        "1 cup chopped fruit / sprouts / veg",
        "1/4 cup curd or milk (for smoothie)",
        "Lemon, chaat masala or honey",
      ],
      steps: [
        "Chop and mix all ingredients in a bowl.",
        "Squeeze lime / sprinkle chaat masala.",
        "Serve immediately for best taste.",
      ],
      tip: "Use a colourful mix — kids eat with their eyes first.",
    },
  },
];

const KEYWORD_NUTRITION: Array<{ match: RegExp; nutrition: MealNutrition }> = [
  {
    match: /(biryani|pulao|rice|khichdi|bhaat)/i,
    nutrition: {
      calories: "320–380 kcal",
      protein: "10 g",
      carbs: "55 g",
      fat: "8 g",
      notes: "Filling complex carbs; pair with curd for a complete meal.",
    },
  },
  {
    match: /(paratha|roti|chapati|naan|kulcha|bhakri|thepla|poori|luchi)/i,
    nutrition: {
      calories: "280–340 kcal",
      protein: "9 g",
      carbs: "40 g",
      fat: "10 g",
      notes: "Whole-grain energy; balance with a vegetable side.",
    },
  },
  {
    match: /(idli|dosa|uttapam|appam|upma|poha)/i,
    nutrition: {
      calories: "220–280 kcal",
      protein: "7 g",
      carbs: "38 g",
      fat: "6 g",
      notes: "Fermented = gut-friendly. Add chutney for healthy fats.",
    },
  },
  {
    match: /(egg|omelette|bhurji|anda|dim)/i,
    nutrition: {
      calories: "180–230 kcal",
      protein: "12 g",
      carbs: "12 g",
      fat: "11 g",
      notes: "High-quality protein, choline for brain development.",
    },
  },
  {
    match: /(chicken|mutton|fish|prawn|keema|kebab|kosha|murgh)/i,
    nutrition: {
      calories: "300–360 kcal",
      protein: "22 g",
      carbs: "18 g",
      fat: "14 g",
      notes: "Lean protein supports muscle growth and iron levels.",
    },
  },
  {
    match: /(sandwich|toast|wrap|roll|frankie|burger)/i,
    nutrition: {
      calories: "260–320 kcal",
      protein: "10 g",
      carbs: "34 g",
      fat: "10 g",
      notes: "Portable, balanced — great tiffin/drunch option.",
    },
  },
  {
    match: /(soup|stew|daliya|porridge|oats)/i,
    nutrition: {
      calories: "180–240 kcal",
      protein: "8 g",
      carbs: "28 g",
      fat: "5 g",
      notes: "Light, easy to digest — ideal before bed.",
    },
  },
  {
    match: /(fruit|salad|smoothie|chaat|sprouts|bowl)/i,
    nutrition: {
      calories: "150–200 kcal",
      protein: "5 g",
      carbs: "28 g",
      fat: "3 g",
      notes: "Vitamins, fibre, hydration — perfect snack/drunch.",
    },
  },
  {
    match: /(curry|sabzi|dal|amti|saar|kurma|jhol|stew|masala)/i,
    nutrition: {
      calories: "220–280 kcal",
      protein: "11 g",
      carbs: "26 g",
      fat: "9 g",
      notes: "Plant protein + micronutrients; pair with grain.",
    },
  },
];

const DEFAULT_RECIPE: MealRecipe = {
  prepTime: "10 min",
  cookTime: "15 min",
  servings: "1 child",
  ingredients: [
    "Fresh seasonal ingredients",
    "Mild spices and salt to taste",
    "1 tsp oil or ghee",
  ],
  steps: [
    "Wash and chop ingredients.",
    "Cook on low–medium heat until tender.",
    "Season lightly and serve warm.",
  ],
  tip: "Involve the child in plating — it boosts willingness to eat.",
};

const DEFAULT_NUTRITION: MealNutrition = {
  calories: "200–280 kcal",
  protein: "9 g",
  carbs: "30 g",
  fat: "8 g",
  notes: "Balanced, age-appropriate portion.",
};

function firstOption(meal: string): string {
  // "Idli with sambar | Upma with chutney" → "Idli with sambar"
  return (meal.split("|")[0] ?? meal).trim();
}

export function recipeFor(meal: string): MealRecipe {
  const name = firstOption(meal);
  for (const entry of KEYWORD_RECIPES) {
    if (entry.match.test(name)) return entry.recipe;
  }
  return DEFAULT_RECIPE;
}

export function nutritionFor(meal: string): MealNutrition {
  const name = firstOption(meal);
  for (const entry of KEYWORD_NUTRITION) {
    if (entry.match.test(name)) return entry.nutrition;
  }
  return DEFAULT_NUTRITION;
}
