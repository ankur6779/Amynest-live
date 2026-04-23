// Nutrition Hub – Science-backed data based on ICMR-NIN 2020 RDA & WHO guidelines.
// Use only as educational reference. See medical disclaimer in the UI.

export type AgeGroupId =
  | "infant_0_6" | "infant_6_12" | "toddler_1_3" | "preschool_3_6"
  | "school_6_10" | "preteen_10_15" | "adult" | "pregnancy" | "postpartum";

export type AgeGroup = {
  id: AgeGroupId;
  label: string;
  labelHi: string;
  labelHinglish: string;
  emoji: string;
  colorClass: string;       // Tailwind bg color (card bg)
  textClass: string;        // Tailwind text color
  borderClass: string;      // Tailwind border color
  badgeBg: string;
  description: string;
  descriptionHi: string;
  keyFocus: string[];       // Nutrition priorities for this age
};

export const AGE_GROUPS: AgeGroup[] = [
  {
    id: "infant_0_6",
    label: "0–6 Months",
    labelHi: "0–6 महीने",
    labelHinglish: "0–6 Mahine",
    emoji: "🍼",
    colorClass: "bg-pink-50 dark:bg-pink-950/30",
    textClass: "text-pink-700 dark:text-pink-300",
    borderClass: "border-pink-200 dark:border-pink-800",
    badgeBg: "bg-pink-100 dark:bg-pink-900/40",
    description: "Breast milk is the only food needed. WHO recommends exclusive breastfeeding for 6 months.",
    descriptionHi: "इस उम्र में केवल माँ का दूध जरूरी है। WHO 6 महीने तक सिर्फ स्तनपान की सलाह देता है।",
    keyFocus: ["Exclusive breastfeeding", "Vitamin D supplementation", "Iron stores from birth"],
  },
  {
    id: "infant_6_12",
    label: "6–12 Months",
    labelHi: "6–12 महीने",
    labelHinglish: "6–12 Mahine",
    emoji: "🥣",
    colorClass: "bg-rose-50 dark:bg-rose-950/30",
    textClass: "text-rose-700 dark:text-rose-300",
    borderClass: "border-rose-200 dark:border-rose-800",
    badgeBg: "bg-rose-100 dark:bg-rose-900/40",
    description: "Introduce complementary foods at 6 months while continuing breastfeeding. Focus on iron-rich foods.",
    descriptionHi: "6 महीने में ठोस आहार शुरू करें। स्तनपान जारी रखें और आयरन युक्त खाना दें।",
    keyFocus: ["Iron-rich first foods", "Zinc", "Complementary feeding", "No salt/sugar"],
  },
  {
    id: "toddler_1_3",
    label: "1–3 Years",
    labelHi: "1–3 साल",
    labelHinglish: "1–3 Saal",
    emoji: "🧒",
    colorClass: "bg-purple-50 dark:bg-purple-950/30",
    textClass: "text-purple-700 dark:text-purple-300",
    borderClass: "border-purple-200 dark:border-purple-800",
    badgeBg: "bg-purple-100 dark:bg-purple-900/40",
    description: "Rapid brain development phase. Needs diverse foods 5–6 times a day in small portions.",
    descriptionHi: "मस्तिष्क विकास की तेज अवस्था। दिन में 5–6 बार छोटे-छोटे भोजन दें।",
    keyFocus: ["Healthy fats (brain)", "Calcium for bones", "Iron", "Vitamin A", "Diverse diet"],
  },
  {
    id: "preschool_3_6",
    label: "3–6 Years",
    labelHi: "3–6 साल",
    labelHinglish: "3–6 Saal",
    emoji: "🎒",
    colorClass: "bg-indigo-50 dark:bg-indigo-950/30",
    textClass: "text-indigo-700 dark:text-indigo-300",
    borderClass: "border-indigo-200 dark:border-indigo-800",
    badgeBg: "bg-indigo-100 dark:bg-indigo-900/40",
    description: "Energy needs increase with activity. Establish healthy food habits early. Avoid junk food.",
    descriptionHi: "इस उम्र में खाने की आदतें बनती हैं। जंक फूड से बचें और पोषण की आदत डालें।",
    keyFocus: ["Energy (carbs + protein)", "Calcium", "Vitamin C for immunity", "Fiber"],
  },
  {
    id: "school_6_10",
    label: "6–10 Years",
    labelHi: "6–10 साल",
    labelHinglish: "6–10 Saal",
    emoji: "📚",
    colorClass: "bg-blue-50 dark:bg-blue-950/30",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-200 dark:border-blue-800",
    badgeBg: "bg-blue-100 dark:bg-blue-900/40",
    description: "School age needs focus on brain fuel and immunity. Regular meals improve concentration.",
    descriptionHi: "स्कूल उम्र में मस्तिष्क ईंधन और इम्युनिटी पर ध्यान दें। नाश्ता जरूरी है।",
    keyFocus: ["B vitamins (brain)", "Iron (concentration)", "Calcium (bones)", "Breakfast daily"],
  },
  {
    id: "preteen_10_15",
    label: "10–15 Years",
    labelHi: "10–15 साल",
    labelHinglish: "10–15 Saal",
    emoji: "🌱",
    colorClass: "bg-cyan-50 dark:bg-cyan-950/30",
    textClass: "text-cyan-700 dark:text-cyan-300",
    borderClass: "border-cyan-200 dark:border-cyan-800",
    badgeBg: "bg-cyan-100 dark:bg-cyan-900/40",
    description: "Puberty — highest calcium and iron needs. Girls need extra iron. Avoid crash diets.",
    descriptionHi: "किशोरावस्था में कैल्शियम और आयरन की सबसे ज्यादा जरूरत। लड़कियों को अतिरिक्त आयरन चाहिए।",
    keyFocus: ["Calcium (peak bone mass)", "Iron (girls)", "Protein (muscle)", "Zinc"],
  },
  {
    id: "adult",
    label: "Adults",
    labelHi: "वयस्क",
    labelHinglish: "Adults (18+ Saal)",
    emoji: "👨‍👩",
    colorClass: "bg-teal-50 dark:bg-teal-950/30",
    textClass: "text-teal-700 dark:text-teal-300",
    borderClass: "border-teal-200 dark:border-teal-800",
    badgeBg: "bg-teal-100 dark:bg-teal-900/40",
    description: "Balanced diet for sustained energy. Focus on fiber, antioxidants, and healthy fats.",
    descriptionHi: "संतुलित आहार से ऊर्जा बनाए रखें। फाइबर, एंटीऑक्सिडेंट और स्वस्थ वसा लें।",
    keyFocus: ["Balanced macros", "Vitamin D", "B12 (vegetarians)", "Fiber", "Hydration"],
  },
  {
    id: "pregnancy",
    label: "Pregnancy",
    labelHi: "गर्भावस्था",
    labelHinglish: "Pregnancy",
    emoji: "🤰",
    colorClass: "bg-violet-50 dark:bg-violet-950/30",
    textClass: "text-violet-700 dark:text-violet-300",
    borderClass: "border-violet-200 dark:border-violet-800",
    badgeBg: "bg-violet-100 dark:bg-violet-900/40",
    description: "Critical 1,000-day window. Extra calories, folic acid, iron, and calcium essential.",
    descriptionHi: "पहले 1000 दिन बहुत महत्वपूर्ण हैं। अतिरिक्त फोलिक एसिड, आयरन और कैल्शियम जरूरी है।",
    keyFocus: ["Folic acid (neural tube)", "Iron (anemia)", "Calcium", "Omega-3 (brain)", "Iodine"],
  },
  {
    id: "postpartum",
    label: "Postpartum",
    labelHi: "प्रसवोत्तर",
    labelHinglish: "Postpartum (Delivery ke Baad)",
    emoji: "🤱",
    colorClass: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    textClass: "text-fuchsia-700 dark:text-fuchsia-300",
    borderClass: "border-fuchsia-200 dark:border-fuchsia-800",
    badgeBg: "bg-fuchsia-100 dark:bg-fuchsia-900/40",
    description: "Recovery + breastfeeding needs extra calories, protein, and iron. Stay hydrated.",
    descriptionHi: "स्तनपान के दौरान अतिरिक्त कैलोरी, प्रोटीन और आयरन जरूरी है। खूब पानी पिएं।",
    keyFocus: ["Protein (milk production)", "Iron (recovery)", "Calcium", "Omega-3", "Hydration"],
  },
];

