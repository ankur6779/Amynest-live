/**
 * Traditional content pack (Pack 5 Addendum A).
 * Bump TRADITIONAL_CONTENT_VERSION when cultural copy/cards change —
 * does not require sky snapshot regeneration.
 */

export const TRADITIONAL_CONTENT_VERSION = "tradition_pack/1.0.0" as const;

export type TraditionCardCategory =
  | "lunar_mansion"
  | "classic_theme"
  | "historical_meaning"
  | "time_dependent";

export type TraditionCardTemplate = {
  id: string;
  category: TraditionCardCategory;
  /** Requires exact/approx birth time (rising/houses). */
  requiresExactTime: boolean;
  title: string;
  summary: string;
  story: string;
  /** Template uses {{moonSign}} / {{sunSign}} / {{moonPhaseLabel}} / {{risingSign}}. */
  usesPlaceholders?: boolean;
};

/** Equal 27-fold ecliptic keys — cultural indexing only, not scientific claims. */
export const LUNAR_MANSION_KEYS = Array.from({ length: 27 }, (_, i) =>
  `mansion_${String(i + 1).padStart(2, "0")}`,
);

const MANSION_STORIES: Record<string, { title: string; summary: string; story: string }> = {
  mansion_01: {
    title: "A beginning moon",
    summary: "Some families link early lunar mansions with fresh starts.",
    story:
      "In several cultural traditions, the earliest lunar mansion is associated with openings and gentle beginnings. Parents sometimes use this as a quiet prompt to notice how their child meets new places — not as a forecast.",
  },
  mansion_07: {
    title: "A gathering moon",
    summary: "Mid-early mansions are often tied to companionship stories.",
    story:
      "Traditional storytellers have sometimes described this lunar sector as a time of gathering. You might simply notice who your child softens around — curiosity, not destiny.",
  },
  mansion_14: {
    title: "A fullness moon",
    summary: "Near-full mansion stories speak of visibility and warmth.",
    story:
      "Around the middle of the lunar mansion cycle, many cultures tell stories of fullness and shared light. Families have reflected on presence and care — never as a guarantee of temperament.",
  },
  mansion_21: {
    title: "A turning moon",
    summary: "Later mansions often carry themes of release and rest.",
    story:
      "Later mansion lore sometimes emphasizes release and quieter rhythms. Some parents take that as permission to rest together — a cultural metaphor, not a medical claim.",
  },
  mansion_27: {
    title: "A closing moon",
    summary: "The last mansion is often framed as completion and return.",
    story:
      "The final mansion in many traditional lists is linked with completion and return. You might treat it as a reminder that cycles close gently — not as a prediction about your child.",
  },
};

function mansionFallback(key: string): { title: string; summary: string; story: string } {
  const n = key.replace("mansion_", "");
  return {
    title: "A lunar mansion story",
    summary: "A traditional cultural reflection keyed to the moon’s sky sector.",
    story: `In tradition, lunar mansion ${n} has been one of many ways families mark the night sky’s rhythm. This is a cultural story only — not astronomy, and not a prediction about your child’s future.`,
  };
}

export function getMansionStory(mansionKey: string) {
  return MANSION_STORIES[mansionKey] ?? mansionFallback(mansionKey);
}

export const TRADITION_CARD_TEMPLATES: TraditionCardTemplate[] = [
  {
    id: "trad_moon_mansion",
    category: "lunar_mansion",
    requiresExactTime: false,
    title: "", // filled from mansion pack
    summary: "",
    story: "",
  },
  {
    id: "trad_classic_moon",
    category: "classic_theme",
    requiresExactTime: false,
    usesPlaceholders: true,
    title: "Moon themes in tradition",
    summary: "Some families reflect on the Moon sign as a soft cultural theme.",
    story:
      "In tradition, the Moon in {{moonSign}} has often been a starting point for gentle stories about care and mood. Families have used this as a conversation prompt — never as scientific proof or a fixed label for your child.",
  },
  {
    id: "trad_classic_sun",
    category: "classic_theme",
    requiresExactTime: false,
    usesPlaceholders: true,
    title: "Sun themes in tradition",
    summary: "Classic cultural themes sometimes begin with the Sun sign.",
    story:
      "Traditional almanacs have long spoken of the Sun in {{sunSign}} in broad, symbolic language. You might explore what warmth and vitality mean in your family — as culture, not as destiny.",
  },
  {
    id: "trad_phase_meaning",
    category: "historical_meaning",
    requiresExactTime: false,
    usesPlaceholders: true,
    title: "Phase stories families tell",
    summary: "Historical meanings around the Moon’s phase — labeled as tradition.",
    story:
      "Around a {{moonPhaseLabel}}, some communities have shared stories about light and timing. Parents sometimes sit with that image quietly. It is historical meaning, not a forecast.",
  },
  {
    id: "trad_rising_theme",
    category: "time_dependent",
    requiresExactTime: true,
    usesPlaceholders: true,
    title: "Rising sky in tradition",
    summary: "Rising-linked traditional themes need an exact birth time.",
    story:
      "When birth time is known, some traditional lenses speak of the rising sign {{risingSign}} as a cultural “threshold” image. This remains tradition — not astronomy proof, and not a prediction.",
  },
  {
    id: "trad_parent_bond",
    category: "historical_meaning",
    requiresExactTime: false,
    title: "A parent’s quiet looking",
    summary: "Historically, sky stories were often for parents, not fortune.",
    story:
      "Across cultures, night-sky stories were often shared among caregivers as a way to mark arrival and belonging. Amy Astro keeps that spirit: reflective and optional — never a claim about who your child must become.",
  },
];
