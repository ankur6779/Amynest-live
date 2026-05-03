// ─── Smart Tiffin & Meal Suggestions — Local Dataset + Ranking ─────────────
// Zero external API cost. Pure rule-based filter + Amy AI message templates.
// Used by GET /api/meals/suggest.

export type MealRegion =
  | "north_indian"
  | "south_indian"
  | "bengali"
  | "gujarati"
  | "maharashtrian"
  | "punjabi"
  | "pan_indian"
  | "global"
  | "western"
  | "asian"
  | "middle_eastern"
  | "vegetarian"
  | "mixed"
  | "indian";

export type MealCategory = "kids_tiffin" | "parent_healthy";

export type MealTag = "Healthy" | "Quick" | "Protein" | "Veg" | "Non-Veg" | "Sweet";

export interface MealRecipe {
  id: string;
  title: string;
  emoji: string;             // visual placeholder — no external API
  bgGradient: [string, string]; // soft 2-stop gradient for card hero
  region: MealRegion;
  category: MealCategory;
  ingredients: string[];     // lowercased keywords for matching
  steps: string[];
  calories: number;          // kcal per serving
  tags: MealTag[];
  prepMinutes: number;
  audioText: string;         // simple text for Read Aloud
  isVeg: boolean;
  ageMinYears: number;       // suitable from this age (0 = any)
}

