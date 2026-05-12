// Nutrition Hub – Science-backed data based on ICMR-NIN 2020 RDA & WHO guidelines.
// Use only as educational reference. See medical disclaimer in the UI.

export type AgeGroupId =
  | "infant_0_6" | "infant_6_12" | "toddler_1_3" | "preschool_3_6"
  | "school_6_10" | "preteen_10_15" | "adult" | "pregnancy" | "postpartum";

export type AgeGroup = {
  id: AgeGroupId;
  label: string;
  emoji: string;
  colorClass: string;       // Tailwind bg color (card bg)
  textClass: string;        // Tailwind text color
  borderClass: string;      // Tailwind border color
  badgeBg: string;
  description: string;
  keyFocus: string[];       // Nutrition priorities for this age
};

export const AGE_GROUPS: AgeGroup[] = [
  {
    id: "infant_0_6",
    label: "0–6 Months",
    emoji: "🍼",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    badgeBg: "bg-muted",
    description: "Breast milk is the only food needed. WHO recommends exclusive breastfeeding for 6 months.",
    keyFocus: ["Exclusive breastfeeding", "Vitamin D supplementation", "Iron stores from birth"],
  },
  {
    id: "infant_6_12",
    label: "6–12 Months",
    emoji: "🥣",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    badgeBg: "bg-muted",
    description: "Introduce complementary foods at 6 months while continuing breastfeeding. Focus on iron-rich foods.",
    keyFocus: ["Iron-rich first foods", "Zinc", "Complementary feeding", "No salt/sugar"],
  },
  {
    id: "toddler_1_3",
    label: "1–3 Years",
    emoji: "🧒",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    badgeBg: "bg-muted",
    description: "Rapid brain development phase. Needs diverse foods 5–6 times a day in small portions.",
    keyFocus: ["Healthy fats (brain)", "Calcium for bones", "Iron", "Vitamin A", "Diverse diet"],
  },
  {
    id: "preschool_3_6",
    label: "3–6 Years",
    emoji: "🎒",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    badgeBg: "bg-muted",
    description: "Energy needs increase with activity. Establish healthy food habits early. Avoid junk food.",
    keyFocus: ["Energy (carbs + protein)", "Calcium", "Vitamin C for immunity", "Fiber"],
  },
  {
    id: "school_6_10",
    label: "6–10 Years",
    emoji: "📚",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    badgeBg: "bg-muted",
    description: "School age needs focus on brain fuel and immunity. Regular meals improve concentration.",
    keyFocus: ["B vitamins (brain)", "Iron (concentration)", "Calcium (bones)", "Breakfast daily"],
  },
  {
    id: "preteen_10_15",
    label: "10–15 Years",
    emoji: "🌱",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    badgeBg: "bg-muted",
    description: "Puberty — highest calcium and iron needs. Girls need extra iron. Avoid crash diets.",
    keyFocus: ["Calcium (peak bone mass)", "Iron (girls)", "Protein (muscle)", "Zinc"],
  },
  {
    id: "adult",
    label: "Adults",
    emoji: "👨‍👩",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    badgeBg: "bg-muted",
    description: "Balanced diet for sustained energy. Focus on fiber, antioxidants, and healthy fats.",
    keyFocus: ["Balanced macros", "Vitamin D", "B12 (vegetarians)", "Fiber", "Hydration"],
  },
  {
    id: "pregnancy",
    label: "Pregnancy",
    emoji: "🤰",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    badgeBg: "bg-muted",
    description: "Critical 1,000-day window. Extra calories, folic acid, iron, and calcium essential.",
    keyFocus: ["Folic acid (neural tube)", "Iron (anemia)", "Calcium", "Omega-3 (brain)", "Iodine"],
  },
  {
    id: "postpartum",
    label: "Postpartum",
    emoji: "🤱",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    badgeBg: "bg-muted",
    description: "Recovery + breastfeeding needs extra calories, protein, and iron. Stay hydrated.",
    keyFocus: ["Protein (milk production)", "Iron (recovery)", "Calcium", "Omega-3", "Hydration"],
  },
];

// ─── Nutrient Types ─────────────────────────────────────────────────────────

export type FoodSource = {
  name: string;
  emoji: string;
  type: "veg" | "nonveg" | "both";
  serving: string;
  amount: string;
};

export type DailyNeed = {
  amount: string;
  unit: string;
  note?: string;
};

export type Nutrient = {
  id: string;
  name: string;
  emoji: string;
  colorClass: string;
  textClass: string;
  borderClass: string;
  tagline: string;
  benefits: string[];
  sources: FoodSource[];
  deficiencySymptoms: string[];
  dailyNeeds: Record<AgeGroupId, DailyNeed>;
};

