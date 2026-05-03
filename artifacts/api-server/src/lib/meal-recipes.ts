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

// Loose region key. We don't import the `Region` union from
// routine-templates.ts to avoid a circular dependency — meal-recipes.ts is
// imported BY routine-templates.ts. Unknown regions simply skip the
// region-specific bank and fall through to the keyword matchers.
type RegionKey = string;

const KEYWORD_RECIPES: Array<{ match: RegExp; recipe: MealRecipe }> = [
  {
    match: /(poha|aval|chivda|beaten.rice|flattened.rice)/i,
    recipe: {
      prepTime: "5 min",
      cookTime: "10 min",
      servings: "1 child",
      ingredients: [
        "1 cup thick poha (flattened rice), rinsed",
        "1 small onion, finely chopped",
        "1 small potato, boiled & cubed (optional)",
        "1 tsp mustard seeds",
        "8–10 curry leaves",
        "1/4 tsp turmeric",
        "Salt, lemon juice",
        "1 tsp oil",
        "Fresh coriander & peanuts to garnish",
      ],
      steps: [
        "Rinse poha under water, drain well and set aside for 5 min.",
        "Heat oil, add mustard seeds and let them splutter.",
        "Add curry leaves, onion and potato. Sauté 3–4 min.",
        "Add turmeric and poha. Mix gently so poha doesn't break.",
        "Cook 2 min on low heat. Add salt and a squeeze of lemon.",
        "Garnish with coriander and peanuts. Serve warm.",
      ],
      tip: "Don't over-rinse the poha — it should be moist but not soggy.",
    },
  },
  {
    match: /(upma|sooji.*upma|rava.*upma|semolina.*upma)/i,
    recipe: {
      prepTime: "5 min",
      cookTime: "15 min",
      servings: "1 child",
      ingredients: [
        "1/2 cup semolina (sooji/rava), dry roasted",
        "1 cup water",
        "1 small onion, chopped",
        "1/4 cup mixed veggies (peas, carrot)",
        "1 tsp mustard seeds, 1/2 tsp urad dal",
        "8–10 curry leaves",
        "Salt, lemon juice",
        "1 tsp oil or ghee",
      ],
      steps: [
        "Dry roast sooji in a pan on medium heat for 2–3 min until light golden. Set aside.",
        "Heat oil, add mustard seeds and let them pop. Add urad dal and curry leaves.",
        "Add onion, sauté 2 min. Add veggies and cook 3 min.",
        "Pour 1 cup water and bring to a boil. Add salt.",
        "Slowly stir in roasted sooji. Mix continuously to avoid lumps.",
        "Cook on low heat for 3 min, stirring. Add lemon juice and serve hot.",
      ],
      tip: "Add a pinch of grated carrot or peas to sneak in vegetables.",
    },
  },
  {
    match: /(pav.bhaji|pav bhaji|bhaji.pav)/i,
    recipe: {
      prepTime: "10 min",
      cookTime: "20 min",
      servings: "1–2 children",
      ingredients: [
        "2 medium potatoes, boiled & mashed",
        "1/2 cup mixed veggies (cauliflower, peas, carrot), boiled",
        "1 tbsp pav bhaji masala",
        "1 small onion + tomato, finely chopped",
        "1 tbsp butter",
        "Salt, lemon juice",
        "2 pav (dinner rolls)",
      ],
      steps: [
        "Heat butter in a pan. Sauté onion until soft, then add tomato.",
        "Add pav bhaji masala and cook until oil separates.",
        "Add all mashed vegetables, mix well and mash together.",
        "Simmer on low heat 5 min. Adjust salt and add lemon juice.",
        "Toast pav with butter on a griddle until golden.",
        "Serve bhaji hot with pav, diced onion, and a lemon wedge.",
      ],
      tip: "Make the bhaji slightly less spicy for young children — add a dollop of butter to mellow the heat.",
    },
  },
  {
    match: /(chole|chhole|chana|chickpea)/i,
    recipe: {
      prepTime: "5 min",
      cookTime: "15 min",
      servings: "1–2 children",
      ingredients: [
        "1 cup cooked/canned chickpeas",
        "1 small onion, 1 tomato, chopped",
        "1/2 tsp chana masala or chole masala",
        "1/4 tsp turmeric, cumin seeds",
        "Salt, lemon juice",
        "1 tsp oil",
      ],
      steps: [
        "Heat oil, add cumin seeds. Add onion and cook until golden.",
        "Add tomato and spices. Cook until masala is thick.",
        "Add chickpeas with a splash of water. Mash a few chickpeas to thicken the gravy.",
        "Simmer 8–10 min. Add lemon juice. Serve with puri or rice.",
      ],
      tip: "Chickpeas are a protein powerhouse — great for active school-going kids.",
    },
  },
  {
    match: /(banana.*milk|milk.*banana|cornflakes|cereal.*milk|muesli|granola)/i,
    recipe: {
      prepTime: "3 min",
      cookTime: "0 min",
      servings: "1 child",
      ingredients: [
        "1 cup cold milk (or warm milk for winter)",
        "1 banana, sliced",
        "1/2 cup cereal / cornflakes / muesli",
        "1 tsp honey or jaggery (optional)",
        "A pinch of cinnamon (optional)",
      ],
      steps: [
        "Pour chilled or warm milk into a bowl.",
        "Add cereal or cornflakes — don't pre-soak to keep them crunchy.",
        "Top with sliced banana and drizzle honey if using.",
        "Sprinkle cinnamon for flavour. Serve immediately.",
      ],
      tip: "A no-cook breakfast that's ready in under 3 minutes — ideal for rushed school mornings.",
    },
  },
  {
    match: /(vada|medu.vada|wada|vada.sambar)/i,
    recipe: {
      prepTime: "10 min",
      cookTime: "15 min",
      servings: "1 child (2 vadas)",
      ingredients: [
        "1/2 cup urad dal (soaked overnight, drained)",
        "1 tsp ginger, finely chopped",
        "1/4 tsp cumin seeds",
        "Salt to taste",
        "Oil for frying",
        "Sambar and coconut chutney to serve",
      ],
      steps: [
        "Grind soaked urad dal with ginger and cumin to a thick batter. Add salt.",
        "Wet your hands, take a small ball of batter and flatten it into a ring.",
        "Deep fry in hot oil on medium heat until golden on both sides.",
        "Drain on paper towels.",
        "Serve hot with sambar and coconut chutney.",
      ],
      tip: "Kids love dipping vada in sambar — it's a fun way to get them to eat dal.",
    },
  },
  {
    match: /(dhokla|khaman)/i,
    recipe: {
      prepTime: "10 min",
      cookTime: "15 min",
      servings: "1–2 children",
      ingredients: [
        "1 cup besan (chickpea flour)",
        "1/2 cup curd",
        "1 tsp Eno fruit salt or baking soda",
        "1/2 tsp ginger-green chilli paste",
        "Salt, sugar, lemon juice",
        "Mustard seeds, curry leaves for tempering",
      ],
      steps: [
        "Mix besan, curd, ginger paste, salt and lemon juice into a smooth batter.",
        "Add Eno and mix quickly. Pour into a greased steaming tray.",
        "Steam for 12–15 min until a toothpick comes out clean.",
        "Temper mustard seeds and curry leaves in oil. Pour over dhokla.",
        "Cut into squares. Serve with green chutney.",
      ],
      tip: "Steamed and light — dhokla is a perfect after-school snack high in protein.",
    },
  },
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

// ─── Region-specific recipe + nutrition banks ─────────────────────────────────
// These are checked BEFORE the keyword bank when a region is supplied, so a
// dish like "Macher jhol" returns a Bengali fish-curry recipe instead of the
// generic curry template, and "Pongal" returns a South-Indian rice-lentil
// recipe instead of the generic rice template.

const REGIONAL_RECIPES: Record<string, Array<{ match: RegExp; recipe: MealRecipe }>> = {
  bengali: [
    {
      match: /macher jhol|maach.*jhol|fish.*jhol|pabda.*jhol/i,
      recipe: {
        prepTime: "10 min",
        cookTime: "20 min",
        servings: "1 child",
        ingredients: [
          "2 small pieces rohu / pabda fish (deboned for kids)",
          "1 small potato + 1 tomato, cubed",
          "1/2 tsp turmeric, pinch of red chilli",
          "1 tsp panch phoron, 1 tsp mustard oil",
          "Salt to taste",
        ],
        steps: [
          "Marinate fish with turmeric and salt; lightly fry both sides.",
          "Heat mustard oil, temper with panch phoron, add potato and tomato.",
          "Add 1 cup water, turmeric and salt; simmer 6–8 min.",
          "Slip in the fish, simmer 4 min. Serve with steamed rice.",
        ],
        tip: "Debone carefully and run a finger through every spoonful before feeding the child.",
      },
    },
    {
      match: /kosha mangsho|kosha.*mutton/i,
      recipe: {
        prepTime: "20 min",
        cookTime: "45 min",
        servings: "1 child",
        ingredients: [
          "100 g tender mutton, cut small",
          "1 onion (sliced), 1 tsp ginger-garlic paste",
          "2 tbsp curd, 1 tsp Bengali garam masala",
          "1 tsp mustard oil + 1 tsp ghee",
          "Pinch of sugar, salt to taste",
        ],
        steps: [
          "Marinate mutton in curd, ginger-garlic and salt for 30 min.",
          "Heat oil + ghee, caramelise onion with a pinch of sugar.",
          "Add mutton, cook on low heat stirring often (kosha) for 25 min.",
          "Add 1/2 cup hot water, simmer until tender. Finish with garam masala.",
        ],
        tip: "Serve a small portion with luchi or steamed rice — the gravy is rich.",
      },
    },
    {
      match: /aloo posto|posto/i,
      recipe: {
        prepTime: "10 min",
        cookTime: "15 min",
        servings: "1 child",
        ingredients: [
          "1 medium potato, cubed small",
          "2 tbsp poppy seed (posto) paste",
          "1 green chilli (mild, optional)",
          "1 tsp mustard oil, salt to taste",
        ],
        steps: [
          "Heat mustard oil, add potato cubes and a pinch of salt.",
          "Cook covered on low heat 8–10 min until tender.",
          "Stir in posto paste with 2 tbsp water; cook 3–4 min until creamy.",
          "Serve warm with steamed rice and a drizzle of mustard oil.",
        ],
        tip: "Soak poppy seeds in warm water for 10 min before grinding for a smoother paste.",
      },
    },
    {
      match: /luchi/i,
      recipe: {
        prepTime: "15 min",
        cookTime: "10 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup maida (refined flour)",
          "1 tsp ghee, pinch of salt",
          "Warm water to knead",
          "Oil for deep-frying",
        ],
        steps: [
          "Knead a soft, smooth dough with maida, ghee, salt and water; rest 15 min.",
          "Roll into small 3-inch discs, keeping them lightly oiled.",
          "Deep-fry in hot oil, pressing gently so they puff into pillowy luchis.",
          "Drain on tissue and serve hot with cholar dal or aloor dom.",
        ],
        tip: "Oil must be hot enough that the luchi puffs in 3 seconds — test with a tiny dough ball first.",
      },
    },
    {
      match: /cholar dal/i,
      recipe: {
        prepTime: "10 min",
        cookTime: "20 min",
        servings: "1 child",
        ingredients: [
          "1/4 cup chana dal (soaked 30 min)",
          "1 tbsp grated coconut",
          "2 raisins, 1 bay leaf, 1/2 tsp cumin",
          "1 tsp ghee, pinch of sugar, salt",
        ],
        steps: [
          "Pressure-cook soaked chana dal with turmeric and salt for 3 whistles.",
          "Heat ghee, splutter cumin and bay leaf; add coconut and raisins.",
          "Pour over the cooked dal; add a pinch of sugar and simmer 3 min.",
          "Serve with luchi or steamed rice.",
        ],
        tip: "The coconut + raisin tempering is what makes this dal distinctly Bengali.",
      },
    },
    {
      match: /singara/i,
      recipe: {
        prepTime: "20 min",
        cookTime: "15 min",
        servings: "1 child (2 pieces)",
        ingredients: [
          "1/2 cup maida + 1 tsp ghee for the shell",
          "1 small potato (cubed) + 2 tbsp peanuts",
          "1/4 tsp panch phoron, pinch of sugar",
          "Oil for frying, salt to taste",
        ],
        steps: [
          "Knead a stiff maida-ghee-salt dough; rest 15 min.",
          "Sauté panch phoron, add potato + peanuts + salt; cook till soft. Cool the filling.",
          "Roll dough into small ovals, cut in halves, shape cones, fill and seal.",
          "Deep-fry on low-medium heat until crisp and golden. Serve with chutney.",
        ],
        tip: "Bengali singaras are smaller and crisper than Punjabi samosas — keep oil low for a flaky shell.",
      },
    },
  ],
  gujarati: [
    {
      match: /khaman dhokla|dhokla/i,
      recipe: {
        prepTime: "10 min",
        cookTime: "15 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup besan (gram flour)",
          "1/4 cup curd, 1/2 tsp eno fruit salt",
          "1/2 tsp ginger-chilli paste, pinch of turmeric",
          "1 tsp oil, mustard seeds, curry leaves for tempering",
          "1 tsp sugar, salt to taste",
        ],
        steps: [
          "Whisk besan, curd, ginger paste, turmeric, salt and a little water to a smooth batter.",
          "Add eno, mix gently and pour into a greased steamer plate.",
          "Steam 12–15 min until a toothpick comes out clean. Cool slightly and cut into squares.",
          "Heat oil, splutter mustard + curry leaves + sugar in 2 tbsp water; pour over.",
        ],
        tip: "Add eno only just before steaming — that's what gives dhokla its airy sponge.",
      },
    },
    {
      match: /thepla|methi.*thepla/i,
      recipe: {
        prepTime: "15 min",
        cookTime: "10 min",
        servings: "1 child (2 theplas)",
        ingredients: [
          "1/2 cup whole-wheat flour",
          "2 tbsp chopped fresh methi (fenugreek leaves)",
          "1 tbsp curd, 1 tsp oil",
          "Pinch of turmeric, ajwain, salt",
        ],
        steps: [
          "Mix flour, methi, curd, oil and spices. Knead a soft dough with a little water.",
          "Divide into balls, roll thin with a dusting of flour.",
          "Cook on a hot tawa with a little oil/ghee until brown spots appear on both sides.",
          "Serve warm with curd and pickle, or pack for tiffin (stays soft for hours).",
        ],
        tip: "Theplas keep well for a day — the perfect travel/tiffin food.",
      },
    },
    {
      match: /khandvi/i,
      recipe: {
        prepTime: "10 min",
        cookTime: "15 min",
        servings: "1 child",
        ingredients: [
          "1/4 cup besan, 1/2 cup curd + 1/2 cup water",
          "Pinch of turmeric, ginger-chilli paste",
          "1 tsp oil, mustard seeds, sesame, curry leaves",
          "1 tbsp grated fresh coconut",
        ],
        steps: [
          "Whisk besan with curd, water, turmeric and salt — strain to remove lumps.",
          "Cook on low heat stirring constantly until thick (5–7 min).",
          "Spread thinly on the back of a steel plate; cool, then cut into strips and roll up.",
          "Temper with mustard, sesame and curry leaves; sprinkle coconut and serve.",
        ],
        tip: "The cook-and-spread step is the trick — keep stirring so it doesn't lump.",
      },
    },
    {
      match: /undhiyu/i,
      recipe: {
        prepTime: "20 min",
        cookTime: "30 min",
        servings: "1 child",
        ingredients: [
          "Mixed winter veg (sweet potato, surti papdi, baby brinjal, raw banana) — 1 cup chopped",
          "2 tbsp methi-besan muthia (small dumplings)",
          "1 tbsp coconut + coriander + green chilli paste",
          "1 tbsp oil, pinch of ajwain, salt to taste",
        ],
        steps: [
          "Stuff brinjal and banana with the green coconut paste.",
          "Heat oil, add ajwain and all veggies + remaining paste; mix gently.",
          "Cover and cook on low heat 20 min, stirring carefully so veg stay whole.",
          "Add muthia in the last 8 min. Serve with poori or rotli.",
        ],
        tip: "A festive Surti dish — even a small portion gives kids 5+ vegetables in one bowl.",
      },
    },
    {
      match: /handvo/i,
      recipe: {
        prepTime: "10 min (after fermenting batter overnight)",
        cookTime: "30 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup mixed dal-rice batter (idli batter works in a pinch)",
          "1/4 cup grated bottle gourd / carrot",
          "1 tsp ginger-chilli paste, pinch of turmeric",
          "1 tsp oil + mustard + sesame for tempering",
          "Salt to taste",
        ],
        steps: [
          "Mix batter with grated veg, ginger paste, turmeric and salt.",
          "Heat oil in a small pan, splutter mustard and sesame seeds.",
          "Pour the batter, cover and cook on low heat 12–15 min until base is golden.",
          "Flip carefully and cook another 10 min. Cut into wedges and serve with chutney.",
        ],
        tip: "Sneak in a fistful of grated veg — handvo's flavour hides them perfectly.",
      },
    },
    {
      match: /fafda/i,
      recipe: {
        prepTime: "15 min",
        cookTime: "10 min",
        servings: "1 child (snack portion)",
        ingredients: [
          "1/2 cup besan",
          "Pinch of papad khar (or 1/4 tsp baking soda)",
          "1 tsp oil + pinch of turmeric + ajwain",
          "Oil for deep-frying, salt to taste",
        ],
        steps: [
          "Knead a stiff dough with besan, khar, oil, turmeric, ajwain and salt.",
          "Press out long thin strips on an oiled board (use a flat scraper).",
          "Slide strips into hot oil, fry till crisp and pale gold.",
          "Drain and serve with kadhi-chutney or papaya sambharo.",
        ],
        tip: "A weekend Gujarati breakfast classic — pair with jalebi for the full experience.",
      },
    },
    {
      match: /bajra rotla|bajra.*rotla|rotla/i,
      recipe: {
        prepTime: "10 min",
        cookTime: "15 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup bajra flour",
          "Warm water to knead",
          "Pinch of salt, ghee to brush",
        ],
        steps: [
          "Knead bajra flour with warm water and salt into a soft dough.",
          "Pat into a small thick disc with wet palms (don't roll — bajra cracks).",
          "Cook on a hot tawa, flipping once, then puff over open flame.",
          "Brush with ghee or jaggery and serve with shaak or curd.",
        ],
        tip: "Pat with wet palms — that's the only way bajra rotla holds together.",
      },
    },
  ],
  maharashtrian: [
    {
      match: /misal pav|misal/i,
      recipe: {
        prepTime: "10 min (sprouts soaked overnight)",
        cookTime: "20 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup sprouted matki (moth bean)",
          "1 small onion, 1 tomato, 1 tbsp goda masala (mild for kids)",
          "1 tsp oil + 1 bay leaf",
          "Garnish: chopped onion, sev, lemon, coriander",
          "1 small pav (bun)",
        ],
        steps: [
          "Pressure-cook sprouts with salt and turmeric for 2 whistles.",
          "Sauté onion + tomato in oil, add goda masala, then the cooked sprouts and 1 cup water.",
          "Simmer 8–10 min into a thick usal-rassa.",
          "Serve in a bowl topped with onion, sev and lemon, with toasted pav alongside.",
        ],
        tip: "Keep the spice mild for kids — adults can sprinkle extra red chilli on top.",
      },
    },
    {
      match: /vada pav/i,
      recipe: {
        prepTime: "15 min",
        cookTime: "10 min",
        servings: "1 child",
        ingredients: [
          "1 small boiled potato, mashed",
          "1/2 tsp ginger-garlic paste, 1/4 tsp mustard, curry leaves",
          "1/4 cup besan + pinch of turmeric for the batter",
          "1 small pav, green chutney to spread",
          "Oil for frying, salt to taste",
        ],
        steps: [
          "Temper mustard + curry leaves + ginger-garlic; mix into mashed potato with salt.",
          "Shape into a small ball, dip in besan batter, deep-fry until golden.",
          "Slit the pav, spread chutney on both sides, place vada inside.",
          "Serve warm with extra chutney and a wedge of lemon.",
        ],
        tip: "Mumbai's iconic snack — cool the vada slightly before assembling so the pav doesn't go soggy.",
      },
    },
    {
      match: /sabudana khichdi|sabudana/i,
      recipe: {
        prepTime: "10 min (after soaking sago 4h)",
        cookTime: "10 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup sabudana (sago), soaked and drained",
          "1 small boiled potato, cubed",
          "2 tbsp roasted peanut powder",
          "1 tsp ghee + cumin + curry leaves",
          "Salt + a squeeze of lemon",
        ],
        steps: [
          "Heat ghee, splutter cumin, add curry leaves and potato cubes.",
          "Add drained sabudana, peanut powder and salt; mix gently.",
          "Cook on low heat 5 min until pearls turn translucent.",
          "Finish with lemon juice and coriander. Serve warm.",
        ],
        tip: "Soak sabudana till each pearl is squishable — that's the only way it cooks fluffy, not gummy.",
      },
    },
    {
      match: /varan|varan.bhaat/i,
      recipe: {
        prepTime: "5 min",
        cookTime: "20 min",
        servings: "1 child",
        ingredients: [
          "1/4 cup tuvar dal",
          "Pinch of turmeric + asafoetida",
          "1 tsp ghee, salt to taste",
          "1/2 cup steamed rice to serve",
          "Lemon wedge",
        ],
        steps: [
          "Pressure-cook tuvar dal with turmeric, asafoetida and salt for 3 whistles; mash smooth.",
          "Bring to a gentle simmer with a little water until soup-like.",
          "Pour over warm steamed rice with a spoon of ghee on top.",
          "Squeeze lemon and mix at the table.",
        ],
        tip: "Maharashtra's everyday comfort meal — pair with a small papad and lime pickle.",
      },
    },
    {
      match: /pithla/i,
      recipe: {
        prepTime: "5 min",
        cookTime: "15 min",
        servings: "1 child",
        ingredients: [
          "1/4 cup besan",
          "1 small onion, 1 green chilli (mild)",
          "1 tsp oil, mustard, cumin, turmeric, asafoetida",
          "1 cup water, salt to taste",
        ],
        steps: [
          "Heat oil, splutter mustard + cumin + asafoetida, sauté onion till soft.",
          "Whisk besan in water with turmeric and salt; pour into pan slowly.",
          "Stir constantly on low heat 6–8 min until thick and creamy.",
          "Serve hot with bhakri or steamed rice.",
        ],
        tip: "A 15-minute farmer's meal — the constant stirring is what keeps it lump-free.",
      },
    },
    {
      match: /thalipeeth/i,
      recipe: {
        prepTime: "15 min",
        cookTime: "10 min",
        servings: "1 child (2 thalipeeth)",
        ingredients: [
          "1/2 cup mixed-grain flour (jowar + bajra + besan + wheat)",
          "1 tbsp grated onion + chopped coriander",
          "Pinch of turmeric, ajwain, salt",
          "1 tsp oil per piece",
        ],
        steps: [
          "Mix flours, onion, coriander, spices and salt with water to a soft dough.",
          "Pat directly on a greased tawa with wet palms into a 5-inch disc.",
          "Make a small hole in the centre; drizzle oil and cover-cook 3 min per side.",
          "Serve hot with curd and a knob of butter.",
        ],
        tip: "Patted (not rolled) on the tawa — the multigrain dough is too crumbly to roll.",
      },
    },
    {
      match: /poha|kanda poha/i,
      recipe: {
        prepTime: "5 min",
        cookTime: "10 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup thick poha (rinsed and drained)",
          "1 small onion, finely chopped",
          "1 tbsp peanuts, 1 tsp mustard seeds + curry leaves",
          "Pinch of turmeric, sugar, salt",
          "1 tsp oil + lemon to finish",
        ],
        steps: [
          "Heat oil, splutter mustard, fry peanuts, add curry leaves and onion.",
          "Sauté onion till translucent, add turmeric, sugar and salt.",
          "Toss in rinsed poha, mix gently and cover-cook 2 min.",
          "Finish with lemon juice and coriander.",
        ],
        tip: "Rinse poha briefly — too much water and it turns mushy.",
      },
    },
  ],
  south_indian: [
    {
      match: /pongal|ven pongal/i,
      recipe: {
        prepTime: "5 min",
        cookTime: "20 min",
        servings: "1 child",
        ingredients: [
          "1/4 cup raw rice + 2 tbsp moong dal",
          "1 tsp ghee + 1/2 tsp cumin + 1/2 tsp pepper",
          "1 tbsp cashew (broken), curry leaves, ginger",
          "Salt to taste",
        ],
        steps: [
          "Dry-roast moong dal till fragrant; rinse with rice.",
          "Pressure-cook rice + dal with 2 cups water and salt for 3 whistles. Mash slightly.",
          "Heat ghee, splutter cumin, pepper, cashew, ginger and curry leaves.",
          "Pour the tempering into pongal, mix and serve with coconut chutney.",
        ],
        tip: "Soft, mushy texture is ideal — perfect for tiny mouths and easy digestion.",
      },
    },
    {
      match: /sambar rice|sambar.bhath|sambar bath/i,
      recipe: {
        prepTime: "10 min",
        cookTime: "25 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup cooked rice",
          "1/4 cup tuvar dal (pressure-cooked)",
          "1/4 cup chopped veg (drumstick, pumpkin, brinjal)",
          "1 tsp sambar powder + tamarind pulp + jaggery",
          "1 tsp ghee + mustard + curry leaves for tempering",
        ],
        steps: [
          "Boil chopped veg with tamarind, sambar powder, salt and jaggery 8 min.",
          "Add mashed dal and a cup of water; simmer 5 min into sambar.",
          "Mix sambar generously into the cooked rice.",
          "Top with ghee tempering of mustard and curry leaves. Serve with papad.",
        ],
        tip: "Tamil-Brahmin staple — always finish with a spoon of ghee on top.",
      },
    },
    {
      match: /bisi bele bath|bisi.bele/i,
      recipe: {
        prepTime: "10 min",
        cookTime: "30 min",
        servings: "1 child",
        ingredients: [
          "1/4 cup rice + 2 tbsp tuvar dal",
          "1/4 cup mixed veg (carrot, beans, peas)",
          "1 tbsp bisi bele bath masala",
          "Tamarind pulp + jaggery + salt",
          "1 tsp ghee + cashew + mustard for tempering",
        ],
        steps: [
          "Pressure-cook rice + dal + veg with 2.5 cups water for 3 whistles.",
          "Add bisi bele bath masala, tamarind pulp, jaggery and salt; simmer 5 min.",
          "Mash lightly so it's a one-pot porridge consistency.",
          "Top with ghee-fried cashews and mustard; serve with papad and curd.",
        ],
        tip: "A complete one-pot Karnataka meal — protein, carbs and veg all in one bowl.",
      },
    },
    {
      match: /rava idli/i,
      recipe: {
        prepTime: "15 min",
        cookTime: "12 min",
        servings: "1 child (3 idlis)",
        ingredients: [
          "1/2 cup rava (semolina), dry-roasted",
          "1/4 cup curd, 1/4 cup water",
          "1 tbsp grated carrot, 1 tsp chopped coriander",
          "1/2 tsp eno fruit salt",
          "1 tsp oil + mustard + curry leaves",
        ],
        steps: [
          "Mix rava, curd, water, carrot, coriander and salt; rest 10 min.",
          "Stir in eno just before steaming; pour into greased idli moulds.",
          "Steam 10–12 min till spongy. Cool slightly and unmould.",
          "Heat oil, splutter mustard + curry leaves; pour over idlis.",
        ],
        tip: "No fermentation needed — perfect for last-minute idli cravings.",
      },
    },
    {
      match: /idiyappam|string hopper/i,
      recipe: {
        prepTime: "10 min",
        cookTime: "10 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup rice flour (idiyappam flour)",
          "Boiling water + salt + 1 tsp oil",
          "Idiyappam press (or noodle press)",
          "Coconut milk + jaggery to serve",
        ],
        steps: [
          "Pour boiling water over rice flour with salt and oil; mix to a soft dough.",
          "Press the dough through an idiyappam mould onto small idli plates.",
          "Steam 8–10 min until cooked through.",
          "Serve with sweetened coconut milk or vegetable kurma.",
        ],
        tip: "Kerala breakfast classic — pair sweet with coconut milk for kids, savoury with kurma for adults.",
      },
    },
    {
      match: /lemon rice|chitranna/i,
      recipe: {
        prepTime: "5 min",
        cookTime: "10 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup cooked rice (cooled)",
          "1 tsp oil + 1/2 tsp mustard + 1 tsp chana dal",
          "1/2 tsp turmeric + curry leaves + 1 tbsp peanuts",
          "Juice of 1/2 lemon, salt to taste",
        ],
        steps: [
          "Heat oil, splutter mustard, fry chana dal and peanuts till golden.",
          "Add curry leaves, turmeric and salt; switch off the heat.",
          "Toss in cooled rice and lemon juice; mix gently without breaking grains.",
          "Garnish with coriander; serve with papad or curd.",
        ],
        tip: "Cooled rice tossed off the heat = bright lemony flavour, no bitterness.",
      },
    },
    {
      match: /curd rice|thayir saadam/i,
      recipe: {
        prepTime: "5 min",
        cookTime: "5 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup cooked rice (cooled to warm)",
          "1/4 cup thick curd + 2 tbsp milk",
          "1 tsp ghee + 1/2 tsp mustard + curry leaves",
          "1 tbsp grated cucumber or carrot",
          "Salt + pomegranate to garnish",
        ],
        steps: [
          "Mash warm rice lightly; mix with curd, milk and salt to a creamy consistency.",
          "Heat ghee, splutter mustard + curry leaves + a pinch of asafoetida.",
          "Pour the tempering into the curd rice along with the grated veg.",
          "Top with pomegranate seeds. Serve with mango pickle.",
        ],
        tip: "Soothing for tummies — the perfect end to a spicy South Indian thali.",
      },
    },
  ],
  punjabi: [
    {
      match: /sarson.*saag|sarson da saag/i,
      recipe: {
        prepTime: "10 min",
        cookTime: "40 min",
        servings: "1 child",
        ingredients: [
          "1 cup chopped sarson (mustard greens) + 1/4 cup palak",
          "1 small onion + 1 tomato + 1 tsp ginger-garlic",
          "1 tbsp makki (corn) flour for thickening",
          "1 tsp ghee + a small dollop of white butter",
          "Salt to taste",
        ],
        steps: [
          "Pressure-cook greens with ginger-garlic, salt and 1/2 cup water for 3 whistles.",
          "Mash with a wooden masher (traditional) or blend briefly. Stir in makki flour with water.",
          "Heat ghee, sauté onion + tomato till soft; add the saag and simmer 10 min.",
          "Top with white butter and serve with hot makki di roti.",
        ],
        tip: "Winter Punjabi staple — the white butter on top is non-negotiable.",
      },
    },
    {
      match: /chole bhature|chole.bhature/i,
      recipe: {
        prepTime: "15 min (chickpeas soaked overnight)",
        cookTime: "30 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup soaked chickpeas (kabuli chana)",
          "1 onion + 1 tomato + 1 tsp ginger-garlic",
          "1 tsp chole masala + 1 tea bag (for colour)",
          "1/2 cup maida + 1 tbsp curd for bhatura",
          "1 tsp oil, salt, oil for frying bhatura",
        ],
        steps: [
          "Pressure-cook chickpeas with the tea bag, salt and water for 5 whistles.",
          "Sauté onion till brown, add tomato and chole masala; cook into a thick gravy.",
          "Mix in chickpeas with their water; simmer 10 min.",
          "Knead maida + curd + salt for bhatura; rest 30 min, roll, deep-fry till puffed. Serve hot.",
        ],
        tip: "Punjabi Sunday classic — the tea bag gives chole its iconic dark colour without colouring agents.",
      },
    },
    {
      match: /dal makhani/i,
      recipe: {
        prepTime: "10 min (urad soaked overnight)",
        cookTime: "60 min",
        servings: "1 child",
        ingredients: [
          "1/4 cup whole urad dal + 1 tbsp rajma (soaked)",
          "1 tomato puree + 1 tsp ginger-garlic",
          "1 tsp Kashmiri red chilli (mild) + pinch of garam masala",
          "1 tbsp butter + 2 tbsp cream",
          "Salt to taste",
        ],
        steps: [
          "Pressure-cook urad and rajma with salt for 6 whistles, until very soft.",
          "Heat butter, add ginger-garlic, tomato puree and Kashmiri chilli; cook 5 min.",
          "Add the cooked dal with water; simmer on low heat 30–40 min, stirring often.",
          "Finish with cream and a pinch of garam masala. Serve with naan or jeera rice.",
        ],
        tip: "The slow simmer is what gives dal makhani its silky, restaurant-style texture.",
      },
    },
    {
      match: /rajma|rajma chawal/i,
      recipe: {
        prepTime: "10 min (rajma soaked overnight)",
        cookTime: "30 min",
        servings: "1 child",
        ingredients: [
          "1/4 cup rajma (red kidney beans), soaked overnight",
          "1 onion + 1 tomato + 1 tsp ginger-garlic",
          "1 tsp rajma masala + pinch of garam masala",
          "1 tsp ghee + bay leaf + cumin",
          "1/2 cup steamed rice + lemon, salt to taste",
        ],
        steps: [
          "Pressure-cook rajma with salt and 1.5 cups water for 5 whistles, till soft.",
          "Heat ghee, splutter cumin and bay leaf; sauté onion + tomato + ginger-garlic.",
          "Add rajma masala and the cooked rajma with its water; simmer 10 min.",
          "Mash a few beans for body; pour over hot rice with a wedge of lemon.",
        ],
        tip: "A classic Sunday lunch — a small spoon of ghee on the rice makes all the difference.",
      },
    },
    {
      match: /aloo paratha/i,
      recipe: {
        prepTime: "20 min",
        cookTime: "10 min",
        servings: "1 child (1 paratha)",
        ingredients: [
          "1 ball whole-wheat dough",
          "1 boiled potato, mashed",
          "1 tsp ginger-coriander + pinch of ajwain + amchur",
          "Ghee or butter for cooking",
          "Salt to taste",
        ],
        steps: [
          "Mix mashed potato with ginger, coriander, ajwain, amchur and salt.",
          "Roll dough into a small disc, place stuffing in centre, seal and roll into a paratha.",
          "Cook on a hot tawa with ghee, flipping once until golden brown spots appear.",
          "Top with a knob of butter; serve with curd and pickle.",
        ],
        tip: "A dollop of white butter on top is the Punjabi way — kids love it.",
      },
    },
    {
      match: /amritsari kulcha|kulcha/i,
      recipe: {
        prepTime: "20 min (dough rested 1h)",
        cookTime: "10 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup maida + 1 tbsp curd + pinch of baking soda",
          "1 boiled potato, mashed (for stuffing)",
          "1 tsp coriander + ginger + pinch of cumin",
          "1 tsp ghee + nigella seeds to garnish",
          "Salt to taste",
        ],
        steps: [
          "Knead a soft dough with maida, curd, soda and salt; rest 1 hour.",
          "Mix mashed potato with coriander, ginger, cumin and salt for the stuffing.",
          "Stuff a dough ball, roll into a thick disc; press nigella seeds on top.",
          "Cook on a hot tawa with ghee, flipping until both sides are golden. Serve with chole.",
        ],
        tip: "Amritsar's signature stuffed flatbread — softer and richer than a regular kulcha.",
      },
    },
    {
      match: /lassi/i,
      recipe: {
        prepTime: "5 min",
        cookTime: "0 min",
        servings: "1 child (1 glass)",
        ingredients: [
          "1/2 cup thick curd",
          "1/4 cup chilled water + a few ice cubes",
          "1 tsp sugar (or 1 tsp jaggery powder)",
          "Pinch of cardamom + 2 chopped pistachios",
        ],
        steps: [
          "Whisk curd with water, sugar and cardamom till smooth and frothy.",
          "Add a few ice cubes and blitz briefly for a creamy lassi.",
          "Pour into a tall glass; top with chopped pistachios.",
          "Serve immediately — best on a hot afternoon.",
        ],
        tip: "Use full-fat curd for the classic creamy Punjabi lassi.",
      },
    },
  ],
  north_indian: [
    {
      match: /bedmi puri|bedmi/i,
      recipe: {
        prepTime: "20 min",
        cookTime: "15 min",
        servings: "1 child (2 puris)",
        ingredients: [
          "1/2 cup whole-wheat flour + 2 tbsp coarsely-ground urad dal",
          "Pinch of fennel + ajwain + asafoetida",
          "1 tsp oil for the dough + salt",
          "Oil for deep-frying",
          "Aloo sabzi to serve",
        ],
        steps: [
          "Soak urad dal 1 hr, grind coarse; mix with wheat flour, spices, oil and salt.",
          "Knead a stiff dough with minimal water; rest 15 min.",
          "Roll into small thick puris and deep-fry in hot oil till they puff up.",
          "Serve hot with aloo sabzi — Banaras / Old-Delhi street breakfast.",
        ],
        tip: "Bedmi puris should puff and stay puffed — the urad dal is the secret.",
      },
    },
    {
      match: /chole bhature|chole.bhature/i,
      recipe: {
        prepTime: "15 min (chickpeas soaked overnight)",
        cookTime: "30 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup soaked chickpeas",
          "1 onion + 1 tomato + 1 tsp ginger-garlic",
          "1 tsp chole masala + 1 tea bag for colour",
          "1/2 cup maida + 1 tbsp curd for bhatura",
          "Oil for frying, salt to taste",
        ],
        steps: [
          "Pressure-cook chickpeas with the tea bag, salt and water for 5 whistles.",
          "Sauté onion till brown, add tomato + chole masala; cook into a thick gravy.",
          "Mix in chickpeas with their water; simmer 10 min.",
          "Knead maida + curd + salt; rest 30 min, roll, deep-fry till puffed. Serve hot.",
        ],
        tip: "Delhi-style chole gets its dark colour from a tea bag in the cooking water.",
      },
    },
    {
      match: /aloo tikki/i,
      recipe: {
        prepTime: "15 min",
        cookTime: "10 min",
        servings: "1 child (2 tikkis)",
        ingredients: [
          "2 boiled potatoes, mashed",
          "2 tbsp boiled green peas + 1 tsp ginger-coriander",
          "1 tsp roasted cumin powder + amchur + pinch of red chilli",
          "1 tbsp cornflour to bind",
          "Oil for shallow frying, green chutney to serve",
        ],
        steps: [
          "Mix potato, peas, ginger-coriander, spices and cornflour with salt.",
          "Shape into small flat patties.",
          "Shallow-fry on a hot tawa till golden and crisp on both sides.",
          "Serve with green chutney and a dash of curd-tamarind.",
        ],
        tip: "Crisp outside, soft inside — the cornflour is what gives the perfect crust.",
      },
    },
    {
      match: /kadhi|kadhi pakora/i,
      recipe: {
        prepTime: "10 min",
        cookTime: "30 min",
        servings: "1 child",
        ingredients: [
          "1/2 cup sour curd + 2 tbsp besan whisked smooth",
          "1.5 cups water + pinch of turmeric",
          "1 tsp ghee + cumin + fenugreek + curry leaves + dried chilli",
          "4–5 small besan pakoras (optional)",
          "Salt to taste",
        ],
        steps: [
          "Whisk curd, besan, turmeric, salt and water lump-free.",
          "Bring to a boil stirring constantly, then simmer 20 min until thick.",
          "Add fried pakoras (if using); simmer 5 min so they soak up gravy.",
          "Heat ghee, splutter cumin, methi seeds, dried chilli; pour over kadhi.",
        ],
        tip: "Stir continuously till it boils, otherwise the curd splits and the kadhi looks grainy.",
      },
    },
    {
      match: /samosa/i,
      recipe: {
        prepTime: "30 min",
        cookTime: "15 min",
        servings: "1 child (2 samosas)",
        ingredients: [
          "1/2 cup maida + 1 tbsp ghee + ajwain for the shell",
          "2 boiled potatoes + 2 tbsp peas + ginger-coriander",
          "1 tsp coriander powder + amchur + garam masala",
          "Oil for frying, mint chutney to serve",
        ],
        steps: [
          "Knead a stiff maida-ghee dough; rest 30 min.",
          "Sauté potato, peas and spices into a dry filling. Cool completely.",
          "Roll dough into ovals, cut in halves, shape cones, fill and seal edges.",
          "Deep-fry on low heat 12 min until crisp and golden. Serve with chutney.",
        ],
        tip: "Low slow frying = flaky shell. High-heat frying makes the samosa blister.",
      },
    },
    {
      match: /paneer butter masala|butter paneer/i,
      recipe: {
        prepTime: "10 min",
        cookTime: "20 min",
        servings: "1 child",
        ingredients: [
          "100 g paneer cubes",
          "1 tomato puree + 1 tbsp cashew paste",
          "1 tsp Kashmiri red chilli + pinch of kasuri methi + sugar",
          "1 tbsp butter + 2 tbsp cream",
          "Salt to taste",
        ],
        steps: [
          "Heat butter, sauté the tomato + cashew puree with Kashmiri chilli for 5 min.",
          "Add 1/2 cup water, salt and a pinch of sugar; simmer 5 min.",
          "Add paneer cubes; cook 3 min so they soak up the gravy.",
          "Stir in cream and crushed kasuri methi. Serve with naan or jeera rice.",
        ],
        tip: "Cashew paste is the trick to a creamy gravy without overdoing the cream.",
      },
    },
  ],
};