// ─── Dataset ────────────────────────────────────────────────────────────────
// Compact but covers all regions × both categories. Easy to extend.
const MEALS: MealRecipe[] = [
  // ─── KIDS TIFFIN ─────────────────────────────────────────────────────────
  {
    id: "k_paneer_sandwich",
    title: "Paneer Sandwich",
    emoji: "🥪",
    bgGradient: ["#FFE5B4", "#FFB07A"],
    region: "pan_indian",
    category: "kids_tiffin",
    ingredients: ["bread", "paneer", "butter", "tomato", "salt"],
    steps: [
      "Mash paneer with grated tomato, salt and a pinch of pepper.",
      "Spread butter on bread slices, fill with paneer mix.",
      "Toast on a tawa or sandwich maker till golden.",
      "Cut diagonally and pack with ketchup on the side.",
    ],
    calories: 280,
    tags: ["Protein", "Quick", "Veg"],
    prepMinutes: 10,
    audioText: "Paneer sandwich. Mash paneer with tomato and salt. Spread butter on bread, fill with paneer. Toast till golden. Pack with ketchup.",
    isVeg: true,
    ageMinYears: 2,
  },
  {
    id: "k_aloo_paratha",
    title: "Mini Aloo Paratha",
    emoji: "🫓",
    bgGradient: ["#FFD89B", "#FF8C42"],
    region: "north_indian",
    category: "kids_tiffin",
    ingredients: ["wheat flour", "potato", "ghee", "salt", "cumin"],
    steps: [
      "Boil and mash potato with salt, cumin and a little ghee.",
      "Stuff the mash inside a small wheat dough ball, roll thin.",
      "Cook on a tawa with ghee till golden on both sides.",
      "Pack with curd or pickle in a small box.",
    ],
    calories: 260,
    tags: ["Quick", "Veg"],
    prepMinutes: 20,
    audioText: "Mini aloo paratha. Boil and mash potato with salt and cumin. Stuff inside wheat dough, roll thin. Cook on tawa with ghee till golden. Pack with curd.",
    isVeg: true,
    ageMinYears: 2,
  },
  {
    id: "k_idli_chutney",
    title: "Mini Idli with Chutney",
    emoji: "🍘",
    bgGradient: ["#E0F7E9", "#9BD3A8"],
    region: "south_indian",
    category: "kids_tiffin",
    ingredients: ["idli batter", "coconut", "ginger", "salt"],
    steps: [
      "Pour idli batter into mini idli moulds and steam 8 minutes.",
      "Blend coconut, ginger and salt for a quick chutney.",
      "Toss warm idlis lightly in ghee and pack with chutney.",
    ],
    calories: 220,
    tags: ["Healthy", "Quick", "Veg"],
    prepMinutes: 15,
    audioText: "Mini idli with chutney. Steam idli batter for 8 minutes. Blend coconut, ginger and salt for chutney. Toss in ghee and pack.",
    isVeg: true,
    ageMinYears: 1,
  },
  {
    id: "k_dosa_roll",
    title: "Cheese Dosa Roll",
    emoji: "🌯",
    bgGradient: ["#FFF5BA", "#F7C948"],
    region: "south_indian",
    category: "kids_tiffin",
    ingredients: ["dosa batter", "cheese", "butter", "salt"],
    steps: [
      "Spread dosa batter thin on a hot tawa, drizzle butter.",
      "Sprinkle grated cheese, let it melt slightly.",
      "Roll the dosa tight, slice into 2 pieces and pack warm.",
    ],
    calories: 290,
    tags: ["Quick", "Veg", "Protein"],
    prepMinutes: 12,
    audioText: "Cheese dosa roll. Spread dosa batter on hot tawa with butter. Sprinkle cheese and let it melt. Roll tight, slice and pack warm.",
    isVeg: true,
    ageMinYears: 2,
  },
  {
    id: "k_poha_box",
    title: "Veggie Poha Box",
    emoji: "🍱",
    bgGradient: ["#FCE4A8", "#F4A261"],
    region: "maharashtrian",
    category: "kids_tiffin",
    ingredients: ["poha", "peas", "carrot", "onion", "lemon", "peanuts"],
    steps: [
      "Rinse poha till soft. Sauté onion, peas and carrot in oil.",
      "Add poha, salt, turmeric. Toss till heated through.",
      "Top with roasted peanuts and a squeeze of lemon. Pack.",
    ],
    calories: 240,
    tags: ["Healthy", "Veg"],
    prepMinutes: 15,
    audioText: "Veggie poha box. Soak poha till soft. Sauté onion, peas and carrot. Toss with poha, salt and turmeric. Top with peanuts and lemon.",
    isVeg: true,
    ageMinYears: 2,
  },
  {
    id: "k_thepla",
    title: "Methi Thepla",
    emoji: "🫓",
    bgGradient: ["#D8F3DC", "#74C69D"],
    region: "gujarati",
    category: "kids_tiffin",
    ingredients: ["wheat flour", "methi", "curd", "salt", "ginger"],
    steps: [
      "Mix wheat flour, chopped methi, curd, salt and grated ginger.",
      "Knead a soft dough with little water. Rest 5 minutes.",
      "Roll thin theplas, cook on tawa with oil till spotted brown.",
      "Pack with a small box of curd.",
    ],
    calories: 230,
    tags: ["Healthy", "Veg"],
    prepMinutes: 20,
    audioText: "Methi thepla. Mix wheat flour, methi, curd and salt. Knead a soft dough. Roll thin and cook on tawa with oil. Pack with curd.",
    isVeg: true,
    ageMinYears: 3,
  },
  {
    id: "k_rajma_wrap",
    title: "Rajma Cheese Wrap",
    emoji: "🌯",
    bgGradient: ["#FAD2E1", "#E8B4BC"],
    region: "punjabi",
    category: "kids_tiffin",
    ingredients: ["roti", "rajma", "cheese", "onion"],
    steps: [
      "Mash leftover rajma with finely chopped onion.",
      "Warm a roti, spread the rajma mix and grated cheese.",
      "Roll tight, slice in half, pack warm.",
    ],
    calories: 320,
    tags: ["Protein", "Veg"],
    prepMinutes: 10,
    audioText: "Rajma cheese wrap. Mash rajma with onion. Warm a roti, spread rajma and cheese. Roll tight and slice.",
    isVeg: true,
    ageMinYears: 3,
  },
  {
    id: "k_egg_roll",
    title: "Bengali Egg Roll",
    emoji: "🥚",
    bgGradient: ["#FFE5D9", "#F4A261"],
    region: "bengali",
    category: "kids_tiffin",
    ingredients: ["egg", "wheat flour", "onion", "lemon", "salt"],
    steps: [
      "Make a thin paratha from wheat flour. Keep aside.",
      "Beat an egg with salt, pour on tawa, place paratha on top.",
      "Flip, top with chopped onion and a squeeze of lemon.",
      "Roll tight and pack warm.",
    ],
    calories: 310,
    tags: ["Protein", "Non-Veg"],
    prepMinutes: 15,
    audioText: "Bengali egg roll. Make a thin paratha. Beat an egg with salt, pour on tawa, place paratha on top. Flip, add onion and lemon. Roll tight.",
    isVeg: false,
    ageMinYears: 3,
  },
  {
    id: "k_pasta",
    title: "Veggie White Pasta",
    emoji: "🍝",
    bgGradient: ["#FFF0F3", "#FFB3C1"],
    region: "global",
    category: "kids_tiffin",
    ingredients: ["pasta", "milk", "cheese", "butter", "carrot", "corn"],
    steps: [
      "Boil pasta with a pinch of salt till just tender.",
      "Make a quick white sauce with butter, flour and milk.",
      "Toss boiled pasta and veggies in the sauce, top with cheese. Pack.",
    ],
    calories: 340,
    tags: ["Quick", "Veg", "Protein"],
    prepMinutes: 18,
    audioText: "Veggie white pasta. Boil pasta till tender. Make a white sauce with butter, flour and milk. Toss with veggies and cheese.",
    isVeg: true,
    ageMinYears: 2,
  },
  {
    id: "k_banana_pancake",
    title: "Banana Oat Pancakes",
    emoji: "🥞",
    bgGradient: ["#FFF1B6", "#FFC857"],
    region: "global",
    category: "kids_tiffin",
    ingredients: ["banana", "oats", "milk", "egg", "honey"],
    steps: [
      "Blend banana, oats, milk and egg into a smooth batter.",
      "Pour small rounds on a non-stick tawa, cook both sides.",
      "Drizzle a little honey, pack 2-3 mini pancakes.",
    ],
    calories: 250,
    tags: ["Healthy", "Quick", "Sweet"],
    prepMinutes: 12,
    audioText: "Banana oat pancakes. Blend banana, oats, milk and egg. Pour small rounds on tawa, cook both sides. Drizzle honey.",
    isVeg: true,
    ageMinYears: 1,
  },
  {
    id: "k_chana_chaat",
    title: "Chana Chaat Cup",
    emoji: "🥗",
    bgGradient: ["#E9F5DB", "#B5E48C"],
    region: "pan_indian",
    category: "kids_tiffin",
    ingredients: ["chickpeas", "tomato", "cucumber", "lemon", "salt", "chaat masala"],
    steps: [
      "Mix boiled chickpeas with chopped tomato and cucumber.",
      "Add a squeeze of lemon, salt and a pinch of chaat masala.",
      "Pack in a small box, send a spoon along.",
    ],
    calories: 200,
    tags: ["Healthy", "Protein", "Veg"],
    prepMinutes: 7,
    audioText: "Chana chaat cup. Mix boiled chickpeas with tomato and cucumber. Add lemon, salt and chaat masala. Pack with a spoon.",
    isVeg: true,
    ageMinYears: 3,
  },

  // ─── PARENT HEALTHY ──────────────────────────────────────────────────────
  {
    id: "p_dal_khichdi",
    title: "Moong Dal Khichdi",
    emoji: "🍲",
    bgGradient: ["#FFF3B0", "#E09F3E"],
    region: "pan_indian",
    category: "parent_healthy",
    ingredients: ["rice", "moong dal", "ghee", "cumin", "ginger", "salt"],
    steps: [
      "Wash rice and dal together. Pressure cook with water and turmeric.",
      "Heat ghee, add cumin and grated ginger. Pour over the khichdi.",
      "Serve hot with a spoon of curd.",
    ],
    calories: 380,
    tags: ["Healthy", "Veg"],
    prepMinutes: 25,
    audioText: "Moong dal khichdi. Wash rice and dal. Pressure cook with water and turmeric. Temper with ghee, cumin and ginger. Serve with curd.",
    isVeg: true,
    ageMinYears: 0,
  },
  {
    id: "p_palak_dal",
    title: "Palak Dal with Roti",
    emoji: "🥗",
    bgGradient: ["#D8F3DC", "#52B788"],
    region: "north_indian",
    category: "parent_healthy",
    ingredients: ["spinach", "toor dal", "garlic", "tomato", "cumin", "ghee"],
    steps: [
      "Pressure cook toor dal with turmeric and salt till soft.",
      "Sauté garlic, tomato and chopped spinach in ghee. Add to dal.",
      "Simmer 5 minutes, finish with cumin tadka. Serve with hot roti.",
    ],
    calories: 420,
    tags: ["Healthy", "Protein", "Veg"],
    prepMinutes: 25,
    audioText: "Palak dal with roti. Pressure cook toor dal with turmeric. Sauté garlic, tomato and spinach in ghee, add to dal. Finish with cumin tadka.",
    isVeg: true,
    ageMinYears: 0,
  },
  {
    id: "p_sambar_rice",
    title: "Sambar Rice",
    emoji: "🍚",
    bgGradient: ["#FFE5B4", "#F77F00"],
    region: "south_indian",
    category: "parent_healthy",
    ingredients: ["rice", "toor dal", "tamarind", "sambar powder", "tomato", "drumstick"],
    steps: [
      "Cook rice till soft. Pressure cook dal separately.",
      "Boil tamarind water with vegetables and sambar powder. Add dal.",
      "Mix sambar with hot rice, top with ghee and curry leaves.",
    ],
    calories: 450,
    tags: ["Healthy", "Veg"],
    prepMinutes: 30,
    audioText: "Sambar rice. Cook rice and dal separately. Boil tamarind water with veggies and sambar powder, add dal. Mix with rice and ghee.",
    isVeg: true,
    ageMinYears: 0,
  },
  {
    id: "p_bengali_fish",
    title: "Light Fish Curry",
    emoji: "🐟",
    bgGradient: ["#E0FBFC", "#98C1D9"],
    region: "bengali",
    category: "parent_healthy",
    ingredients: ["fish", "mustard oil", "onion", "tomato", "ginger", "turmeric"],
    steps: [
      "Marinate fish with salt and turmeric for 10 minutes.",
      "Sauté onion, ginger, tomato in mustard oil till soft.",
      "Add fish, simmer 8-10 minutes in light gravy. Serve with rice.",
    ],
    calories: 380,
    tags: ["Protein", "Non-Veg"],
    prepMinutes: 25,
    audioText: "Light fish curry. Marinate fish with salt and turmeric. Sauté onion, ginger, tomato in mustard oil. Add fish, simmer in light gravy.",
    isVeg: false,
    ageMinYears: 0,
  },
  {
    id: "p_dhokla",
    title: "Steamed Dhokla Plate",
    emoji: "🟨",
    bgGradient: ["#FFF8B7", "#FFD60A"],
    region: "gujarati",
    category: "parent_healthy",
    ingredients: ["besan", "curd", "eno", "ginger", "green chilli", "mustard seeds"],
    steps: [
      "Whisk besan, curd, salt, ginger paste. Add eno just before steaming.",
      "Pour in greased plate, steam 12 minutes.",
      "Temper with mustard seeds and curry leaves. Cut into squares.",
    ],
    calories: 300,
    tags: ["Healthy", "Protein", "Veg"],
    prepMinutes: 20,
    audioText: "Steamed dhokla. Whisk besan, curd and salt. Add eno, pour in plate, steam 12 minutes. Temper with mustard seeds. Cut into squares.",
    isVeg: true,
    ageMinYears: 0,
  },
  {
    id: "p_pohaonion",
    title: "Onion Poha Bowl",
    emoji: "🥣",
    bgGradient: ["#FFE5D9", "#F4A261"],
    region: "maharashtrian",
    category: "parent_healthy",
    ingredients: ["poha", "onion", "peanuts", "lemon", "coriander", "mustard seeds"],
    steps: [
      "Soften poha by rinsing. Sauté mustard seeds, onion and peanuts in oil.",
      "Toss in poha with salt and turmeric. Cover, steam 2 minutes.",
      "Finish with lemon juice and chopped coriander.",
    ],
    calories: 320,
    tags: ["Quick", "Healthy", "Veg"],
    prepMinutes: 15,
    audioText: "Onion poha bowl. Soften poha. Sauté mustard seeds, onion and peanuts. Toss with poha, salt and turmeric. Steam 2 minutes. Finish with lemon and coriander.",
    isVeg: true,
    ageMinYears: 0,
  },
  {
    id: "p_chole_roti",
    title: "Chole with Whole-Wheat Roti",
    emoji: "🥘",
    bgGradient: ["#FFD6A5", "#FF6B35"],
    region: "punjabi",
    category: "parent_healthy",
    ingredients: ["chickpeas", "onion", "tomato", "ginger", "garlic", "garam masala"],
    steps: [
      "Pressure cook soaked chickpeas till soft.",
      "Make a masala of onion, ginger, garlic, tomato; cook till oil separates.",
      "Add chickpeas, salt and garam masala. Simmer 10 minutes.",
      "Serve with hot whole-wheat roti.",
    ],
    calories: 480,
    tags: ["Protein", "Veg"],
    prepMinutes: 30,
    audioText: "Chole with whole wheat roti. Pressure cook chickpeas. Cook a masala of onion, ginger, garlic and tomato. Add chickpeas, salt and garam masala. Simmer.",
    isVeg: true,
    ageMinYears: 0,
  },
  {
    id: "p_egg_curry",
    title: "Quick Egg Curry",
    emoji: "🥚",
    bgGradient: ["#FFE5E5", "#E63946"],
    region: "pan_indian",
    category: "parent_healthy",
    ingredients: ["egg", "onion", "tomato", "ginger", "garlic", "garam masala"],
    steps: [
      "Boil 4 eggs, peel and lightly fry with turmeric.",
      "Make a masala of onion, ginger, garlic, tomato. Add water for gravy.",
      "Drop boiled eggs in, simmer 5 minutes. Serve with rice or roti.",
    ],
    calories: 410,
    tags: ["Protein", "Quick", "Non-Veg"],
    prepMinutes: 20,
    audioText: "Quick egg curry. Boil eggs, peel and lightly fry with turmeric. Cook a masala of onion, ginger, garlic and tomato. Add water, drop eggs in, simmer.",
    isVeg: false,
    ageMinYears: 0,
  },
  {
    id: "p_oats_upma",
    title: "Veggie Oats Upma",
    emoji: "🥣",
    bgGradient: ["#E9F5DB", "#95D5B2"],
    region: "global",
    category: "parent_healthy",
    ingredients: ["oats", "carrot", "peas", "onion", "mustard seeds", "curry leaves"],
    steps: [
      "Dry roast oats 2 minutes, set aside.",
      "Sauté mustard seeds, curry leaves, onion and veggies.",
      "Add oats and 2 cups water with salt; cook 4 minutes till soft.",
    ],
    calories: 280,
    tags: ["Healthy", "Quick", "Veg"],
    prepMinutes: 12,
    audioText: "Veggie oats upma. Dry roast oats. Sauté mustard seeds, curry leaves, onion and veggies. Add oats and water with salt. Cook till soft.",
    isVeg: true,
    ageMinYears: 0,
  },
  {
    id: "p_paneer_bhurji",
    title: "Paneer Bhurji with Toast",
    emoji: "🍳",
    bgGradient: ["#FFF1B6", "#FFB703"],
    region: "north_indian",
    category: "parent_healthy",
    ingredients: ["paneer", "onion", "tomato", "capsicum", "butter", "garam masala"],
    steps: [
      "Sauté onion and capsicum in butter till soft.",
      "Add tomato, cook till mushy. Crumble paneer in.",
      "Season with salt and garam masala. Serve with toasted bread.",
    ],
    calories: 430,
    tags: ["Protein", "Quick", "Veg"],
    prepMinutes: 15,
    audioText: "Paneer bhurji with toast. Sauté onion and capsicum in butter. Add tomato, cook till mushy. Crumble paneer in. Season with salt and garam masala.",
    isVeg: true,
    ageMinYears: 0,
  },
  {
    id: "p_curd_rice",
    title: "Tempered Curd Rice",
    emoji: "🍚",
    bgGradient: ["#F0F4FF", "#A5B4FC"],
    region: "south_indian",
    category: "parent_healthy",
    ingredients: ["rice", "curd", "milk", "mustard seeds", "curry leaves", "ginger"],
    steps: [
      "Mash cooked rice with curd and a splash of milk.",
      "Temper mustard seeds, curry leaves, ginger and dried chilli in oil.",
      "Pour over the curd rice. Serve cool.",
    ],
    calories: 360,
    tags: ["Healthy", "Quick", "Veg"],
    prepMinutes: 10,
    audioText: "Tempered curd rice. Mash cooked rice with curd and milk. Temper mustard seeds, curry leaves and ginger in oil. Pour over rice. Serve cool.",
    isVeg: true,
    ageMinYears: 0,
  },
  {
    id: "p_chicken_stew",
    title: "Light Chicken Stew",
    emoji: "🍗",
    bgGradient: ["#FFEDD8", "#E07A5F"],
    region: "global",
    category: "parent_healthy",
    ingredients: ["chicken", "carrot", "potato", "onion", "ginger", "garlic", "milk"],
    steps: [
      "Sauté onion, ginger, garlic in a little oil till soft.",
      "Add chicken pieces, carrot and potato. Pour in water and simmer.",
      "Finish with a splash of milk and cracked pepper. Serve warm.",
    ],
    calories: 460,
    tags: ["Protein", "Healthy", "Non-Veg"],
    prepMinutes: 35,
    audioText: "Light chicken stew. Sauté onion, ginger, garlic. Add chicken, carrot and potato with water. Simmer. Finish with milk and pepper.",
    isVeg: false,
    ageMinYears: 0,
  },

  // ─── NEW MEALS FROM DATASET ───────────────────────────────────────────────
  {
    id: "p_egg_bhurji",
    title: "Egg Bhurji",
    emoji: "🍳",
    bgGradient: ["#FFF3E0", "#FB8C00"],
    region: "pan_indian",
    category: "parent_healthy",
    ingredients: ["egg", "onion", "tomato", "butter", "salt", "green chilli", "cumin"],
    steps: [
      "Heat butter in a pan. Add cumin seeds, let them splutter.",
      "Sauté finely chopped onion till translucent, add green chilli and tomato. Cook till soft.",
      "Beat 2-3 eggs with salt and pour in. Stir continuously on medium heat.",
      "Scramble till just cooked and fluffy. Serve hot with toast or roti.",
    ],
    calories: 220,
    tags: ["Protein", "Quick", "Non-Veg"],
    prepMinutes: 10,
    audioText: "Egg bhurji. Heat butter, add cumin. Sauté onion, chilli and tomato. Beat eggs with salt, pour in and scramble till fluffy. Serve hot.",
    isVeg: false,
    ageMinYears: 0,
  },
  {
    id: "p_masala_dosa",
    title: "Masala Dosa",
    emoji: "🫔",
    bgGradient: ["#FFF8E1", "#FFB300"],
    region: "south_indian",
    category: "parent_healthy",
    ingredients: ["rice", "urad dal", "potato", "onion", "mustard seeds", "turmeric", "curry leaves"],
    steps: [
      "Ferment rice-urad dal batter overnight. Keep ready.",
      "Make potato filling: sauté mustard seeds, curry leaves, onion. Add boiled mashed potato with turmeric and salt.",
      "Spread a thin ladleful of batter on a hot greased tawa to form a large dosa.",
      "Place 2 spoonfuls of filling in the centre, fold dosa over and serve with sambar and coconut chutney.",
    ],
    calories: 280,
    tags: ["Healthy", "Veg"],
    prepMinutes: 25,
    audioText: "Masala dosa. Ferment rice-dal batter overnight. Make potato filling with mustard seeds, curry leaves and turmeric. Spread batter thin on hot tawa. Fill with potato mix and fold. Serve with sambar and chutney.",
    isVeg: true,
    ageMinYears: 2,
  },
  {
    id: "p_veg_pulao",
    title: "Vegetable Pulao",
    emoji: "🍛",
    bgGradient: ["#E8F5E9", "#66BB6A"],
    region: "pan_indian",
    category: "parent_healthy",
    ingredients: ["rice", "carrot", "peas", "beans", "onion", "ghee", "bay leaf", "garam masala"],
    steps: [
      "Wash and soak basmati rice for 15 minutes. Drain.",
      "Heat ghee in a pot, add bay leaf, whole spices and sliced onion. Sauté till golden.",
      "Add chopped vegetables (carrot, peas, beans), stir for 2 minutes.",
      "Add rice, 1¾ cups water, salt and garam masala. Cover and cook on low heat for 12 minutes.",
      "Fluff with a fork and serve hot with raita.",
    ],
    calories: 260,
    tags: ["Healthy", "Veg"],
    prepMinutes: 20,
    audioText: "Vegetable pulao. Soak basmati rice. Heat ghee, add spices and onion till golden. Add veggies, then rice and water. Cover and cook on low heat. Serve with raita.",
    isVeg: true,
    ageMinYears: 2,
  },
  {
    id: "p_rava_upma",
    title: "Vegetable Rava Upma",
    emoji: "🥣",
    bgGradient: ["#FFF9C4", "#F9A825"],
    region: "maharashtrian",
    category: "parent_healthy",
    ingredients: ["rava", "onion", "tomato", "peas", "carrot", "mustard seeds", "curry leaves", "ghee"],
    steps: [
      "Dry roast rava in a pan on medium heat for 3-4 minutes till lightly golden. Set aside.",
      "Heat ghee, add mustard seeds and curry leaves. Add onion and sauté till soft.",
      "Add chopped tomato, peas and carrot. Cook 2 minutes.",
      "Pour in 2 cups hot water with salt. Slowly add rava while stirring to avoid lumps.",
      "Cover and cook on low for 3-4 minutes. Serve hot with coconut chutney.",
    ],
    calories: 210,
    tags: ["Healthy", "Quick", "Veg"],
    prepMinutes: 15,
    audioText: "Vegetable rava upma. Dry roast rava till lightly golden. Temper mustard seeds and curry leaves in ghee. Add onion, tomato, peas and carrot. Pour hot water, add rava and stir. Cover and cook. Serve with chutney.",
    isVeg: true,
    ageMinYears: 2,
  },

  // ─── KIDS TIFFIN — NEW ────────────────────────────────────────────────────
  {
    id: "k_masala_dosa_mini",
    title: "Mini Masala Dosa",
    emoji: "🫔",
    bgGradient: ["#FFFDE7", "#F9A825"],
    region: "south_indian",
    category: "kids_tiffin",
    ingredients: ["dosa batter", "potato", "onion", "mustard seeds", "turmeric", "ghee"],
    steps: [
      "Make a soft potato filling with mustard seeds, onion and a pinch of turmeric.",
      "Spread a small dosa on a hot tawa. Place a spoonful of filling in the centre.",
      "Fold the dosa into a cone or roll and serve with a small cup of sambar.",
    ],
    calories: 230,
    tags: ["Healthy", "Veg"],
    prepMinutes: 15,
    audioText: "Mini masala dosa. Make potato filling with mustard seeds and turmeric. Spread a small dosa, fill with potato and fold. Serve with sambar.",
    isVeg: true,
    ageMinYears: 2,
  },
  {
    id: "k_veg_pulao_box",
    title: "Veg Pulao Tiffin Box",
    emoji: "🍛",
    bgGradient: ["#F1F8E9", "#8BC34A"],
    region: "pan_indian",
    category: "kids_tiffin",
    ingredients: ["rice", "peas", "carrot", "corn", "ghee", "cumin", "salt"],
    steps: [
      "Heat ghee in a small pot, add cumin seeds. Let them crackle.",
      "Add peas, carrot and corn. Sauté for 1 minute.",
      "Add washed rice, 1¾ cups water and salt. Cover and cook on low heat 12 minutes.",
      "Fluff gently, cool slightly and pack in tiffin box with a small raita.",
    ],
    calories: 240,
    tags: ["Healthy", "Quick", "Veg"],
    prepMinutes: 18,
    audioText: "Veg pulao tiffin box. Temper cumin in ghee. Add peas, carrot and corn. Add rice and water. Cover and cook till done. Pack with raita.",
    isVeg: true,
    ageMinYears: 2,
  },
];