export const NUTRIENTS: Nutrient[] = [
  {
    id: "protein",
    name: "Protein",
    emoji: "💪",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    tagline: "Building block of life",
    benefits: [
      "Builds and repairs muscles and tissues",
      "Supports immune system (antibodies)",
      "Makes enzymes and hormones",
      "Essential for child growth and development",
      "Provides energy (4 kcal/g)",
    ],
    sources: [
      { name: "Dal (Lentils)", emoji: "🫘", type: "veg", serving: "1 katori (100g cooked)", amount: "8–9g" },
      { name: "Paneer", emoji: "🧀", type: "veg", serving: "100g", amount: "18g" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 eggs", amount: "12g" },
      { name: "Chicken", emoji: "🍗", type: "nonveg", serving: "100g cooked", amount: "25–27g" },
      { name: "Soybean/Tofu", emoji: "🫘", type: "veg", serving: "100g", amount: "17g" },
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 glass (200ml)", amount: "6.5g" },
      { name: "Curd (Dahi)", emoji: "🍶", type: "veg", serving: "1 katori (100g)", amount: "3.5g" },
      { name: "Fish", emoji: "🐟", type: "nonveg", serving: "100g cooked", amount: "20–22g" },
      { name: "Rajma / Chole", emoji: "🫘", type: "veg", serving: "1 katori", amount: "8g" },
      { name: "Groundnuts", emoji: "🥜", type: "veg", serving: "30g", amount: "7.5g" },
    ],
    deficiencySymptoms: [
      "Slow growth in children (stunting)",
      "Frequent infections / poor immunity",
      "Hair loss and brittle nails",
      "Muscle weakness and fatigue",
      "Oedema (fluid swelling) in severe cases",
      "Delayed wound healing",
    ],
    dailyNeeds: {
      infant_0_6:    { amount: "~9.1", unit: "g/day", note: "From breast milk" },
      infant_6_12:   { amount: "~14", unit: "g/day", note: "Breast milk + complementary foods" },
      toddler_1_3:   { amount: "12.5", unit: "g/day", note: "ICMR-NIN 2020" },
      preschool_3_6: { amount: "16.7", unit: "g/day", note: "ICMR-NIN 2020" },
      school_6_10:   { amount: "23.4", unit: "g/day", note: "ICMR-NIN 2020" },
      preteen_10_15: { amount: "35–50", unit: "g/day", note: "Higher for boys; girls need ~40g" },
      adult:         { amount: "0.8–1", unit: "g/kg/day", note: "~54g men, ~46g women (sedentary)" },
      pregnancy:     { amount: "+14.5", unit: "g/day extra", note: "Additional protein over adult RDA" },
      postpartum:    { amount: "+18", unit: "g/day extra", note: "For breastfeeding mothers" },
    },
  },
  {
    id: "iron",
    name: "Iron",
    emoji: "🩸",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    tagline: "Carries oxygen to every cell",
    benefits: [
      "Forms haemoglobin — carries oxygen in blood",
      "Essential for cognitive development in children",
      "Supports energy production and metabolism",
      "Critical for brain development in infants",
      "Supports muscle function",
    ],
    sources: [
      { name: "Ragi (Finger Millet)", emoji: "🌾", type: "veg", serving: "100g", amount: "3.9mg" },
      { name: "Spinach (Palak)", emoji: "🌿", type: "veg", serving: "1 katori cooked", amount: "3.5mg" },
      { name: "Liver (Mutton/Chicken)", emoji: "🍖", type: "nonveg", serving: "50g", amount: "5–6mg" },
      { name: "Rajma (Kidney Beans)", emoji: "🫘", type: "veg", serving: "1 katori cooked", amount: "3mg" },
      { name: "Sesame Seeds (Til)", emoji: "🌱", type: "veg", serving: "1 tbsp", amount: "1.3mg" },
      { name: "Dates (Khajoor)", emoji: "🌴", type: "veg", serving: "3 dates", amount: "1.2mg" },
      { name: "Chicken / Mutton", emoji: "🍗", type: "nonveg", serving: "100g", amount: "1.5–2.5mg" },
      { name: "Jaggery (Gud)", emoji: "🍯", type: "veg", serving: "10g piece", amount: "1.1mg" },
      { name: "Pumpkin Seeds", emoji: "🎃", type: "veg", serving: "30g", amount: "2.5mg" },
      { name: "Fortified Cereals", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "4–8mg" },
    ],
    deficiencySymptoms: [
      "Iron-deficiency anaemia — pale skin, fatigue",
      "Poor attention and learning difficulty in children",
      "Breathlessness on exertion",
      "Frequent infections",
      "Cold hands/feet, headache, dizziness",
      "Pica (craving for non-food items) in children",
    ],
    dailyNeeds: {
      infant_0_6:    { amount: "0.27", unit: "mg/day", note: "Provided by breast milk; AI level" },
      infant_6_12:   { amount: "11", unit: "mg/day", note: "Critical — start iron-rich foods" },
      toddler_1_3:   { amount: "17", unit: "mg/day", note: "ICMR-NIN 2020" },
      preschool_3_6: { amount: "22", unit: "mg/day", note: "ICMR-NIN 2020" },
      school_6_10:   { amount: "26", unit: "mg/day", note: "ICMR-NIN 2020" },
      preteen_10_15: { amount: "26–32", unit: "mg/day", note: "Girls need more due to menstruation" },
      adult:         { amount: "17–21", unit: "mg/day", note: "Men 17mg; women 21mg (pre-menopause)" },
      pregnancy:     { amount: "35", unit: "mg/day", note: "Supplement usually prescribed" },
      postpartum:    { amount: "21", unit: "mg/day", note: "Recovery of blood lost at delivery" },
    },
  },
  {
    id: "calcium",
    name: "Calcium",
    emoji: "🦴",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    tagline: "For strong bones and teeth",
    benefits: [
      "Builds and maintains strong bones and teeth",
      "Enables muscle contraction (including heart)",
      "Essential for nerve signal transmission",
      "Supports blood clotting",
      "Peak bone mass built by age 25 — childhood matters!",
    ],
    sources: [
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 glass (200ml)", amount: "240mg" },
      { name: "Paneer", emoji: "🧀", type: "veg", serving: "50g", amount: "190mg" },
      { name: "Ragi (Finger Millet)", emoji: "🌾", type: "veg", serving: "100g", amount: "344mg" },
      { name: "Curd (Dahi)", emoji: "🍶", type: "veg", serving: "200g", amount: "240mg" },
      { name: "Sesame Seeds (Til)", emoji: "🌱", type: "veg", serving: "1 tbsp", amount: "88mg" },
      { name: "Drumstick Leaves (Sahjan)", emoji: "🌿", type: "veg", serving: "100g", amount: "440mg" },
      { name: "Amaranth (Rajgira)", emoji: "🌾", type: "veg", serving: "100g", amount: "267mg" },
      { name: "Fish with Bones (sardines)", emoji: "🐟", type: "nonveg", serving: "85g", amount: "325mg" },
      { name: "Figs (Anjeer)", emoji: "🌸", type: "veg", serving: "2 dried figs", amount: "55mg" },
      { name: "Almonds", emoji: "🫘", type: "veg", serving: "30g (≈23)", amount: "76mg" },
    ],
    deficiencySymptoms: [
      "Rickets in children — bow legs, soft skull",
      "Osteoporosis in adults — brittle bones",
      "Muscle cramps and spasms",
      "Dental problems — weak teeth",
      "Delayed teething in infants",
      "Numbness/tingling in hands and feet",
    ],
    dailyNeeds: {
      infant_0_6:    { amount: "300", unit: "mg/day", note: "From breast milk" },
      infant_6_12:   { amount: "400", unit: "mg/day", note: "ICMR-NIN 2020" },
      toddler_1_3:   { amount: "600", unit: "mg/day", note: "ICMR-NIN 2020" },
      preschool_3_6: { amount: "700", unit: "mg/day", note: "ICMR-NIN 2020" },
      school_6_10:   { amount: "800", unit: "mg/day", note: "ICMR-NIN 2020" },
      preteen_10_15: { amount: "1200", unit: "mg/day", note: "Peak bone building phase" },
      adult:         { amount: "600", unit: "mg/day", note: "ICMR-NIN 2020" },
      pregnancy:     { amount: "1200", unit: "mg/day", note: "For fetal bone development" },
      postpartum:    { amount: "1200", unit: "mg/day", note: "Breastfeeding demands" },
    },
  },
  {
    id: "vitamin_a",
    name: "Vitamin A",
    emoji: "👁️",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    tagline: "For vision, growth & immunity",
    benefits: [
      "Essential for vision — especially night vision",
      "Supports skin and mucous membrane health",
      "Critical for child growth and immune function",
      "Protects against respiratory and GI infections",
      "Antioxidant properties",
    ],
    sources: [
      { name: "Carrot", emoji: "🥕", type: "veg", serving: "1 medium (60g)", amount: "500mcg RAE" },
      { name: "Sweet Potato", emoji: "🍠", type: "veg", serving: "100g baked", amount: "960mcg RAE" },
      { name: "Spinach (Palak)", emoji: "🌿", type: "veg", serving: "100g cooked", amount: "524mcg RAE" },
      { name: "Pumpkin", emoji: "🎃", type: "veg", serving: "100g cooked", amount: "400mcg RAE" },
      { name: "Eggs (yolk)", emoji: "🥚", type: "nonveg", serving: "2 eggs", amount: "80mcg RAE" },
      { name: "Liver", emoji: "🍖", type: "nonveg", serving: "25g", amount: "1500mcg RAE" },
      { name: "Mango", emoji: "🥭", type: "veg", serving: "100g", amount: "38mcg RAE" },
      { name: "Papaya", emoji: "🍈", type: "veg", serving: "100g", amount: "47mcg RAE" },
      { name: "Whole Milk / Ghee", emoji: "🥛", type: "veg", serving: "1 tsp ghee", amount: "13mcg RAE" },
    ],
    deficiencySymptoms: [
      "Night blindness (early sign) — can't see in dim light",
      "Xerophthalmia — dry eyes, eventually blindness",
      "Increased susceptibility to infections",
      "Dry, rough skin and hair",
      "Poor growth in children",
    ],
    dailyNeeds: {
      infant_0_6:    { amount: "400", unit: "mcg RAE/day" },
      infant_6_12:   { amount: "400", unit: "mcg RAE/day" },
      toddler_1_3:   { amount: "400", unit: "mcg RAE/day" },
      preschool_3_6: { amount: "400", unit: "mcg RAE/day" },
      school_6_10:   { amount: "600", unit: "mcg RAE/day" },
      preteen_10_15: { amount: "600", unit: "mcg RAE/day" },
      adult:         { amount: "600", unit: "mcg RAE/day", note: "Men 900, Women 700 (US RDA differs)" },
      pregnancy:     { amount: "800", unit: "mcg RAE/day" },
      postpartum:    { amount: "950", unit: "mcg RAE/day", note: "Increased for lactation" },
    },
  },
  {
    id: "vitamin_c",
    name: "Vitamin C",
    emoji: "🍋",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    tagline: "Immunity shield & iron booster",
    benefits: [
      "Powerful antioxidant — fights free radicals",
      "Boosts iron absorption from plant sources (pair with dal/spinach!)",
      "Collagen synthesis — skin, joints, wound healing",
      "Supports immune cell function",
      "Reduces duration of common cold",
    ],
    sources: [
      { name: "Amla (Indian Gooseberry)", emoji: "🍏", type: "veg", serving: "1 amla (50g)", amount: "300mg" },
      { name: "Guava", emoji: "🍐", type: "veg", serving: "1 medium (100g)", amount: "228mg" },
      { name: "Bell Pepper (Shimla Mirch)", emoji: "🫑", type: "veg", serving: "50g", amount: "95mg" },
      { name: "Lemon / Lime", emoji: "🍋", type: "veg", serving: "juice of 1 lemon", amount: "30mg" },
      { name: "Orange / Mosambi", emoji: "🍊", type: "veg", serving: "1 medium", amount: "70mg" },
      { name: "Tomato", emoji: "🍅", type: "veg", serving: "1 medium (100g)", amount: "23mg" },
      { name: "Papaya", emoji: "🍈", type: "veg", serving: "100g", amount: "62mg" },
      { name: "Raw Mango / Kachha Aam", emoji: "🥭", type: "veg", serving: "50g", amount: "28mg" },
    ],
    deficiencySymptoms: [
      "Scurvy — bleeding gums, loose teeth",
      "Poor wound healing",
      "Bruising easily",
      "Fatigue and irritability",
      "Poor iron absorption leading to anaemia",
    ],
    dailyNeeds: {
      infant_0_6:    { amount: "40", unit: "mg/day", note: "From breast milk" },
      infant_6_12:   { amount: "40", unit: "mg/day" },
      toddler_1_3:   { amount: "40", unit: "mg/day" },
      preschool_3_6: { amount: "40", unit: "mg/day" },
      school_6_10:   { amount: "40", unit: "mg/day" },
      preteen_10_15: { amount: "40", unit: "mg/day" },
      adult:         { amount: "40", unit: "mg/day", note: "ICMR; WHO/NIH recommend 75–90mg" },
      pregnancy:     { amount: "60", unit: "mg/day" },
      postpartum:    { amount: "80", unit: "mg/day" },
    },
  },
  {
    id: "vitamin_d",
    name: "Vitamin D",
    emoji: "☀️",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    tagline: "The sunshine vitamin",
    benefits: [
      "Enables calcium absorption from the gut",
      "Essential for bone mineralisation (prevents rickets)",
      "Supports immune system modulation",
      "Linked to mood regulation and mental health",
      "Muscle strength and nerve function",
    ],
    sources: [
      { name: "Sunlight (15–20 min/day)", emoji: "☀️", type: "veg", serving: "Face + arms exposed", amount: "Primary source" },
      { name: "Fish (Salmon, Tuna)", emoji: "🐟", type: "nonveg", serving: "85g", amount: "400–600 IU" },
      { name: "Eggs (yolk)", emoji: "🥚", type: "nonveg", serving: "2 eggs", amount: "80–100 IU" },
      { name: "Fortified Milk", emoji: "🥛", type: "veg", serving: "1 glass", amount: "100 IU" },
      { name: "Fortified Cereals", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "40–100 IU" },
      { name: "Mushroom (sun-exposed)", emoji: "🍄", type: "veg", serving: "100g", amount: "200–400 IU" },
    ],
    deficiencySymptoms: [
      "Rickets in children — soft bones, bowed legs",
      "Osteomalacia in adults — bone pain",
      "Muscle weakness and fatigue",
      "Depression and mood changes",
      "Frequent respiratory infections",
      "India: up to 70% of children and adults are deficient!",
    ],
    dailyNeeds: {
      infant_0_6:    { amount: "400", unit: "IU/day", note: "Supplement drops recommended by IAP" },
      infant_6_12:   { amount: "400", unit: "IU/day", note: "Supplement until adequate sun exposure" },
      toddler_1_3:   { amount: "600", unit: "IU/day" },
      preschool_3_6: { amount: "600", unit: "IU/day" },
      school_6_10:   { amount: "600", unit: "IU/day" },
      preteen_10_15: { amount: "600", unit: "IU/day" },
      adult:         { amount: "600", unit: "IU/day", note: "Many need 1000–2000 IU supplements in India" },
      pregnancy:     { amount: "600", unit: "IU/day", note: "Many doctors prescribe 2000 IU" },
      postpartum:    { amount: "600", unit: "IU/day" },
    },
  },
  {
    id: "vitamin_b",
    name: "B Vitamins",
    emoji: "⚡",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    tagline: "Energy metabolism & brain power",
    benefits: [
      "B1 (Thiamine): carbohydrate energy conversion",
      "B2 (Riboflavin): fat and protein metabolism",
      "B3 (Niacin): DNA repair, skin health",
      "B6: brain development, immune function, mood",
      "B9 (Folate): cell division, crucial in pregnancy",
      "Collectively support nerve function and energy",
    ],
    sources: [
      { name: "Whole Grains (Atta, Brown Rice)", emoji: "🌾", type: "veg", serving: "2 roti", amount: "B1: 0.3mg, B3: 2mg" },
      { name: "Dal / Legumes", emoji: "🫘", type: "veg", serving: "1 katori", amount: "Folate: 130mcg, B6: 0.2mg" },
      { name: "Green Leafy Vegetables", emoji: "🥬", type: "veg", serving: "1 katori", amount: "Folate: 100–200mcg" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 eggs", amount: "B2: 0.5mg, B6: 0.2mg" },
      { name: "Chicken / Fish", emoji: "🍗", type: "nonveg", serving: "100g", amount: "B3: 8–14mg, B6: 0.6mg" },
      { name: "Groundnuts (Mungfali)", emoji: "🥜", type: "veg", serving: "30g", amount: "B3: 3.8mg, Folate: 68mcg" },
      { name: "Banana", emoji: "🍌", type: "veg", serving: "1 medium", amount: "B6: 0.4mg" },
    ],
    deficiencySymptoms: [
      "B1: Beriberi — nerve/heart damage",
      "B2: Cracked lips, mouth sores, eye sensitivity",
      "B3: Pellagra — dermatitis, diarrhoea, dementia",
      "B6: Irritability, depression, anaemia",
      "B9: Neural tube defects in newborns (folate deficiency during pregnancy)",
    ],
    dailyNeeds: {
      infant_0_6:    { amount: "0.2 / 0.3 / 2 / 0.4mcg", unit: "B1/B2/B3/B6", note: "From breast milk" },
      infant_6_12:   { amount: "0.3 / 0.4 / 4 / 0.6mcg", unit: "B1/B2/B3/B6" },
      toddler_1_3:   { amount: "0.5 / 0.6 / 6 / 0.5mg", unit: "B1/B2/B3/B6" },
      preschool_3_6: { amount: "0.6 / 0.6 / 8 / 0.6mg", unit: "B1/B2/B3/B6" },
      school_6_10:   { amount: "0.9 / 1.0 / 12 / 1.0mg", unit: "B1/B2/B3/B6" },
      preteen_10_15: { amount: "1.0 / 1.2 / 14 / 1.2mg", unit: "B1/B2/B3/B6" },
      adult:         { amount: "1.2 / 1.3 / 16 / 1.3mg", unit: "B1/B2/B3/B6" },
      pregnancy:     { amount: "+0.2 / +0.3 / +2 / 1.9mg", unit: "B1/B2/B3/B6 + Folate 600mcg" },
      postpartum:    { amount: "+0.3 / +0.5 / +3 / 2.0mg", unit: "B1/B2/B3/B6 + Folate 500mcg" },
    },
  },
  {
    id: "vitamin_b12",
    name: "Vitamin B12",
    emoji: "🔴",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    tagline: "Nerve health & red blood cells",
    benefits: [
      "Forms and maintains the myelin sheath protecting nerves",
      "Produces red blood cells (prevents megaloblastic anaemia)",
      "DNA synthesis in every dividing cell",
      "Supports brain function and mood",
      "Critical for vegan/vegetarian families (animal-only source)",
    ],
    sources: [
      { name: "Meat / Chicken", emoji: "🍗", type: "nonveg", serving: "100g", amount: "1–2.5mcg" },
      { name: "Fish / Shellfish", emoji: "🐟", type: "nonveg", serving: "85g", amount: "2–15mcg" },
      { name: "Eggs", emoji: "🥚", type: "nonveg", serving: "2 eggs", amount: "1.2mcg" },
      { name: "Milk", emoji: "🥛", type: "veg", serving: "1 glass (200ml)", amount: "0.9mcg" },
      { name: "Curd (Dahi)", emoji: "🍶", type: "veg", serving: "200g", amount: "1.1mcg" },
      { name: "Paneer / Cheese", emoji: "🧀", type: "veg", serving: "50g", amount: "0.5mcg" },
      { name: "Fortified Foods / Supplements", emoji: "💊", type: "veg", serving: "1 tablet", amount: "2.4mcg+" },
    ],
    deficiencySymptoms: [
      "Megaloblastic anaemia — large, immature red cells",
      "Tingling/numbness in hands and feet",
      "Memory problems, brain fog",
      "Developmental delay in infants (of B12-deficient mothers)",
      "Depression, fatigue, irritability",
      "Very common in Indian vegetarians — up to 40–70%!",
    ],
    dailyNeeds: {
      infant_0_6:    { amount: "0.4", unit: "mcg/day", note: "From breast milk" },
      infant_6_12:   { amount: "0.5", unit: "mcg/day" },
      toddler_1_3:   { amount: "0.9", unit: "mcg/day" },
      preschool_3_6: { amount: "1.2", unit: "mcg/day" },
      school_6_10:   { amount: "1.8", unit: "mcg/day" },
      preteen_10_15: { amount: "2.4", unit: "mcg/day" },
      adult:         { amount: "2.4", unit: "mcg/day", note: "Vegetarians must supplement or eat fortified foods" },
      pregnancy:     { amount: "2.6", unit: "mcg/day" },
      postpartum:    { amount: "2.8", unit: "mcg/day" },
    },
  },
  {
    id: "vitamin_k",
    name: "Vitamin K",
    emoji: "🩹",
    colorClass: "bg-muted",
    textClass: "text-foreground",
    borderClass: "border-border",
    tagline: "Blood clotting & bone strength",
    benefits: [
      "Activates clotting proteins — stops bleeding",
      "Supports bone protein (osteocalcin) synthesis",
      "K2 helps direct calcium into bones (not arteries)",
      "May protect heart health",
      "Given as injection at birth to prevent haemorrhagic disease",
    ],
    sources: [
      { name: "Green Leafy Vegetables (Palak, Methi)", emoji: "🥬", type: "veg", serving: "100g cooked", amount: "400–500mcg" },
      { name: "Broccoli", emoji: "🥦", type: "veg", serving: "100g", amount: "101mcg" },
      { name: "Soybean Oil / Mustard Oil", emoji: "🛢️", type: "veg", serving: "1 tbsp", amount: "10mcg" },
      { name: "Natto (fermented soy, K2)", emoji: "🫘", type: "veg", serving: "40g", amount: "380mcg K2" },
      { name: "Egg Yolk (K2)", emoji: "🥚", type: "nonveg", serving: "2 eggs", amount: "5mcg K2" },
      { name: "Aged Cheese (K2)", emoji: "🧀", type: "veg", serving: "30g", amount: "10mcg K2" },
      { name: "Curry Leaves (Kadi Patta)", emoji: "🌿", type: "veg", serving: "10 leaves", amount: "21mcg" },
    ],
    deficiencySymptoms: [
      "Easy bruising and prolonged bleeding",
      "Haemorrhagic disease of the newborn (if not given at birth)",
      "Osteoporosis — weak bones",
      "Heavy menstrual bleeding",
    ],
    dailyNeeds: {
      infant_0_6:    { amount: "2", unit: "mcg/day", note: "Injection given at birth" },
      infant_6_12:   { amount: "2.5", unit: "mcg/day" },
      toddler_1_3:   { amount: "30", unit: "mcg/day" },
      preschool_3_6: { amount: "55", unit: "mcg/day" },
      school_6_10:   { amount: "60", unit: "mcg/day" },
      preteen_10_15: { amount: "60–75", unit: "mcg/day" },
      adult:         { amount: "55–65", unit: "mcg/day" },
      pregnancy:     { amount: "55–65", unit: "mcg/day" },
      postpartum:    { amount: "55–65", unit: "mcg/day" },
    },
  },
];

// ─── Meal Plans ───────────────────────────────────────────────────────────────

export type MealVariant = {
  breakfast: string;
  midMorning?: string;
  lunch: string;
  snack: string;
  dinner: string;
};

export type DayPlan = {
  day: string;
  veg: MealVariant;
  nonVeg: MealVariant;
};

export type AgeGroupPlan = {
  ageCategory: string;          // display label
  portionNote: string;
  applies: AgeGroupId[];        // which age groups use this plan
  cuisines: string[];           // which foodStyle values this plan matches ("indian", "western", etc.)
  days: DayPlan[];
};

/**
 * Pick the best meal plan for a given age group + foodStyle combo.
 * Priority: exact cuisine match → "mixed"/"global" fallback → first match by age.
 * This ensures a US/UK user never sees Indian meal plans unless they explicitly
 * selected Indian cuisine during onboarding.
 */
export function getMealPlan(
  ageGroupId: AgeGroupId,
  foodStyle: string | null | undefined,
): AgeGroupPlan | undefined {
  const style = (foodStyle ?? "mixed").toLowerCase();
  const candidates = MEAL_PLANS.filter(p => p.applies.includes(ageGroupId));
  if (!candidates.length) return undefined;
  // 1. Exact cuisine match
  const exact = candidates.find(p => p.cuisines.some(c => style.includes(c) || c.includes(style)));
  if (exact) return exact;
  // 2. "mixed" / "global" fallback
  const mixed = candidates.find(p => p.cuisines.includes("mixed"));
  if (mixed) return mixed;
  // 3. First available (safety net)
  return candidates[0];
}

export const MEAL_PLANS: AgeGroupPlan[] = [
  {
    ageCategory: "Infants (6–12 months)",
    portionNote: "Start with 2–3 tsp, gradually increase to 3–4 tbsp per meal. Always continue breastfeeding.",
    applies: ["infant_6_12"],
    cuisines: ["indian", "north_indian", "south_indian", "pan_indian", "gujarati", "maharashtrian", "punjabi", "bengali"],
    days: [
      { day: "Monday", veg: { breakfast: "Breast milk / formula", lunch: "Mashed moong dal khichdi (rice + moong + ghee)", snack: "Mashed banana", dinner: "Ragi porridge with breast milk" }, nonVeg: { breakfast: "Breast milk / formula", lunch: "Mashed moong dal khichdi", snack: "Mashed papaya", dinner: "Pureed chicken + rice" } },
      { day: "Tuesday", veg: { breakfast: "Breast milk", lunch: "Mashed sweet potato + dahi", snack: "Apple puree", dinner: "Soft rice + toor dal + ghee" }, nonVeg: { breakfast: "Breast milk", lunch: "Mashed sweet potato + egg yolk", snack: "Pear puree", dinner: "Fish puree + soft rice" } },
      { day: "Wednesday", veg: { breakfast: "Breast milk", lunch: "Vegetable khichdi (carrot + beans + rice)", snack: "Banana mash", dinner: "Ragi kheer (no sugar)" }, nonVeg: { breakfast: "Breast milk", lunch: "Vegetable khichdi + minced chicken", snack: "Mango puree", dinner: "Egg + rice porridge" } },
      { day: "Thursday", veg: { breakfast: "Breast milk", lunch: "Moong dal soup + rice", snack: "Chikoo (sapota) puree", dinner: "Pumpkin + lentil mash" }, nonVeg: { breakfast: "Breast milk", lunch: "Chicken broth + soft rice", snack: "Papaya puree", dinner: "Scrambled egg (soft) + mashed pumpkin" } },
      { day: "Friday", veg: { breakfast: "Breast milk", lunch: "Palak + dal + ghee rice", snack: "Watermelon puree", dinner: "Oat porridge + breast milk" }, nonVeg: { breakfast: "Breast milk", lunch: "Minced fish + dal khichdi", snack: "Banana", dinner: "Egg yolk + oat porridge" } },
      { day: "Saturday", veg: { breakfast: "Breast milk", lunch: "Rajma mash (no salt) + soft rice", snack: "Steamed pear puree", dinner: "Ragi + banana porridge" }, nonVeg: { breakfast: "Breast milk", lunch: "Chicken + potato mash", snack: "Apple puree", dinner: "Fish + rice porridge" } },
      { day: "Sunday", veg: { breakfast: "Breast milk", lunch: "Mixed vegetable khichdi + ghee", snack: "Papaya / mango mash", dinner: "Dahi rice (plain, room temp)" }, nonVeg: { breakfast: "Breast milk", lunch: "Egg + vegetable khichdi", snack: "Chikoo puree", dinner: "Chicken + ragi porridge" } },
    ],
  },
  {
    ageCategory: "Toddlers & Preschool (1–6 years)",
    portionNote: "Small portions 5–6 times a day. 1 small katori per item. No whole nuts or hard pieces. Low salt/sugar.",
    applies: ["toddler_1_3", "preschool_3_6"],
    cuisines: ["indian", "north_indian", "south_indian", "pan_indian", "gujarati", "maharashtrian", "punjabi", "bengali"],
    days: [
      { day: "Monday", veg: { breakfast: "Ragi dosa + coconut chutney + 1 glass milk", midMorning: "Banana / seasonal fruit", lunch: "Rice + dal + sabzi (bhindi) + ghee + curd", snack: "Peanut butter toast or chikki", dinner: "Chapati + palak dal + warm milk" }, nonVeg: { breakfast: "Egg paratha + milk", midMorning: "Fruit", lunch: "Rice + dal + chicken curry (boneless)", snack: "Boiled egg + fruit", dinner: "Chapati + chicken soup" } },
      { day: "Tuesday", veg: { breakfast: "Idli (2) + sambhar + chutney", midMorning: "Dahi + banana", lunch: "Khichdi + ghee + papad + carrot salad", snack: "Ragi cookie or makhana", dinner: "Roti + toor dal + sabzi" }, nonVeg: { breakfast: "Idli + egg curry", midMorning: "Fruit", lunch: "Rice + fish curry (boneless) + dal", snack: "Egg white snack", dinner: "Roti + chicken sabzi" } },
      { day: "Wednesday", veg: { breakfast: "Upma + milk", midMorning: "Seasonal fruit", lunch: "Rice + sambar + papad + ghee + pickle", snack: "Puffed rice (muri) chaat", dinner: "Chapati + paneer sabzi + dal" }, nonVeg: { breakfast: "Egg bhurji roti + milk", midMorning: "Papaya", lunch: "Rice + mutton curry (boneless) + dal", snack: "Chicken sandwich", dinner: "Roti + dal + sabzi" } },
      { day: "Thursday", veg: { breakfast: "Paratha (gobi/aloo) + dahi + milk", midMorning: "Banana", lunch: "Rajma rice + salad + ghee", snack: "Homemade ladoo (til/nut)", dinner: "Roti + mixed dal + sabzi" }, nonVeg: { breakfast: "Paratha + egg omelette", midMorning: "Fruit", lunch: "Rajma rice + egg curry", snack: "Tuna sandwich", dinner: "Roti + chicken dal" } },
      { day: "Friday", veg: { breakfast: "Poha + peanuts + milk", midMorning: "Guava / orange", lunch: "Chole + rice + ghee + curd", snack: "Sprout chaat or makhana", dinner: "Roti + palak paneer + milk" }, nonVeg: { breakfast: "Poha + boiled egg", midMorning: "Orange", lunch: "Chole + rice + fish fry", snack: "Chicken tikka (soft)", dinner: "Roti + prawn curry + dal" } },
      { day: "Saturday", veg: { breakfast: "Pesarattu (green moong dosa) + chutney + milk", midMorning: "Fruit", lunch: "Vegetable pulao + raita + papad", snack: "Ragi malt or fruit smoothie", dinner: "Roti + dal makhani + sabzi" }, nonVeg: { breakfast: "Egg dosa + milk", midMorning: "Banana", lunch: "Chicken biryani (mild) + raita", snack: "Egg chaat", dinner: "Roti + mutton soup + sabzi" } },
      { day: "Sunday", veg: { breakfast: "Pancakes / cheela + honey + milk", midMorning: "Mango / seasonal", lunch: "Puri + aloo sabzi + kheer (special)", snack: "Fruit salad / smoothie", dinner: "Khichdi + ghee + papad (light)" }, nonVeg: { breakfast: "Egg pancake + milk", midMorning: "Seasonal fruit", lunch: "Egg biryani or chicken puri", snack: "Chicken soup", dinner: "Khichdi + chicken + papad" } },
    ],
  },
  {
    ageCategory: "School Age (6–15 years)",
    portionNote: "Regular adult-sized portions. 3 main meals + 1–2 snacks. Breakfast is non-negotiable for concentration.",
    applies: ["school_6_10", "preteen_10_15"],
    cuisines: ["indian", "north_indian", "south_indian", "pan_indian", "gujarati", "maharashtrian", "punjabi", "bengali"],
    days: [
      { day: "Monday", veg: { breakfast: "2 parathas + dahi + glass of milk", lunch: "Rice + dal + sabzi + roti + salad", snack: "Sprout chaat + amla juice", dinner: "Roti + paneer sabzi + dal + salad" }, nonVeg: { breakfast: "2 egg parathas + milk", lunch: "Rice + dal + chicken curry + salad", snack: "Boiled egg + fruit", dinner: "Roti + chicken curry + dal" } },
      { day: "Tuesday", veg: { breakfast: "Idli (3) + sambhar + chutney + milk", lunch: "Rajma rice + curd + salad", snack: "Peanut chikki or fruit", dinner: "Roti + mixed sabzi + dal + milk" }, nonVeg: { breakfast: "Idli + egg curry + milk", lunch: "Rajma rice + fish fry", snack: "Egg sandwich", dinner: "Roti + fish curry + dal" } },
      { day: "Wednesday", veg: { breakfast: "Upma / poha + milk", lunch: "Dal rice + sabzi + ghee + papad + pickle", snack: "Homemade granola bar or nuts", dinner: "Chapati + palak dal + sabzi" }, nonVeg: { breakfast: "Egg bhurji roti + milk", lunch: "Rice + prawn curry + dal", snack: "Chicken wrap", dinner: "Roti + mutton curry + sabzi" } },
      { day: "Thursday", veg: { breakfast: "Besan chilla (3) + mint chutney + milk", lunch: "Chole bhature (2) + salad + lassi", snack: "Fruit + roasted chana", dinner: "Roti + aloo gobi + dal" }, nonVeg: { breakfast: "Egg omelette + toast + milk", lunch: "Chole + egg curry + rice", snack: "Chicken sandwich", dinner: "Roti + egg curry + sabzi" } },
      { day: "Friday", veg: { breakfast: "Dosa + sambhar + chutney + milk", lunch: "Vegetable biryani + raita + papad", snack: "Roasted makhana + nimbu pani", dinner: "Roti + paneer butter masala + dal" }, nonVeg: { breakfast: "Egg dosa + milk", lunch: "Chicken biryani + raita", snack: "Boiled egg + fruit", dinner: "Roti + fish curry + sabzi" } },
      { day: "Saturday", veg: { breakfast: "Aloo paratha + dahi + lassi", lunch: "Kadhi chawal + papad + salad", snack: "Fruit smoothie + nuts", dinner: "Roti + dal makhani + sabzi + salad" }, nonVeg: { breakfast: "Egg paratha + milk", lunch: "Mutton curry + rice + salad", snack: "Chicken soup + toast", dinner: "Roti + egg bhurji + dal" } },
      { day: "Sunday", veg: { breakfast: "Puri bhaji + halwa (special) + milk", lunch: "Dal + rice + mixed sabzi + kheer", snack: "Fruit chaat + nimbu pani", dinner: "Light khichdi + ghee + papad" }, nonVeg: { breakfast: "Egg paratha + milk + fruit", lunch: "Chicken/mutton biryani + raita (special)", snack: "Chicken sandwich + juice", dinner: "Light khichdi + chicken soup" } },
    ],
  },
  {
    ageCategory: "Adults, Pregnancy & Postpartum",
    portionNote: "Balanced plate: 50% veg, 25% grains, 25% protein. Pregnant: +300–500 kcal/day. Breastfeeding: +500 kcal/day.",
    applies: ["adult", "pregnancy", "postpartum"],
    cuisines: ["indian", "north_indian", "south_indian", "pan_indian", "gujarati", "maharashtrian", "punjabi", "bengali"],
    days: [
      { day: "Monday", veg: { breakfast: "Moong dal chilla + dahi + fruits + tea/coffee", lunch: "2 roti + dal + sabzi + salad + dahi + ghee", snack: "Roasted chana + amla / orange", dinner: "2 roti + paneer sabzi + dal + salad" }, nonVeg: { breakfast: "2 egg omelette + toast + fruits + milk", lunch: "Rice + chicken curry + dal + salad", snack: "Boiled egg + fruit / nuts", dinner: "2 roti + chicken curry + dal + sabzi" } },
      { day: "Tuesday", veg: { breakfast: "Idli (3–4) + sambhar + chutney + milk", lunch: "Rajma rice + curd + salad + papad + pickle", snack: "Sprout chaat + lemon water", dinner: "Roti + mixed dal + sabzi + salad" }, nonVeg: { breakfast: "Egg paratha + fruit + milk", lunch: "Fish curry + rice + dal + salad", snack: "Tuna sandwich", dinner: "Roti + fish sabzi + dal" } },
      { day: "Wednesday", veg: { breakfast: "Poha + peanuts + dahi + fruit", lunch: "Dal + rice + aloo gobi + papad + ghee", snack: "Mixed nuts (30g) + fruit", dinner: "Roti + palak dal + sabzi" }, nonVeg: { breakfast: "Egg bhurji + toast + fruit", lunch: "Mutton curry + rice + salad", snack: "Chicken tikka + fruit", dinner: "Roti + prawn curry + sabzi" } },
      { day: "Thursday", veg: { breakfast: "Upma + coconut chutney + milk + fruit", lunch: "Chole bhature + salad + lassi", snack: "Roasted makhana + green tea", dinner: "Roti + paneer + dal + salad" }, nonVeg: { breakfast: "2 eggs (any style) + toast + fruit", lunch: "Chicken curry + rice + salad", snack: "Egg chaat + lemon water", dinner: "Roti + chicken sabzi + dal" } },
      { day: "Friday", veg: { breakfast: "Dosa (2) + sambhar + chutney + fruit + milk", lunch: "Vegetable biryani + raita + papad + pickle", snack: "Banana + groundnut chikki or nuts", dinner: "Roti + dal makhani + sabzi" }, nonVeg: { breakfast: "Fish sandwich + fruit + milk", lunch: "Prawn biryani + raita + salad", snack: "Boiled egg + fruit", dinner: "Roti + fish curry + dal" } },
      { day: "Saturday", veg: { breakfast: "Paratha + dahi + seasonal fruit + milk", lunch: "Kadhi chawal + mixed sabzi + salad", snack: "Fruit smoothie (banana + milk + seeds)", dinner: "Roti + paneer sabzi + mixed dal" }, nonVeg: { breakfast: "Egg paratha + lassi + fruit", lunch: "Mutton curry + rice + raita", snack: "Chicken soup + nuts", dinner: "Roti + chicken curry + dal + salad" } },
      { day: "Sunday", veg: { breakfast: "Special thali: puri + aloo sabzi + halwa + milk", lunch: "Dal + rice + sabzi + kheer + salad", snack: "Fruit chaat + lemon water", dinner: "Light khichdi + ghee + dahi + papad" }, nonVeg: { breakfast: "Egg paratha + special sweet + milk", lunch: "Biryani (chicken/mutton) + raita + salad", snack: "Chicken soup + fruit juice", dinner: "Light khichdi + chicken soup" } },
    ],
  },

  // ── Global / Western plans (for users with western, mixed, asian, middle_eastern cuisine) ──

  {
    ageCategory: "Infants (6–12 months)",
    portionNote: "Start with 1–2 tsp, gradually increase. Breast milk or formula remains primary. Introduce one new food at a time.",
    applies: ["infant_6_12"],
    cuisines: ["western", "mixed", "asian", "middle_eastern", "vegetarian", "global"],
    days: [
      { day: "Monday", veg: { breakfast: "Breast milk / formula", lunch: "Pureed sweet potato + breast milk", snack: "Mashed banana", dinner: "Oat porridge thinned with breast milk" }, nonVeg: { breakfast: "Breast milk / formula", lunch: "Pureed sweet potato", snack: "Mashed pear", dinner: "Pureed chicken + oat porridge" } },
      { day: "Tuesday", veg: { breakfast: "Breast milk", lunch: "Mashed avocado + soft rice cereal", snack: "Apple puree", dinner: "Carrot + pea puree" }, nonVeg: { breakfast: "Breast milk", lunch: "Mashed avocado + egg yolk", snack: "Pear puree", dinner: "Fish puree + soft rice cereal" } },
      { day: "Wednesday", veg: { breakfast: "Breast milk", lunch: "Butternut squash puree", snack: "Banana mash", dinner: "Oat porridge + pear puree" }, nonVeg: { breakfast: "Breast milk", lunch: "Butternut squash + minced chicken", snack: "Mango puree", dinner: "Egg yolk + oat cereal" } },
      { day: "Thursday", veg: { breakfast: "Breast milk", lunch: "Pea + potato mash", snack: "Blueberry puree (strained)", dinner: "Pumpkin + lentil mash" }, nonVeg: { breakfast: "Breast milk", lunch: "Chicken broth + soft rice", snack: "Papaya puree", dinner: "Scrambled egg (soft) + mashed pumpkin" } },
      { day: "Friday", veg: { breakfast: "Breast milk", lunch: "Spinach + potato puree", snack: "Watermelon puree (strained)", dinner: "Oat porridge + breast milk" }, nonVeg: { breakfast: "Breast milk", lunch: "Minced fish + soft rice", snack: "Banana", dinner: "Egg yolk + oat porridge" } },
      { day: "Saturday", veg: { breakfast: "Breast milk", lunch: "Lentil + carrot soup (pureed)", snack: "Steamed pear puree", dinner: "Rice cereal + banana porridge" }, nonVeg: { breakfast: "Breast milk", lunch: "Chicken + potato mash", snack: "Apple puree", dinner: "Fish + rice porridge" } },
      { day: "Sunday", veg: { breakfast: "Breast milk", lunch: "Mixed vegetable puree (carrot + zucchini + pea)", snack: "Papaya / mango mash", dinner: "Plain yoghurt (full-fat) thinned with breast milk" }, nonVeg: { breakfast: "Breast milk", lunch: "Egg + vegetable puree", snack: "Strawberry puree (strained)", dinner: "Chicken + oat porridge" } },
    ],
  },
  {
    ageCategory: "Toddlers & Preschool (1–6 years)",
    portionNote: "Small portions 5–6 times a day. No whole nuts or hard pieces. Low salt/sugar. Offer variety — don't force.",
    applies: ["toddler_1_3", "preschool_3_6"],
    cuisines: ["western", "mixed", "asian", "middle_eastern", "vegetarian", "global"],
    days: [
      { day: "Monday", veg: { breakfast: "Oatmeal with berries + warm milk", midMorning: "Banana slices", lunch: "Whole-wheat pasta + tomato sauce + grated cheese + steamed broccoli", snack: "Hummus + veggie sticks", dinner: "Lentil soup + soft bread + milk" }, nonVeg: { breakfast: "Scrambled egg + toast + milk", midMorning: "Fruit", lunch: "Chicken pasta + steamed peas", snack: "Cheese + crackers", dinner: "Fish finger + mashed potato + milk" } },
      { day: "Tuesday", veg: { breakfast: "Pancakes + fruit + yoghurt", midMorning: "Apple slices + peanut butter", lunch: "Veggie stir-fry + soft noodles + tofu", snack: "Cheese cube + grapes", dinner: "Bean quesadilla + avocado + milk" }, nonVeg: { breakfast: "French toast + fruit + milk", midMorning: "Fruit", lunch: "Chicken noodle soup + bread roll", snack: "Boiled egg + fruit", dinner: "Mini chicken tacos + avocado" } },
      { day: "Wednesday", veg: { breakfast: "Whole-wheat toast + peanut butter + banana + milk", midMorning: "Seasonal fruit", lunch: "Veggie omelette + toast + fruit", snack: "Yoghurt + granola", dinner: "Vegetable fried rice + edamame + milk" }, nonVeg: { breakfast: "Egg omelette + toast + milk", midMorning: "Orange", lunch: "Tuna sandwich + salad", snack: "Chicken nugget + fruit", dinner: "Egg fried rice + veggie sticks" } },
      { day: "Thursday", veg: { breakfast: "Porridge + honey + blueberries + milk", midMorning: "Banana", lunch: "Cheese + veggie wrap + carrot sticks", snack: "Fruit smoothie", dinner: "Tomato lentil soup + crusty bread + milk" }, nonVeg: { breakfast: "Boiled egg + toast + fruit + milk", midMorning: "Fruit", lunch: "Chicken wrap + salad", snack: "Yoghurt + fruit", dinner: "Meatball soup + noodles + milk" } },
      { day: "Friday", veg: { breakfast: "French toast + maple syrup + fruit + milk", midMorning: "Pear / apple", lunch: "Mac & cheese + peas + fruit", snack: "Veggie sticks + hummus", dinner: "Veggie pizza (soft base) + milk" }, nonVeg: { breakfast: "Egg + toast + fruit + milk", midMorning: "Banana", lunch: "Tuna melt on toast + fruit", snack: "Chicken strip + fruit", dinner: "Cheese + chicken mini pizza" } },
      { day: "Saturday", veg: { breakfast: "Smoothie bowl (banana + yoghurt + berries)", midMorning: "Fruit", lunch: "Bean burger (soft) + sweet potato fries", snack: "Cheese + apple slices", dinner: "Creamy vegetable soup + bread + milk" }, nonVeg: { breakfast: "Mini pancakes + egg + fruit + milk", midMorning: "Banana", lunch: "Chicken burger (soft) + baked fries", snack: "Boiled egg + crackers", dinner: "Chicken noodle soup + roll" } },
      { day: "Sunday", veg: { breakfast: "Waffles + fruit + yoghurt + milk (special)", midMorning: "Seasonal fruit", lunch: "Pasta bake + cheese + salad", snack: "Fruit salad + yoghurt", dinner: "Mild veggie curry + soft rice + milk" }, nonVeg: { breakfast: "Egg + waffle + fruit + milk", midMorning: "Seasonal fruit", lunch: "Roast chicken + mashed potato + peas (special)", snack: "Chicken soup + crackers", dinner: "Fish cake + rice + salad" } },
    ],
  },
  {
    ageCategory: "School Age (6–15 years)",
    portionNote: "3 main meals + 1–2 snacks. Breakfast powers concentration. Balance carbs, protein, healthy fats, and colour at every meal.",
    applies: ["school_6_10", "preteen_10_15"],
    cuisines: ["western", "mixed", "asian", "middle_eastern", "vegetarian", "global"],
    days: [
      { day: "Monday", veg: { breakfast: "Whole-grain cereal + milk + banana", lunch: "Cheese & salad wrap + fruit + water", snack: "Hummus + veggie sticks + fruit", dinner: "Pasta with tomato-lentil sauce + garlic bread + salad" }, nonVeg: { breakfast: "2 scrambled eggs + toast + milk + fruit", lunch: "Chicken salad wrap + fruit", snack: "Boiled egg + crackers + fruit", dinner: "Grilled chicken + pasta + salad" } },
      { day: "Tuesday", veg: { breakfast: "Oatmeal + honey + berries + milk", lunch: "Veggie sushi roll / Buddha bowl + fruit", snack: "Trail mix (nuts + dried fruit)", dinner: "Stir-fry tofu + brown rice + steamed greens" }, nonVeg: { breakfast: "Egg omelette + toast + milk", lunch: "Tuna wrap + salad + fruit", snack: "Cheese + apple", dinner: "Salmon + brown rice + steamed broccoli" } },
      { day: "Wednesday", veg: { breakfast: "Peanut butter on whole-wheat toast + banana + milk", lunch: "Lentil soup + crusty roll + side salad", snack: "Yoghurt + granola", dinner: "Veggie burger + sweet potato wedges + salad" }, nonVeg: { breakfast: "French toast + fruit + milk", lunch: "Chicken noodle soup + bread roll", snack: "Chicken strip + fruit", dinner: "Beef / chicken burger + baked fries + salad" } },
      { day: "Thursday", veg: { breakfast: "Smoothie (milk + banana + spinach + peanut butter)", lunch: "Caprese sandwich + fruit + water", snack: "Mixed nuts + fruit", dinner: "Bean & cheese burrito + guacamole + salad" }, nonVeg: { breakfast: "Egg + whole-wheat toast + milk + fruit", lunch: "Turkey / chicken sandwich + salad", snack: "Boiled egg + crackers + fruit", dinner: "Prawn stir-fry + fried rice + salad" } },
      { day: "Friday", veg: { breakfast: "Pancakes + berries + yoghurt + milk", lunch: "Cheese & veggie pizza slice + salad", snack: "Edamame + fruit", dinner: "Veggie fried rice + tofu + miso soup" }, nonVeg: { breakfast: "Boiled egg + toast + fruit + milk", lunch: "Fish & salad wrap + fruit", snack: "Cheese + crackers + fruit", dinner: "Fish tacos + coleslaw + lime rice" } },
      { day: "Saturday", veg: { breakfast: "Açai / smoothie bowl + granola + fruit", lunch: "Falafel wrap + salad + hummus", snack: "Fruit smoothie + nuts", dinner: "Margherita pizza + side salad + milk" }, nonVeg: { breakfast: "Weekend omelette (2 eggs + veggies) + toast + milk", lunch: "Pulled chicken wrap + salad", snack: "Chicken soup + crackers", dinner: "Grilled chicken + roast veg + mashed potato" } },
      { day: "Sunday", veg: { breakfast: "Full veggie breakfast: eggs + beans + toast + grilled tomato + OJ", lunch: "Veggie lasagne + garlic bread + salad", snack: "Fruit platter + yoghurt dip", dinner: "Light soup + whole-grain roll + fruit" }, nonVeg: { breakfast: "Full breakfast: eggs + bacon + beans + toast + OJ (special)", lunch: "Roast chicken + roast potatoes + veg + gravy (special)", snack: "Chicken sandwich + juice", dinner: "Light chicken broth + bread + fruit" } },
    ],
  },
  {
    ageCategory: "Adults, Pregnancy & Postpartum",
    portionNote: "Balanced plate: 50% vegetables & fruit, 25% whole grains, 25% protein. Pregnant: +300–500 kcal/day. Breastfeeding: +500 kcal/day.",
    applies: ["adult", "pregnancy", "postpartum"],
    cuisines: ["western", "mixed", "asian", "middle_eastern", "vegetarian", "global"],
    days: [
      { day: "Monday", veg: { breakfast: "Greek yoghurt + granola + berries + coffee/tea", lunch: "Lentil & roasted veg wrap + side salad", snack: "Apple + almond butter", dinner: "Tofu stir-fry + brown rice + steamed greens" }, nonVeg: { breakfast: "2 egg omelette + whole-grain toast + fruit + coffee/tea", lunch: "Grilled chicken salad + whole-grain roll", snack: "Boiled egg + fruit / nuts", dinner: "Grilled salmon + quinoa + roasted vegetables" } },
      { day: "Tuesday", veg: { breakfast: "Overnight oats + chia seeds + banana + milk", lunch: "Falafel wrap + tabbouleh + hummus", snack: "Mixed nuts + dried fruit", dinner: "Pasta primavera + parmesan + side salad" }, nonVeg: { breakfast: "Smoked salmon + cream cheese bagel + fruit", lunch: "Chicken Caesar salad + whole-grain roll", snack: "Tuna on rice cakes", dinner: "Prawn pasta + garlic bread + salad" } },
      { day: "Wednesday", veg: { breakfast: "Avocado toast + poached egg + coffee/tea", lunch: "Minestrone soup + crusty bread + salad", snack: "Hummus + veggie sticks", dinner: "Bean & cheese enchiladas + guacamole + salad" }, nonVeg: { breakfast: "Egg bhurji / scrambled egg + toast + fruit", lunch: "Turkey wrap + salad + fruit", snack: "Chicken strip + fruit", dinner: "Beef stir-fry + egg-fried rice + salad" } },
      { day: "Thursday", veg: { breakfast: "Smoothie bowl (spinach + banana + protein + berries)", lunch: "Caprese salad + whole-grain bread + fruit", snack: "Cheese + whole-grain crackers", dinner: "Vegetable curry + basmati rice + naan (mild)" }, nonVeg: { breakfast: "2 eggs any style + whole-grain toast + fruit + coffee/tea", lunch: "Grilled chicken wrap + mixed greens", snack: "Egg salad on rice cakes", dinner: "Chicken tikka masala + rice + naan (mild)" } },
      { day: "Friday", veg: { breakfast: "Pancakes + maple syrup + berries + milk", lunch: "Veggie sushi / Buddha bowl + miso soup", snack: "Banana + peanut butter", dinner: "Margherita pizza + rocket & tomato salad" }, nonVeg: { breakfast: "Smoked salmon scrambled eggs + toast + OJ", lunch: "Sushi platter + edamame + miso soup", snack: "Tuna + crackers + fruit", dinner: "Fish & chips (baked) + mushy peas + salad" } },
      { day: "Saturday", veg: { breakfast: "Full veg breakfast: eggs + beans + grilled tomato + mushrooms + toast + OJ", lunch: "Shakshuka + crusty bread + side salad", snack: "Fruit smoothie + nuts", dinner: "Thai green curry (tofu) + jasmine rice + spring rolls" }, nonVeg: { breakfast: "Full cooked breakfast: eggs + bacon + beans + toast + OJ", lunch: "Grilled chicken + roast veg + quinoa", snack: "Chicken soup + nuts", dinner: "Thai chicken curry + jasmine rice + spring rolls" } },
      { day: "Sunday", veg: { breakfast: "Brunch: avocado toast + eggs + fruit + coffee/tea", lunch: "Roasted veg pasta bake + garlic bread + salad", snack: "Fruit platter + yoghurt dip", dinner: "Light vegetable soup + whole-grain roll + fruit" }, nonVeg: { breakfast: "Brunch: smoked salmon + eggs + toast + fruit + coffee", lunch: "Sunday roast: chicken + roast potatoes + veg + gravy", snack: "Chicken sandwich + juice", dinner: "Light chicken broth + bread + salad" } },
    ],
  },
];

// ─── Family Mode ──────────────────────────────────────────────────────────────

export type FamilyPortionRow = {
  food: string;
  emoji: string;
  infant: string;
  toddler: string;
  schoolChild: string;
  teen: string;
  adult: string;
  pregnant: string;
};

export const FAMILY_PORTIONS: FamilyPortionRow[] = [
  { food: "Rice (cooked)", emoji: "🍚", infant: "2–3 tbsp", toddler: "¼ katori", schoolChild: "1 katori", teen: "1.5 katori", adult: "1 katori", pregnant: "1.5 katori" },
  { food: "Roti / Chapati", emoji: "🫓", infant: "Tiny soft pieces", toddler: "½–1 small", schoolChild: "2 medium", teen: "3 medium", adult: "2–3 medium", pregnant: "3 medium" },
  { food: "Dal (cooked)", emoji: "🫘", infant: "2–4 tbsp", toddler: "½ katori", schoolChild: "1 katori", teen: "1.5 katori", adult: "1 katori", pregnant: "1.5 katori" },
  { food: "Vegetables / Sabzi", emoji: "🥗", infant: "2–3 tbsp (soft/mashed)", toddler: "½ katori soft", schoolChild: "1 katori", teen: "1–1.5 katori", adult: "2 katori (half plate)", pregnant: "2 katori" },
  { food: "Milk / Dahi", emoji: "🥛", infant: "Breast milk (primary)", toddler: "150–200ml milk", schoolChild: "200–300ml", teen: "300–400ml", adult: "200ml", pregnant: "400ml+" },
  { food: "Dal / Paneer / Egg", emoji: "🥚", infant: "Pureed, 2 tbsp", toddler: "25–30g paneer / ½ egg", schoolChild: "50g paneer / 1 egg", teen: "75g / 2 eggs", adult: "75–100g", pregnant: "100g+" },
  { food: "Fruit", emoji: "🍎", infant: "Puree, 2–3 tbsp", toddler: "¼–½ small fruit", schoolChild: "1 medium fruit", teen: "1–2 fruits", adult: "1–2 fruits", pregnant: "2 fruits" },
  { food: "Ghee / Oil", emoji: "🫙", infant: "½ tsp in food", toddler: "½–1 tsp", schoolChild: "1–1.5 tsp", teen: "1.5–2 tsp", adult: "3–4 tsp/day total", pregnant: "3–4 tsp/day" },
  { food: "Water", emoji: "💧", infant: "No plain water <6m; sips 6–12m", toddler: "600–800ml", schoolChild: "1–1.5 L", teen: "1.5–2 L", adult: "2–2.5 L", pregnant: "2.5–3 L" },
];

// ─── Medical Disclaimer & References ─────────────────────────────────────────

export const MEDICAL_DISCLAIMER = {
  en: "This Nutrition Hub is intended for educational purposes only. The information provided is based on general scientific guidelines and is not a substitute for personalised medical or nutritional advice. Always consult a qualified paediatrician, dietitian, or physician for specific health concerns, medical conditions, or before starting any supplement. Individual requirements vary based on health status, activity level, and genetics.",
};

export const REFERENCES = [
  "ICMR-NIN (2020). Nutrient Requirements for Indians. Indian Council of Medical Research – National Institute of Nutrition.",
  "WHO (2021). Healthy diet fact sheet. World Health Organization.",
  "WHO (2022). Infant and young child feeding. World Health Organization.",
  "IAP (2022). Revised IAP guidelines on Vitamin D supplementation.",
  "National Family Health Survey – 5 (NFHS-5, 2020–21). Ministry of Health & Family Welfare, Government of India.",
  "USDA Dietary Guidelines for Americans (2020–2025). U.S. Department of Agriculture & U.S. Department of Health and Human Services.",
  "AAP (2022). Pediatric Nutrition: Policy of the American Academy of Pediatrics.",
  "NHS (2023). Vitamins and nutrition in pregnancy / infant feeding. NHS England.",
  "NHMRC (2013, revised 2024). Australian Dietary Guidelines. National Health and Medical Research Council.",
  "Health Canada (2019). Canada's Food Guide. Government of Canada.",
  "NZ Ministry of Health (2020). Eating and Activity Guidelines for New Zealand Adults.",
  "Linus Pauling Institute. Micronutrient Information Center. Oregon State University.",
];

// ─── Nutrition Score Helper ───────────────────────────────────────────────────

export type NutrientLogEntry = {
  nutrientId: string;
  achieved: number;
  target: number;
};

export function calcNutritionScore(entries: NutrientLogEntry[]): number {
  if (!entries.length) return 0;
  const pct = entries.map(e => Math.min(1, e.achieved / e.target));
  return Math.round((pct.reduce((a, b) => a + b, 0) / pct.length) * 100);
}