// ─── Nutrient Types ─────────────────────────────────────────────────────────

export type FoodSource = {
  name: string;
  nameHi: string;
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
  nameHi: string;
  nameHinglish: string;
  emoji: string;
  colorClass: string;
  textClass: string;
  borderClass: string;
  tagline: string;
  taglineHi: string;
  benefits: string[];
  benefitsHi: string[];
  sources: FoodSource[];
  deficiencySymptoms: string[];
  deficiencyHi: string[];
  dailyNeeds: Record<AgeGroupId, DailyNeed>;
};

export const NUTRIENTS: Nutrient[] = [
  {
    id: "protein",
    name: "Protein",
    nameHi: "प्रोटीन",
    nameHinglish: "Protein",
    emoji: "💪",
    colorClass: "bg-orange-50 dark:bg-orange-950/30",
    textClass: "text-orange-700 dark:text-orange-300",
    borderClass: "border-orange-200 dark:border-orange-800",
    tagline: "Building block of life",
    taglineHi: "जीवन की नींव",
    benefits: [
      "Builds and repairs muscles and tissues",
      "Supports immune system (antibodies)",
      "Makes enzymes and hormones",
      "Essential for child growth and development",
      "Provides energy (4 kcal/g)",
    ],
    benefitsHi: [
      "मांसपेशियों और ऊतकों का निर्माण करता है",
      "प्रतिरक्षा प्रणाली को मजबूत करता है",
      "एंजाइम और हार्मोन बनाता है",
      "बच्चों की वृद्धि के लिए आवश्यक",
    ],
    sources: [
      { name: "Dal (Lentils)", nameHi: "दाल", emoji: "🫘", type: "veg", serving: "1 katori (100g cooked)", amount: "8–9g" },
      { name: "Paneer", nameHi: "पनीर", emoji: "🧀", type: "veg", serving: "100g", amount: "18g" },
      { name: "Eggs", nameHi: "अंडे", emoji: "🥚", type: "nonveg", serving: "2 eggs", amount: "12g" },
      { name: "Chicken", nameHi: "चिकन", emoji: "🍗", type: "nonveg", serving: "100g cooked", amount: "25–27g" },
      { name: "Soybean/Tofu", nameHi: "सोया/टोफू", emoji: "🫘", type: "veg", serving: "100g", amount: "17g" },
      { name: "Milk", nameHi: "दूध", emoji: "🥛", type: "veg", serving: "1 glass (200ml)", amount: "6.5g" },
      { name: "Curd (Dahi)", nameHi: "दही", emoji: "🍶", type: "veg", serving: "1 katori (100g)", amount: "3.5g" },
      { name: "Fish", nameHi: "मछली", emoji: "🐟", type: "nonveg", serving: "100g cooked", amount: "20–22g" },
      { name: "Rajma / Chole", nameHi: "राजमा/छोले", emoji: "🫘", type: "veg", serving: "1 katori", amount: "8g" },
      { name: "Groundnuts", nameHi: "मूंगफली", emoji: "🥜", type: "veg", serving: "30g", amount: "7.5g" },
    ],
    deficiencySymptoms: [
      "Slow growth in children (stunting)",
      "Frequent infections / poor immunity",
      "Hair loss and brittle nails",
      "Muscle weakness and fatigue",
      "Oedema (fluid swelling) in severe cases",
      "Delayed wound healing",
    ],
    deficiencyHi: [
      "बच्चों में धीमी वृद्धि",
      "बार-बार संक्रमण / कमजोर इम्युनिटी",
      "बालों का झड़ना और नाखून टूटना",
      "मांसपेशियों की कमजोरी",
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
    nameHi: "आयरन (लौह)",
    nameHinglish: "Iron",
    emoji: "🩸",
    colorClass: "bg-red-50 dark:bg-red-950/30",
    textClass: "text-red-700 dark:text-red-300",
    borderClass: "border-red-200 dark:border-red-800",
    tagline: "Carries oxygen to every cell",
    taglineHi: "हर कोशिका में ऑक्सीजन पहुंचाता है",
    benefits: [
      "Forms haemoglobin — carries oxygen in blood",
      "Essential for cognitive development in children",
      "Supports energy production and metabolism",
      "Critical for brain development in infants",
      "Supports muscle function",
    ],
    benefitsHi: [
      "हीमोग्लोबिन बनाता है — खून में ऑक्सीजन लाता है",
      "बच्चों के मानसिक विकास के लिए जरूरी",
      "ऊर्जा उत्पादन में मदद करता है",
      "शिशुओं के मस्तिष्क विकास के लिए महत्वपूर्ण",
    ],
    sources: [
      { name: "Ragi (Finger Millet)", nameHi: "रागी", emoji: "🌾", type: "veg", serving: "100g", amount: "3.9mg" },
      { name: "Spinach (Palak)", nameHi: "पालक", emoji: "🌿", type: "veg", serving: "1 katori cooked", amount: "3.5mg" },
      { name: "Liver (Mutton/Chicken)", nameHi: "कलेजी", emoji: "🍖", type: "nonveg", serving: "50g", amount: "5–6mg" },
      { name: "Rajma (Kidney Beans)", nameHi: "राजमा", emoji: "🫘", type: "veg", serving: "1 katori cooked", amount: "3mg" },
      { name: "Sesame Seeds (Til)", nameHi: "तिल", emoji: "🌱", type: "veg", serving: "1 tbsp", amount: "1.3mg" },
      { name: "Dates (Khajoor)", nameHi: "खजूर", emoji: "🌴", type: "veg", serving: "3 dates", amount: "1.2mg" },
      { name: "Chicken / Mutton", nameHi: "चिकन/मटन", emoji: "🍗", type: "nonveg", serving: "100g", amount: "1.5–2.5mg" },
      { name: "Jaggery (Gud)", nameHi: "गुड़", emoji: "🍯", type: "veg", serving: "10g piece", amount: "1.1mg" },
      { name: "Pumpkin Seeds", nameHi: "कद्दू के बीज", emoji: "🎃", type: "veg", serving: "30g", amount: "2.5mg" },
      { name: "Fortified Cereals", nameHi: "फोर्टिफाइड अनाज", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "4–8mg" },
    ],
    deficiencySymptoms: [
      "Iron-deficiency anaemia — pale skin, fatigue",
      "Poor attention and learning difficulty in children",
      "Breathlessness on exertion",
      "Frequent infections",
      "Cold hands/feet, headache, dizziness",
      "Pica (craving for non-food items) in children",
    ],
    deficiencyHi: [
      "एनीमिया — पीली त्वचा, थकान",
      "बच्चों में ध्यान और सीखने की समस्या",
      "परिश्रम पर सांस फूलना",
      "बार-बार संक्रमण",
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
    nameHi: "कैल्शियम",
    nameHinglish: "Calcium",
    emoji: "🦴",
    colorClass: "bg-sky-50 dark:bg-sky-950/30",
    textClass: "text-sky-700 dark:text-sky-300",
    borderClass: "border-sky-200 dark:border-sky-800",
    tagline: "For strong bones and teeth",
    taglineHi: "मजबूत हड्डियाँ और दांतों के लिए",
    benefits: [
      "Builds and maintains strong bones and teeth",
      "Enables muscle contraction (including heart)",
      "Essential for nerve signal transmission",
      "Supports blood clotting",
      "Peak bone mass built by age 25 — childhood matters!",
    ],
    benefitsHi: [
      "हड्डियाँ और दांत मजबूत बनाता है",
      "मांसपेशियों के संकुचन में मदद करता है",
      "तंत्रिका संकेतों के लिए आवश्यक",
      "25 साल तक हड्डी घनत्व बनाना जरूरी",
    ],
    sources: [
      { name: "Milk", nameHi: "दूध", emoji: "🥛", type: "veg", serving: "1 glass (200ml)", amount: "240mg" },
      { name: "Paneer", nameHi: "पनीर", emoji: "🧀", type: "veg", serving: "50g", amount: "190mg" },
      { name: "Ragi (Finger Millet)", nameHi: "रागी", emoji: "🌾", type: "veg", serving: "100g", amount: "344mg" },
      { name: "Curd (Dahi)", nameHi: "दही", emoji: "🍶", type: "veg", serving: "200g", amount: "240mg" },
      { name: "Sesame Seeds (Til)", nameHi: "तिल", emoji: "🌱", type: "veg", serving: "1 tbsp", amount: "88mg" },
      { name: "Drumstick Leaves (Sahjan)", nameHi: "सहजन के पत्ते", emoji: "🌿", type: "veg", serving: "100g", amount: "440mg" },
      { name: "Amaranth (Rajgira)", nameHi: "राजगिरा", emoji: "🌾", type: "veg", serving: "100g", amount: "267mg" },
      { name: "Fish with Bones (sardines)", nameHi: "छोटी मछली", emoji: "🐟", type: "nonveg", serving: "85g", amount: "325mg" },
      { name: "Figs (Anjeer)", nameHi: "अंजीर", emoji: "🌸", type: "veg", serving: "2 dried figs", amount: "55mg" },
      { name: "Almonds", nameHi: "बादाम", emoji: "🫘", type: "veg", serving: "30g (≈23)", amount: "76mg" },
    ],
    deficiencySymptoms: [
      "Rickets in children — bow legs, soft skull",
      "Osteoporosis in adults — brittle bones",
      "Muscle cramps and spasms",
      "Dental problems — weak teeth",
      "Delayed teething in infants",
      "Numbness/tingling in hands and feet",
    ],
    deficiencyHi: [
      "बच्चों में रिकेट्स — टेढ़े पैर, मुलायम खोपड़ी",
      "वयस्कों में ऑस्टियोपोरोसिस",
      "मांसपेशियों में ऐंठन",
      "दांतों की समस्याएं",
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
    nameHi: "विटामिन A",
    nameHinglish: "Vitamin A",
    emoji: "👁️",
    colorClass: "bg-amber-50 dark:bg-amber-950/30",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-200 dark:border-amber-800",
    tagline: "For vision, growth & immunity",
    taglineHi: "दृष्टि, विकास और इम्युनिटी के लिए",
    benefits: [
      "Essential for vision — especially night vision",
      "Supports skin and mucous membrane health",
      "Critical for child growth and immune function",
      "Protects against respiratory and GI infections",
      "Antioxidant properties",
    ],
    benefitsHi: [
      "दृष्टि के लिए — विशेषकर रात में देखने के लिए",
      "त्वचा और श्लेष्मा झिल्ली को स्वस्थ रखता है",
      "बच्चों की वृद्धि और इम्युनिटी के लिए",
    ],
    sources: [
      { name: "Carrot", nameHi: "गाजर", emoji: "🥕", type: "veg", serving: "1 medium (60g)", amount: "500mcg RAE" },
      { name: "Sweet Potato", nameHi: "शकरकंद", emoji: "🍠", type: "veg", serving: "100g baked", amount: "960mcg RAE" },
      { name: "Spinach (Palak)", nameHi: "पालक", emoji: "🌿", type: "veg", serving: "100g cooked", amount: "524mcg RAE" },
      { name: "Pumpkin", nameHi: "कद्दू", emoji: "🎃", type: "veg", serving: "100g cooked", amount: "400mcg RAE" },
      { name: "Eggs (yolk)", nameHi: "अंडे", emoji: "🥚", type: "nonveg", serving: "2 eggs", amount: "80mcg RAE" },
      { name: "Liver", nameHi: "कलेजी", emoji: "🍖", type: "nonveg", serving: "25g", amount: "1500mcg RAE" },
      { name: "Mango", nameHi: "आम", emoji: "🥭", type: "veg", serving: "100g", amount: "38mcg RAE" },
      { name: "Papaya", nameHi: "पपीता", emoji: "🍈", type: "veg", serving: "100g", amount: "47mcg RAE" },
      { name: "Whole Milk / Ghee", nameHi: "दूध/घी", emoji: "🥛", type: "veg", serving: "1 tsp ghee", amount: "13mcg RAE" },
    ],
    deficiencySymptoms: [
      "Night blindness (early sign) — can't see in dim light",
      "Xerophthalmia — dry eyes, eventually blindness",
      "Increased susceptibility to infections",
      "Dry, rough skin and hair",
      "Poor growth in children",
    ],
    deficiencyHi: [
      "रतौंधी — रात में दिखना बंद",
      "जीरोफ्थाल्मिया — आंखें सूखना",
      "बार-बार संक्रमण होना",
      "बच्चों में खराब विकास",
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
    nameHi: "विटामिन C",
    nameHinglish: "Vitamin C",
    emoji: "🍋",
    colorClass: "bg-yellow-50 dark:bg-yellow-950/30",
    textClass: "text-yellow-700 dark:text-yellow-300",
    borderClass: "border-yellow-200 dark:border-yellow-800",
    tagline: "Immunity shield & iron booster",
    taglineHi: "इम्युनिटी और आयरन अवशोषण के लिए",
    benefits: [
      "Powerful antioxidant — fights free radicals",
      "Boosts iron absorption from plant sources (pair with dal/spinach!)",
      "Collagen synthesis — skin, joints, wound healing",
      "Supports immune cell function",
      "Reduces duration of common cold",
    ],
    benefitsHi: [
      "शक्तिशाली एंटीऑक्सिडेंट",
      "पौधों से आयरन अवशोषण बढ़ाता है",
      "कोलेजन निर्माण — त्वचा, जोड़ और घाव भरना",
      "इम्युनिटी सेल फंक्शन को सपोर्ट करता है",
    ],
    sources: [
      { name: "Amla (Indian Gooseberry)", nameHi: "आँवला", emoji: "🍏", type: "veg", serving: "1 amla (50g)", amount: "300mg" },
      { name: "Guava", nameHi: "अमरूद", emoji: "🍐", type: "veg", serving: "1 medium (100g)", amount: "228mg" },
      { name: "Bell Pepper (Shimla Mirch)", nameHi: "शिमला मिर्च", emoji: "🫑", type: "veg", serving: "50g", amount: "95mg" },
      { name: "Lemon / Lime", nameHi: "नींबू", emoji: "🍋", type: "veg", serving: "juice of 1 lemon", amount: "30mg" },
      { name: "Orange / Mosambi", nameHi: "संतरा", emoji: "🍊", type: "veg", serving: "1 medium", amount: "70mg" },
      { name: "Tomato", nameHi: "टमाटर", emoji: "🍅", type: "veg", serving: "1 medium (100g)", amount: "23mg" },
      { name: "Papaya", nameHi: "पपीता", emoji: "🍈", type: "veg", serving: "100g", amount: "62mg" },
      { name: "Raw Mango / Kachha Aam", nameHi: "कच्चा आम", emoji: "🥭", type: "veg", serving: "50g", amount: "28mg" },
    ],
    deficiencySymptoms: [
      "Scurvy — bleeding gums, loose teeth",
      "Poor wound healing",
      "Bruising easily",
      "Fatigue and irritability",
      "Poor iron absorption leading to anaemia",
    ],
    deficiencyHi: [
      "स्कर्वी — मसूड़ों से खून",
      "घाव देर से भरना",
      "जल्दी नील पड़ना",
      "थकान और चिड़चिड़ापन",
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
    nameHi: "विटामिन D",
    nameHinglish: "Vitamin D",
    emoji: "☀️",
    colorClass: "bg-orange-50 dark:bg-orange-950/30",
    textClass: "text-orange-700 dark:text-orange-300",
    borderClass: "border-orange-200 dark:border-orange-800",
    tagline: "The sunshine vitamin",
    taglineHi: "धूप विटामिन",
    benefits: [
      "Enables calcium absorption from the gut",
      "Essential for bone mineralisation (prevents rickets)",
      "Supports immune system modulation",
      "Linked to mood regulation and mental health",
      "Muscle strength and nerve function",
    ],
    benefitsHi: [
      "कैल्शियम अवशोषण में मदद करता है",
      "हड्डियों के निर्माण के लिए (रिकेट्स रोकता है)",
      "इम्युनिटी को नियंत्रित करता है",
      "मानसिक स्वास्थ्य और मनोदशा से जुड़ा है",
    ],
    sources: [
      { name: "Sunlight (15–20 min/day)", nameHi: "धूप (15–20 मिनट)", emoji: "☀️", type: "veg", serving: "Face + arms exposed", amount: "Primary source" },
      { name: "Fish (Salmon, Tuna)", nameHi: "मछली", emoji: "🐟", type: "nonveg", serving: "85g", amount: "400–600 IU" },
      { name: "Eggs (yolk)", nameHi: "अंडे", emoji: "🥚", type: "nonveg", serving: "2 eggs", amount: "80–100 IU" },
      { name: "Fortified Milk", nameHi: "फोर्टिफाइड दूध", emoji: "🥛", type: "veg", serving: "1 glass", amount: "100 IU" },
      { name: "Fortified Cereals", nameHi: "फोर्टिफाइड अनाज", emoji: "🌾", type: "veg", serving: "1 bowl", amount: "40–100 IU" },
      { name: "Mushroom (sun-exposed)", nameHi: "धूप में सुखाए मशरूम", emoji: "🍄", type: "veg", serving: "100g", amount: "200–400 IU" },
    ],
    deficiencySymptoms: [
      "Rickets in children — soft bones, bowed legs",
      "Osteomalacia in adults — bone pain",
      "Muscle weakness and fatigue",
      "Depression and mood changes",
      "Frequent respiratory infections",
      "India: up to 70% of children and adults are deficient!",
    ],
    deficiencyHi: [
      "बच्चों में रिकेट्स",
      "वयस्कों में हड्डी दर्द",
      "मांसपेशियों की कमजोरी",
      "भारत में 70% लोग कमजोर हैं!",
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
    nameHi: "विटामिन B समूह",
    nameHinglish: "B Vitamins",
    emoji: "⚡",
    colorClass: "bg-green-50 dark:bg-green-950/30",
    textClass: "text-green-700 dark:text-green-300",
    borderClass: "border-green-200 dark:border-green-800",
    tagline: "Energy metabolism & brain power",
    taglineHi: "ऊर्जा और मस्तिष्क शक्ति",
    benefits: [
      "B1 (Thiamine): carbohydrate energy conversion",
      "B2 (Riboflavin): fat and protein metabolism",
      "B3 (Niacin): DNA repair, skin health",
      "B6: brain development, immune function, mood",
      "B9 (Folate): cell division, crucial in pregnancy",
      "Collectively support nerve function and energy",
    ],
    benefitsHi: [
      "B1: कार्बोहाइड्रेट से ऊर्जा",
      "B6: मस्तिष्क विकास और इम्युनिटी",
      "B9: गर्भावस्था में महत्वपूर्ण — न्यूरल ट्यूब रक्षा",
      "तंत्रिका कार्य और ऊर्जा उत्पादन",
    ],
    sources: [
      { name: "Whole Grains (Atta, Brown Rice)", nameHi: "साबुत अनाज", emoji: "🌾", type: "veg", serving: "2 roti", amount: "B1: 0.3mg, B3: 2mg" },
      { name: "Dal / Legumes", nameHi: "दाल", emoji: "🫘", type: "veg", serving: "1 katori", amount: "Folate: 130mcg, B6: 0.2mg" },
      { name: "Green Leafy Vegetables", nameHi: "हरी पत्तेदार सब्जियाँ", emoji: "🥬", type: "veg", serving: "1 katori", amount: "Folate: 100–200mcg" },
      { name: "Eggs", nameHi: "अंडे", emoji: "🥚", type: "nonveg", serving: "2 eggs", amount: "B2: 0.5mg, B6: 0.2mg" },
      { name: "Chicken / Fish", nameHi: "चिकन/मछली", emoji: "🍗", type: "nonveg", serving: "100g", amount: "B3: 8–14mg, B6: 0.6mg" },
      { name: "Groundnuts (Mungfali)", nameHi: "मूंगफली", emoji: "🥜", type: "veg", serving: "30g", amount: "B3: 3.8mg, Folate: 68mcg" },
      { name: "Banana", nameHi: "केला", emoji: "🍌", type: "veg", serving: "1 medium", amount: "B6: 0.4mg" },
    ],
    deficiencySymptoms: [
      "B1: Beriberi — nerve/heart damage",
      "B2: Cracked lips, mouth sores, eye sensitivity",
      "B3: Pellagra — dermatitis, diarrhoea, dementia",
      "B6: Irritability, depression, anaemia",
      "B9: Neural tube defects in newborns (folate deficiency during pregnancy)",
    ],
    deficiencyHi: [
      "B1: बेरीबेरी",
      "B3: पेलाग्रा",
      "B9: गर्भावस्था में कमी से शिशु में जन्म दोष",
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
    nameHi: "विटामिन B12",
    nameHinglish: "Vitamin B12",
    emoji: "🔴",
    colorClass: "bg-rose-50 dark:bg-rose-950/30",
    textClass: "text-rose-700 dark:text-rose-300",
    borderClass: "border-rose-200 dark:border-rose-800",
    tagline: "Nerve health & red blood cells",
    taglineHi: "तंत्रिका स्वास्थ्य और लाल रक्त कोशिकाएं",
    benefits: [
      "Forms and maintains the myelin sheath protecting nerves",
      "Produces red blood cells (prevents megaloblastic anaemia)",
      "DNA synthesis in every dividing cell",
      "Supports brain function and mood",
      "Critical for vegan/vegetarian families (animal-only source)",
    ],
    benefitsHi: [
      "नसों की सुरक्षा करती है",
      "लाल रक्त कोशिकाएं बनाती है",
      "मस्तिष्क कार्य में मदद करती है",
      "शाकाहारी परिवारों के लिए सप्लीमेंट जरूरी",
    ],
    sources: [
      { name: "Meat / Chicken", nameHi: "मांस/चिकन", emoji: "🍗", type: "nonveg", serving: "100g", amount: "1–2.5mcg" },
      { name: "Fish / Shellfish", nameHi: "मछली", emoji: "🐟", type: "nonveg", serving: "85g", amount: "2–15mcg" },
      { name: "Eggs", nameHi: "अंडे", emoji: "🥚", type: "nonveg", serving: "2 eggs", amount: "1.2mcg" },
      { name: "Milk", nameHi: "दूध", emoji: "🥛", type: "veg", serving: "1 glass (200ml)", amount: "0.9mcg" },
      { name: "Curd (Dahi)", nameHi: "दही", emoji: "🍶", type: "veg", serving: "200g", amount: "1.1mcg" },
      { name: "Paneer / Cheese", nameHi: "पनीर/पनीर", emoji: "🧀", type: "veg", serving: "50g", amount: "0.5mcg" },
      { name: "Fortified Foods / Supplements", nameHi: "फोर्टिफाइड फूड/सप्लीमेंट", emoji: "💊", type: "veg", serving: "1 tablet", amount: "2.4mcg+" },
    ],
    deficiencySymptoms: [
      "Megaloblastic anaemia — large, immature red cells",
      "Tingling/numbness in hands and feet",
      "Memory problems, brain fog",
      "Developmental delay in infants (of B12-deficient mothers)",
      "Depression, fatigue, irritability",
      "Very common in Indian vegetarians — up to 40–70%!",
    ],
    deficiencyHi: [
      "मेगालोब्लास्टिक एनीमिया",
      "हाथ-पैरों में झनझनाहट",
      "याददाश्त की समस्या",
      "भारत के 40–70% शाकाहारियों में कमी!",
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
    nameHi: "विटामिन K",
    nameHinglish: "Vitamin K",
    emoji: "🩹",
    colorClass: "bg-emerald-50 dark:bg-emerald-950/30",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    tagline: "Blood clotting & bone strength",
    taglineHi: "रक्त का थक्का और हड्डी की मजबूती",
    benefits: [
      "Activates clotting proteins — stops bleeding",
      "Supports bone protein (osteocalcin) synthesis",
      "K2 helps direct calcium into bones (not arteries)",
      "May protect heart health",
      "Given as injection at birth to prevent haemorrhagic disease",
    ],
    benefitsHi: [
      "खून का थक्का जमाने में मदद करता है",
      "हड्डी प्रोटीन का निर्माण करता है",
      "K2 कैल्शियम को हड्डियों तक पहुंचाता है",
      "जन्म पर इंजेक्शन से शिशु में रक्तस्राव रोकता है",
    ],
    sources: [
      { name: "Green Leafy Vegetables (Palak, Methi)", nameHi: "हरी सब्जियाँ (पालक, मेथी)", emoji: "🥬", type: "veg", serving: "100g cooked", amount: "400–500mcg" },
      { name: "Broccoli", nameHi: "ब्रोकली", emoji: "🥦", type: "veg", serving: "100g", amount: "101mcg" },
      { name: "Soybean Oil / Mustard Oil", nameHi: "सरसों का तेल", emoji: "🛢️", type: "veg", serving: "1 tbsp", amount: "10mcg" },
      { name: "Natto (fermented soy, K2)", nameHi: "नाटो", emoji: "🫘", type: "veg", serving: "40g", amount: "380mcg K2" },
      { name: "Egg Yolk (K2)", nameHi: "अंडे की जर्दी", emoji: "🥚", type: "nonveg", serving: "2 eggs", amount: "5mcg K2" },
      { name: "Aged Cheese (K2)", nameHi: "पुराना पनीर", emoji: "🧀", type: "veg", serving: "30g", amount: "10mcg K2" },
      { name: "Curry Leaves (Kadi Patta)", nameHi: "करी पत्ता", emoji: "🌿", type: "veg", serving: "10 leaves", amount: "21mcg" },
    ],
    deficiencySymptoms: [
      "Easy bruising and prolonged bleeding",
      "Haemorrhagic disease of the newborn (if not given at birth)",
      "Osteoporosis — weak bones",
      "Heavy menstrual bleeding",
    ],
    deficiencyHi: [
      "आसान नील और लंबे समय तक खून बहना",
      "नवजात शिशु में रक्तस्रावी रोग",
      "ऑस्टियोपोरोसिस",
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
  ageCategoryHi: string;
  portionNote: string;
  portionNoteHi: string;
  applies: AgeGroupId[];        // which age groups use this plan
  days: DayPlan[];
};

export const MEAL_PLANS: AgeGroupPlan[] = [
  {
    ageCategory: "Infants (6–12 months)",
    ageCategoryHi: "शिशु (6–12 महीने)",
    portionNote: "Start with 2–3 tsp, gradually increase to 3–4 tbsp per meal. Always continue breastfeeding.",
    portionNoteHi: "2–3 चम्मच से शुरू करें, धीरे-धीरे 3–4 बड़े चम्मच तक बढ़ाएं। स्तनपान जारी रखें।",
    applies: ["infant_6_12"],
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
    ageCategoryHi: "छोटे बच्चे (1–6 साल)",
    portionNote: "Small portions 5–6 times a day. 1 small katori per item. No whole nuts or hard pieces. Low salt/sugar.",
    portionNoteHi: "दिन में 5–6 बार छोटे हिस्से। प्रत्येक आइटम के लिए 1 छोटी कटोरी। पूरे मेवे या कठोर टुकड़े न दें।",
    applies: ["toddler_1_3", "preschool_3_6"],
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
    ageCategoryHi: "स्कूली बच्चे (6–15 साल)",
    portionNote: "Regular adult-sized portions. 3 main meals + 1–2 snacks. Breakfast is non-negotiable for concentration.",
    portionNoteHi: "नियमित वयस्क आकार के हिस्से। 3 मुख्य भोजन + 1–2 नाश्ते। नाश्ता जरूरी है।",
    applies: ["school_6_10", "preteen_10_15"],
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
    ageCategoryHi: "वयस्क, गर्भवती और प्रसवोत्तर",
    portionNote: "Balanced plate: 50% veg, 25% grains, 25% protein. Pregnant: +300–500 kcal/day. Breastfeeding: +500 kcal/day.",
    portionNoteHi: "संतुलित थाली: 50% सब्जी, 25% अनाज, 25% प्रोटीन। गर्भावस्था: +300–500 kcal/day।",
    applies: ["adult", "pregnancy", "postpartum"],
    days: [
      { day: "Monday", veg: { breakfast: "Moong dal chilla + dahi + fruits + tea/coffee", lunch: "2 roti + dal + sabzi + salad + dahi + ghee", snack: "Roasted chana + amla / orange", dinner: "2 roti + paneer sabzi + dal + salad" }, nonVeg: { breakfast: "2 egg omelette + toast + fruits + milk", lunch: "Rice + chicken curry + dal + salad", snack: "Boiled egg + fruit / nuts", dinner: "2 roti + chicken curry + dal + sabzi" } },
      { day: "Tuesday", veg: { breakfast: "Idli (3–4) + sambhar + chutney + milk", lunch: "Rajma rice + curd + salad + papad + pickle", snack: "Sprout chat + nimbu pani", dinner: "Roti + mixed dal + sabzi + salad" }, nonVeg: { breakfast: "Egg paratha + fruit + milk", lunch: "Fish curry + rice + dal + salad", snack: "Tuna sandwich", dinner: "Roti + fish sabzi + dal" } },
      { day: "Wednesday", veg: { breakfast: "Poha + peanuts + dahi + fruit", lunch: "Dal + rice + aloo gobi + papad + ghee", snack: "Mixed nuts (30g) + fruit", dinner: "Roti + palak dal + sabzi" }, nonVeg: { breakfast: "Egg bhurji + toast + fruit", lunch: "Mutton curry + rice + salad", snack: "Chicken tikka + fruit", dinner: "Roti + prawn curry + sabzi" } },
      { day: "Thursday", veg: { breakfast: "Upma + coconut chutney + milk + fruit", lunch: "Chole bhature + salad + lassi", snack: "Roasted makhana + green tea", dinner: "Roti + paneer + dal + salad" }, nonVeg: { breakfast: "2 eggs (any style) + toast + fruit", lunch: "Chicken curry + rice + salad", snack: "Egg chaat + nimbu pani", dinner: "Roti + chicken sabzi + dal" } },
      { day: "Friday", veg: { breakfast: "Dosa (2) + sambhar + chutney + fruit + milk", lunch: "Vegetable biryani + raita + papad + pickle", snack: "Banana + groundnut chikki or nuts", dinner: "Roti + dal makhani + sabzi" }, nonVeg: { breakfast: "Fish sandwich + fruit + milk", lunch: "Prawn biryani + raita + salad", snack: "Boiled egg + fruit", dinner: "Roti + fish curry + dal" } },
      { day: "Saturday", veg: { breakfast: "Paratha + dahi + seasonal fruit + milk", lunch: "Kadhi chawal + mixed sabzi + salad", snack: "Fruit smoothie (banana + milk + seeds)", dinner: "Roti + paneer sabzi + mixed dal" }, nonVeg: { breakfast: "Egg paratha + lassi + fruit", lunch: "Mutton curry + rice + raita", snack: "Chicken soup + nuts", dinner: "Roti + chicken curry + dal + salad" } },
      { day: "Sunday", veg: { breakfast: "Special thali: puri + aloo sabzi + halwa + milk", lunch: "Dal + rice + sabzi + kheer + salad", snack: "Fruit chaat + nimbu pani", dinner: "Light khichdi + ghee + dahi + papad" }, nonVeg: { breakfast: "Egg paratha + special sweet + milk", lunch: "Biryani (chicken/mutton) + raita + salad", snack: "Chicken soup + fruit juice", dinner: "Light khichdi + chicken soup" } },
    ],
  },
];

// ─── Family Mode ──────────────────────────────────────────────────────────────

export type FamilyPortionRow = {
  food: string;
  foodHi: string;
  emoji: string;
  infant: string;
  toddler: string;
  schoolChild: string;
  teen: string;
  adult: string;
  pregnant: string;
};

export const FAMILY_PORTIONS: FamilyPortionRow[] = [
  { food: "Rice (cooked)", foodHi: "चावल (पका हुआ)", emoji: "🍚", infant: "2–3 tbsp", toddler: "¼ katori", schoolChild: "1 katori", teen: "1.5 katori", adult: "1 katori", pregnant: "1.5 katori" },
  { food: "Roti / Chapati", foodHi: "रोटी/चपाती", emoji: "🫓", infant: "Tiny soft pieces", toddler: "½–1 small", schoolChild: "2 medium", teen: "3 medium", adult: "2–3 medium", pregnant: "3 medium" },
  { food: "Dal (cooked)", foodHi: "दाल", emoji: "🫘", infant: "2–4 tbsp", toddler: "½ katori", schoolChild: "1 katori", teen: "1.5 katori", adult: "1 katori", pregnant: "1.5 katori" },
  { food: "Vegetables / Sabzi", foodHi: "सब्जी", emoji: "🥗", infant: "2–3 tbsp (soft/mashed)", toddler: "½ katori soft", schoolChild: "1 katori", teen: "1–1.5 katori", adult: "2 katori (half plate)", pregnant: "2 katori" },
  { food: "Milk / Dahi", foodHi: "दूध/दही", emoji: "🥛", infant: "Breast milk (primary)", toddler: "150–200ml milk", schoolChild: "200–300ml", teen: "300–400ml", adult: "200ml", pregnant: "400ml+" },
  { food: "Dal / Paneer / Egg", foodHi: "दाल/पनीर/अंडा", emoji: "🥚", infant: "Pureed, 2 tbsp", toddler: "25–30g paneer / ½ egg", schoolChild: "50g paneer / 1 egg", teen: "75g / 2 eggs", adult: "75–100g", pregnant: "100g+" },
  { food: "Fruit", foodHi: "फल", emoji: "🍎", infant: "Puree, 2–3 tbsp", toddler: "¼–½ small fruit", schoolChild: "1 medium fruit", teen: "1–2 fruits", adult: "1–2 fruits", pregnant: "2 fruits" },
  { food: "Ghee / Oil", foodHi: "घी/तेल", emoji: "🫙", infant: "½ tsp in food", toddler: "½–1 tsp", schoolChild: "1–1.5 tsp", teen: "1.5–2 tsp", adult: "3–4 tsp/day total", pregnant: "3–4 tsp/day" },
  { food: "Water", foodHi: "पानी", emoji: "💧", infant: "No plain water <6m; sips 6–12m", toddler: "600–800ml", schoolChild: "1–1.5 L", teen: "1.5–2 L", adult: "2–2.5 L", pregnant: "2.5–3 L" },
];

// ─── Medical Disclaimer & References ─────────────────────────────────────────

export const MEDICAL_DISCLAIMER = {
  en: "This Nutrition Hub is intended for educational purposes only. The information provided is based on general scientific guidelines and is not a substitute for personalised medical or nutritional advice. Always consult a qualified paediatrician, dietitian, or physician for specific health concerns, medical conditions, or before starting any supplement. Individual requirements vary based on health status, activity level, and genetics.",
  hi: "यह न्यूट्रिशन हब केवल शैक्षणिक उद्देश्यों के लिए है। यहाँ दी गई जानकारी सामान्य वैज्ञानिक दिशा-निर्देशों पर आधारित है और किसी डॉक्टर या पोषण विशेषज्ञ की व्यक्तिगत सलाह का विकल्प नहीं है। किसी भी स्वास्थ्य समस्या के लिए हमेशा योग्य बाल रोग विशेषज्ञ, आहार विशेषज्ञ या चिकित्सक से परामर्श करें।",
};

export const REFERENCES = [
  "ICMR-NIN (2020). Nutrient Requirements for Indians. Indian Council of Medical Research – National Institute of Nutrition.",
  "WHO (2021). Healthy diet fact sheet. World Health Organization.",
  "WHO (2022). Infant and young child feeding. World Health Organization.",
  "IAP (2022). Revised IAP guidelines on Vitamin D supplementation.",
  "National Family Health Survey – 5 (NFHS-5, 2020–21). Ministry of Health & Family Welfare, Government of India.",
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