// ─── Normalisation ──────────────────────────────────────────────────────────
function norm(s: string): string {
  return (s || "").toLowerCase().trim();
}

// ─── Filter + Rank ──────────────────────────────────────────────────────────
export interface SuggestionInput {
  region: MealRegion | string;
  audience: "kids_tiffin" | "parent_healthy";
  fridgeItems: string[];
  childAge?: number;          // years
  isVeg?: boolean;            // true → veg only; false/undefined → both ok
  hour?: number;              // 0–23 — affects amyMessage
  /** Meal IDs the child has previously eaten — boosted in ranking. */
  likedMealIds?: string[];
  /** Meal IDs the child has refused — suppressed (still returned only as a
   *  fallback when nothing else qualifies). */
  dislikedMealIds?: string[];
}

export interface RankedMeal extends MealRecipe {
  matchScore: number;         // higher = better
  matchedIngredients: string[];
  missingIngredients: string[];
}

export interface SuggestionResult {
  meals: RankedMeal[];
  amyMessage: string;
  usedFallback: boolean;      // true when no fridge match available
}

export function suggestMeals(input: SuggestionInput): SuggestionResult {
  const region = norm(input.region) as MealRegion;
  const fridge = (input.fridgeItems || []).map(norm).filter(Boolean);
  const age = Number.isFinite(input.childAge) ? Number(input.childAge) : 0;
  const liked = new Set((input.likedMealIds || []).filter(Boolean));
  const disliked = new Set((input.dislikedMealIds || []).filter(Boolean));

  const pool = MEALS.filter(m => m.category === input.audience);

  // Veg filter — only restrict when isVeg === true
  const dietPool = input.isVeg === true ? pool.filter(m => m.isVeg) : pool;

  // Age suitability — kid tiffin only
  const agePool = input.audience === "kids_tiffin"
    ? dietPool.filter(m => age <= 0 || age >= m.ageMinYears)
    : dietPool;

  // Score each meal
  const scored: RankedMeal[] = agePool.map(m => {
    const ing = m.ingredients.map(norm);
    const matched = fridge.filter(f => ing.some(i => i.includes(f) || f.includes(i)));
    const missing = ing.filter(i => !fridge.some(f => i.includes(f) || f.includes(i)));
    const matchRatio = ing.length > 0 ? matched.length / ing.length : 0;

    let score = 0;

    if (fridge.length > 0) {
      // ── Fridge mode: what can I MAKE right now? ──
      // Fridge match is the PRIMARY signal. Meals with zero matches are
      // pushed to the very bottom so users only see cookable options first.
      if (matched.length === 0) {
        score -= 200; // Can't make → bottom of list
      } else {
        score += Math.round(matchRatio * 120);       // up to 120 pts for full match
        if (matched.length >= ing.length) score += 50; // perfect "can make now" bonus
        // Region is secondary when fridge provided
        if (m.region === region) score += 15;
        else if (region === "pan_indian" || m.region === "pan_indian") score += 5;
      }
    } else {
      // ── Browse mode: no fridge items — show popular regional meals ──
      if (m.region === region) score += 40;
      else if (region === "pan_indian" || m.region === "pan_indian") score += 12;
      score += Math.round(matchRatio * 50);
      if (m.prepMinutes > 25) score -= 4; // slightly prefer quick meals
    }

    // Quick/easy bonus (always)
    if (m.tags.includes("Quick")) score += 6;
    if (m.tags.includes("Healthy")) score += 4;

    // ── Learning loop from Tiffin Feedback ──
    if (liked.has(m.id)) score += 30;
    if (disliked.has(m.id)) score -= 80;

    return { ...m, matchScore: score, matchedIngredients: matched, missingIngredients: missing };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  // If user gave fridge items but nothing matched any meal, flag fallback
  const anyMatched = fridge.length > 0 && scored.some(m => m.matchedIngredients.length > 0);
  const usedFallback = fridge.length > 0 && !anyMatched;

  // When fridge is provided, only return meals that CAN be made (matched > 0).
  // If nothing matched at all (fallback), return top regional meals instead.
  let top: RankedMeal[];
  if (fridge.length > 0 && !usedFallback) {
    const cookable = scored.filter(m => m.matchedIngredients.length > 0);
    top = cookable.slice(0, 12);
  } else {
    top = scored.slice(0, 12);
  }

  return {
    meals: top,
    amyMessage: buildAmyMessage(input, top, usedFallback),
    usedFallback,
  };
}

// ─── Amy AI message — local template, no API call ───────────────────────────
function buildAmyMessage(
  input: SuggestionInput,
  meals: RankedMeal[],
  usedFallback: boolean,
): string {
  const hour = typeof input.hour === "number" ? input.hour : new Date().getHours();
  const tod =
    hour < 11 ? "morning"
    : hour < 15 ? "lunch time"
    : hour < 18 ? "evening"
    : "dinner time";

  const audienceLabel = input.audience === "kids_tiffin" ? "your child's tiffin" : "your healthy meal";
  const top = meals[0];

  if (!top) {
    return `Amy AI Suggests: I couldn't find a perfect match — try adding a few staples like rice, dal, paneer or bread.`;
  }

  if (usedFallback) {
    return `Amy AI Suggests: Nothing in your fridge matched today — based on your region, **${top.title}** is a great pick for ${audienceLabel}.`;
  }

  const fridgeCount = (input.fridgeItems || []).filter(Boolean).length;
  if (fridgeCount > 0 && top.matchedIngredients.length > 0) {
    return `Amy AI Suggests: Based on your fridge and region, try **${top.title}** for ${audienceLabel} this ${tod}. It uses ${top.matchedIngredients.length} item(s) you already have.`;
  }

  return `Amy AI Suggests: For this ${tod}, **${top.title}** is a perfect ${audienceLabel} pick from your region.`;
}
