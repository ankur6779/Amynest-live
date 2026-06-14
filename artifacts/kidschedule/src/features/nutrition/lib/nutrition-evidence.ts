import type { AgeGroupId } from "@/lib/nutrition-data";

export interface NutrientEvidence {
  nutrientId: string;
  summary: string;
  ageGuidance: Partial<Record<AgeGroupId, string>>;
  source: string;
}

/** Static, parent-friendly evidence — not shown as citations in UI by default. */
export const NUTRIENT_EVIDENCE: Record<string, NutrientEvidence> = {
  protein: {
    nutrientId: "protein",
    summary: "Protein supports everyday growth, tissue repair, and immune function in children.",
    ageGuidance: {
      toddler_1_3: "Toddlers benefit from protein across meals to support steady growth.",
      preschool_3_6: "Preschoolers need regular protein for active play and development.",
      school_6_10: "School-age children use protein for growth, focus, and recovery after activity.",
      infant_6_12: "Complementary foods should include iron-rich and protein sources alongside breast milk.",
    },
    source: "WHO complementary feeding guidance; ICMR-NIN 2020",
  },
  iron: {
    nutrientId: "iron",
    summary: "Iron-rich foods help support energy, learning, and healthy blood formation.",
    ageGuidance: {
      infant_6_12: "Iron becomes especially important when complementary feeding begins.",
      toddler_1_3: "Offer iron-rich foods daily — pair with vitamin C sources when possible.",
      preschool_3_6: "Regular iron variety supports attention and active days.",
      school_6_10: "School-age children benefit from consistent iron-rich meals and snacks.",
    },
    source: "WHO; ICMR-NIN 2020",
  },
  calcium: {
    nutrientId: "calcium",
    summary: "Calcium supports bone and tooth development during childhood.",
    ageGuidance: {
      toddler_1_3: "Milk, curd, ragi, and paneer are familiar calcium sources for toddlers.",
      preschool_3_6: "Calcium-rich snacks and meals support growing bones.",
      school_6_10: "Consistent calcium intake matters through the school years.",
    },
    source: "ICMR-NIN 2020; WHO child growth guidance",
  },
  vitamin_a: {
    nutrientId: "vitamin_a",
    summary: "Vitamin A supports vision, skin health, and immune function.",
    ageGuidance: {
      toddler_1_3: "Colourful vegetables and fruits add vitamin A variety.",
      preschool_3_6: "Orange and green vegetables are easy wins for vitamin A.",
      school_6_10: "Regular vegetable intake supports everyday wellness.",
    },
    source: "WHO; ICMR-NIN 2020",
  },
  vitamin_c: {
    nutrientId: "vitamin_c",
    summary: "Vitamin C supports immunity and helps the body use iron from plant foods.",
    ageGuidance: {
      toddler_1_3: "Fruit at snack time adds vitamin C naturally.",
      preschool_3_6: "Citrus and seasonal fruit support iron absorption at meals.",
      school_6_10: "Fruit and vegetables add vitamin C to balanced plates.",
    },
    source: "ICMR-NIN 2020",
  },
  vitamin_d: {
    nutrientId: "vitamin_d",
    summary: "Vitamin D works with calcium to support bone health.",
    ageGuidance: {
      toddler_1_3: "Sunlight, fortified foods, and balanced meals support vitamin D intake.",
      school_6_10: "Outdoor play and varied meals contribute to vitamin D habits.",
    },
    source: "ICMR-NIN 2020",
  },
  variety: {
    nutrientId: "variety",
    summary: "A varied plate across the week helps cover multiple nutrients without pressure.",
    ageGuidance: {
      toddler_1_3: "Rotating grains, dals, vegetables, and fruit keeps meals interesting.",
      preschool_3_6: "Small portions of many foods build flexible eating habits.",
      school_6_10: "Weekly variety supports balanced nutrition at school and home.",
    },
    source: "WHO complementary feeding; ICMR-NIN dietary diversity",
  },
};

export const WHO_PARENT_GUIDANCE = [
  "Continue responsive feeding — offer healthy options without force.",
  "Breast milk remains important for infants under two where applicable.",
  "Include vegetables, fruit, pulses, and grains across the week.",
  "Limit ultra-processed snacks; favour home-cooked family meals.",
] as const;

export function getEvidenceForNutrient(
  nutrientId: string,
  ageGroupId: AgeGroupId,
): { summary: string; detail: string; source: string } {
  const entry = NUTRIENT_EVIDENCE[nutrientId] ?? NUTRIENT_EVIDENCE.variety!;
  const ageNote = entry.ageGuidance[ageGroupId];
  return {
    summary: entry.summary,
    detail: ageNote ?? entry.summary,
    source: entry.source,
  };
}