const REGIONAL_NUTRITION: Record<string, Array<{ match: RegExp; nutrition: MealNutrition }>> = {
  bengali: [
    {
      match: /macher jhol|maach.*jhol|fish.*jhol|pabda.*jhol/i,
      nutrition: {
        calories: "260–320 kcal",
        protein: "20 g",
        carbs: "12 g",
        fat: "11 g",
        notes: "Lean fish + light tomato gravy — high protein, low fat. Pair with rice for a complete Bengali meal.",
      },
    },
    {
      match: /kosha mangsho|kosha.*mutton/i,
      nutrition: {
        calories: "360–420 kcal",
        protein: "22 g",
        carbs: "10 g",
        fat: "22 g",
        notes: "Iron-rich slow-cooked mutton — keep portions small for kids.",
      },
    },
    {
      match: /aloo posto|posto/i,
      nutrition: {
        calories: "240–290 kcal",
        protein: "7 g",
        carbs: "30 g",
        fat: "11 g",
        notes: "Posto (poppy seeds) brings calcium and healthy fats. Comforting starch + protein combo.",
      },
    },
    {
      match: /luchi/i,
      nutrition: {
        calories: "220–280 kcal",
        protein: "5 g",
        carbs: "30 g",
        fat: "10 g",
        notes: "Refined-flour treat — best paired with a vegetable side like aloor dom.",
      },
    },
    {
      match: /cholar dal/i,
      nutrition: {
        calories: "210–260 kcal",
        protein: "11 g",
        carbs: "30 g",
        fat: "6 g",
        notes: "Chana dal + coconut + raisin — plant protein with a touch of natural sweetness.",
      },
    },
    {
      match: /singara/i,
      nutrition: {
        calories: "240–290 kcal",
        protein: "5 g",
        carbs: "30 g",
        fat: "12 g",
        notes: "Bengali-style fried snack — a 1-piece weekend treat.",
      },
    },
  ],
  gujarati: [
    {
      match: /khaman dhokla|dhokla/i,
      nutrition: {
        calories: "180–220 kcal",
        protein: "9 g",
        carbs: "26 g",
        fat: "5 g",
        notes: "Steamed besan = high plant protein, low fat. Great everyday breakfast or tiffin.",
      },
    },
    {
      match: /thepla|methi.*thepla/i,
      nutrition: {
        calories: "240–290 kcal",
        protein: "8 g",
        carbs: "32 g",
        fat: "9 g",
        notes: "Whole-wheat + iron-rich methi. Stays fresh for hours — perfect for travel.",
      },
    },
    {
      match: /khandvi/i,
      nutrition: {
        calories: "160–200 kcal",
        protein: "8 g",
        carbs: "20 g",
        fat: "6 g",
        notes: "Light, gut-friendly besan rolls — calcium from curd plus fibre.",
      },
    },
    {
      match: /undhiyu/i,
      nutrition: {
        calories: "320–380 kcal",
        protein: "10 g",
        carbs: "38 g",
        fat: "14 g",
        notes: "Mixed winter vegetables + besan muthia = fibre, vitamins and plant protein.",
      },
    },
    {
      match: /handvo/i,
      nutrition: {
        calories: "260–310 kcal",
        protein: "11 g",
        carbs: "34 g",
        fat: "9 g",
        notes: "Fermented dal + grated veg — protein, B12 and stealth vegetables.",
      },
    },
    {
      match: /fafda/i,
      nutrition: {
        calories: "260–320 kcal",
        protein: "8 g",
        carbs: "26 g",
        fat: "14 g",
        notes: "Deep-fried besan strips — keep as a weekend snack, not daily.",
      },
    },
    {
      match: /bajra rotla|bajra.*rotla|rotla/i,
      nutrition: {
        calories: "210–260 kcal",
        protein: "7 g",
        carbs: "38 g",
        fat: "5 g",
        notes: "Bajra is high in iron and magnesium — warming winter grain.",
      },
    },
  ],
  maharashtrian: [
    {
      match: /misal pav|misal/i,
      nutrition: {
        calories: "320–380 kcal",
        protein: "14 g",
        carbs: "44 g",
        fat: "11 g",
        notes: "Sprouted matki = plant protein + fibre. The pav adds carbs for energy.",
      },
    },
    {
      match: /vada pav/i,
      nutrition: {
        calories: "300–360 kcal",
        protein: "8 g",
        carbs: "42 g",
        fat: "12 g",
        notes: "Mumbai's iconic burger — best as an occasional treat.",
      },
    },
    {
      match: /sabudana khichdi|sabudana/i,
      nutrition: {
        calories: "280–340 kcal",
        protein: "6 g",
        carbs: "44 g",
        fat: "10 g",
        notes: "Quick energy from sago + healthy fats from peanuts. Light and easy on the tummy.",
      },
    },
    {
      match: /varan|varan.bhaat/i,
      nutrition: {
        calories: "300–360 kcal",
        protein: "11 g",
        carbs: "50 g",
        fat: "6 g",
        notes: "Tuvar dal + rice = complete amino-acid profile. The everyday Maharashtrian comfort meal.",
      },
    },
    {
      match: /pithla/i,
      nutrition: {
        calories: "200–250 kcal",
        protein: "9 g",
        carbs: "22 g",
        fat: "8 g",
        notes: "Fast besan curry — protein-packed and ready in 15 min.",
      },
    },
    {
      match: /thalipeeth/i,
      nutrition: {
        calories: "260–310 kcal",
        protein: "9 g",
        carbs: "38 g",
        fat: "8 g",
        notes: "Multigrain bread — jowar + bajra + besan deliver iron, fibre and protein.",
      },
    },
    {
      match: /poha|kanda poha/i,
      nutrition: {
        calories: "230–280 kcal",
        protein: "6 g",
        carbs: "40 g",
        fat: "6 g",
        notes: "Iron-rich flattened rice + peanuts — a Maharashtrian breakfast favourite.",
      },
    },
  ],
  south_indian: [
    {
      match: /pongal|ven pongal/i,
      nutrition: {
        calories: "280–340 kcal",
        protein: "9 g",
        carbs: "44 g",
        fat: "8 g",
        notes: "Soft, easy to digest — perfect for kids and elders alike.",
      },
    },
    {
      match: /sambar rice|sambar.bhath|sambar bath/i,
      nutrition: {
        calories: "320–380 kcal",
        protein: "11 g",
        carbs: "55 g",
        fat: "7 g",
        notes: "Tuvar dal + veg + rice = a complete one-bowl meal with multiple food groups.",
      },
    },
    {
      match: /bisi bele bath|bisi.bele/i,
      nutrition: {
        calories: "330–390 kcal",
        protein: "11 g",
        carbs: "52 g",
        fat: "10 g",
        notes: "Karnataka one-pot meal — rice, dal, mixed veg, ghee — complete in one bowl.",
      },
    },
    {
      match: /rava idli/i,
      nutrition: {
        calories: "200–250 kcal",
        protein: "7 g",
        carbs: "36 g",
        fat: "5 g",
        notes: "Quick fix with grated carrot — protein from curd, fibre from veg, no fermentation wait.",
      },
    },
    {
      match: /idiyappam|string hopper/i,
      nutrition: {
        calories: "240–290 kcal",
        protein: "5 g",
        carbs: "50 g",
        fat: "3 g",
        notes: "Steamed, low-fat — great with sweet coconut milk or savoury kurma.",
      },
    },
    {
      match: /lemon rice|chitranna/i,
      nutrition: {
        calories: "260–320 kcal",
        protein: "6 g",
        carbs: "44 g",
        fat: "8 g",
        notes: "Vitamin C + healthy fats from peanuts — bright, light tiffin staple.",
      },
    },
    {
      match: /curd rice|thayir saadam/i,
      nutrition: {
        calories: "240–290 kcal",
        protein: "8 g",
        carbs: "38 g",
        fat: "6 g",
        notes: "Probiotic curd + cooling rice — soothing for hot weather and upset tummies.",
      },
    },
  ],
  punjabi: [
    {
      match: /sarson.*saag|sarson da saag/i,
      nutrition: {
        calories: "240–290 kcal",
        protein: "8 g",
        carbs: "22 g",
        fat: "13 g",
        notes: "Iron-rich greens + ghee — the classic Punjabi winter superfood.",
      },
    },
    {
      match: /chole bhature|chole.bhature/i,
      nutrition: {
        calories: "440–520 kcal",
        protein: "14 g",
        carbs: "60 g",
        fat: "16 g",
        notes: "Hearty Sunday brunch — high in protein from chickpeas; balance with light dinner.",
      },
    },
    {
      match: /dal makhani/i,
      nutrition: {
        calories: "320–380 kcal",
        protein: "12 g",
        carbs: "32 g",
        fat: "16 g",
        notes: "Slow-cooked urad + rajma — rich in plant protein and iron.",
      },
    },
    {
      match: /rajma|rajma chawal/i,
      nutrition: {
        calories: "340–400 kcal",
        protein: "13 g",
        carbs: "55 g",
        fat: "8 g",
        notes: "Kidney beans + rice = complete protein. Punjab's beloved Sunday lunch.",
      },
    },
    {
      match: /aloo paratha/i,
      nutrition: {
        calories: "320–380 kcal",
        protein: "8 g",
        carbs: "42 g",
        fat: "13 g",
        notes: "Whole-wheat + potato + butter — energy-rich Punjabi breakfast.",
      },
    },
    {
      match: /amritsari kulcha|kulcha/i,
      nutrition: {
        calories: "320–380 kcal",
        protein: "8 g",
        carbs: "48 g",
        fat: "11 g",
        notes: "Stuffed flatbread — best paired with chole for protein balance.",
      },
    },
    {
      match: /lassi/i,
      nutrition: {
        calories: "180–220 kcal",
        protein: "7 g",
        carbs: "22 g",
        fat: "7 g",
        notes: "Probiotic + calcium + cooling — Punjab's answer to hot afternoons.",
      },
    },
  ],
  north_indian: [
    {
      match: /bedmi puri|bedmi/i,
      nutrition: {
        calories: "320–380 kcal",
        protein: "8 g",
        carbs: "40 g",
        fat: "15 g",
        notes: "Urad dal + wheat — protein-fortified puri. Best as a weekend breakfast.",
      },
    },
    {
      match: /chole bhature|chole.bhature/i,
      nutrition: {
        calories: "440–520 kcal",
        protein: "14 g",
        carbs: "60 g",
        fat: "16 g",
        notes: "Delhi favourite — pair with light dinner the same day.",
      },
    },
    {
      match: /aloo tikki/i,
      nutrition: {
        calories: "220–280 kcal",
        protein: "5 g",
        carbs: "30 g",
        fat: "10 g",
        notes: "Crispy potato cake — a fun snack with chutney.",
      },
    },
    {
      match: /kadhi|kadhi pakora/i,
      nutrition: {
        calories: "240–290 kcal",
        protein: "9 g",
        carbs: "26 g",
        fat: "11 g",
        notes: "Tangy curd-besan curry — comfort food, easy on the stomach.",
      },
    },
    {
      match: /samosa/i,
      nutrition: {
        calories: "260–310 kcal",
        protein: "6 g",
        carbs: "32 g",
        fat: "13 g",
        notes: "Iconic North Indian snack — keep portions small as it's deep-fried.",
      },
    },
    {
      match: /paneer butter masala|butter paneer/i,
      nutrition: {
        calories: "340–400 kcal",
        protein: "14 g",
        carbs: "16 g",
        fat: "24 g",
        notes: "Paneer + cream — high protein, rich and energy-dense. Pair with light bread.",
      },
    },
  ],
};

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

export function recipeFor(meal: string, region?: RegionKey): MealRecipe {
  const name = firstOption(meal);
  if (region) {
    const bank = REGIONAL_RECIPES[region];
    if (bank) {
      for (const entry of bank) {
        if (entry.match.test(name)) return entry.recipe;
      }
    }
  }
  for (const entry of KEYWORD_RECIPES) {
    if (entry.match.test(name)) return entry.recipe;
  }
  return DEFAULT_RECIPE;
}

export function nutritionFor(meal: string, region?: RegionKey): MealNutrition {
  const name = firstOption(meal);
  if (region) {
    const bank = REGIONAL_NUTRITION[region];
    if (bank) {
      for (const entry of bank) {
        if (entry.match.test(name)) return entry.nutrition;
      }
    }
  }
  for (const entry of KEYWORD_NUTRITION) {
    if (entry.match.test(name)) return entry.nutrition;
  }
  return DEFAULT_NUTRITION;
}
