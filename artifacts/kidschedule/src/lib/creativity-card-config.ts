import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import {
  BookOpen,
  Calculator,
  Globe,
  Heart,
  Lightbulb,
  Mic,
  PartyPopper,
  Puzzle,
  Rocket,
  Scissors,
  Smile,
  Sparkles,
  Star,
  Video,
} from "lucide-react";

export type CreativityCardId =
  | "section-header"
  | "activities"
  | "origami-studio"
  | "art-craft"
  | "worksheets"
  | "coloring-books"
  | "fun-sheets"
  | "curiosity-library"
  | "event-prep";

const BASE = "/illustrations/creativity";

export const CREATIVITY_SECTION_HEADER_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/section-header-icon.png`,
  heroSrc: `${BASE}/section-header-hero.png`,
  surfaceGradient:
    "linear-gradient(135deg, rgba(76,29,149,0.62) 0%, rgba(91,33,182,0.54) 45%, rgba(109,40,217,0.46) 100%)",
  ambientGlow:
    "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(168,85,247,0.4), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(139,92,246,0.32), transparent 55%)",
  borderHover: "group-hover:border-violet-300/35",
  chipBorder: "border-violet-200/15",
  ctaGradient: "from-violet-400 via-purple-500 to-fuchsia-500",
  ctaShadow: "shadow-[0_0_20px_rgba(139,92,246,0.45)] group-hover:shadow-[0_0_28px_rgba(168,85,247,0.55)]",
  glyphColor: "text-violet-100/80",
  floatingGlyphs: ["✦", "★", "✦"],
  chips: [
    { icon: Sparkles, labelKey: "parent_hub.creativity_cards.section.chip_1", defaultLabel: "Create" },
    { icon: Star, labelKey: "parent_hub.creativity_cards.section.chip_2", defaultLabel: "Play" },
  ],
};

export const CREATIVITY_CARD_VISUALS: Record<Exclude<CreativityCardId, "section-header">, HubPremiumCardVisual> = {
  activities: {
    iconSrc: `${BASE}/activities-icon.png`,
    heroSrc: `${BASE}/activities-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(6,95,70,0.58) 0%, rgba(5,150,105,0.5) 42%, rgba(14,165,233,0.4) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(52,211,153,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(34,211,238,0.28), transparent 55%)",
    borderHover: "group-hover:border-emerald-300/35",
    chipBorder: "border-emerald-200/15",
    ctaGradient: "from-emerald-400 via-teal-500 to-cyan-500",
    ctaShadow: "shadow-[0_0_20px_rgba(52,211,153,0.42)] group-hover:shadow-[0_0_28px_rgba(45,212,191,0.55)]",
    glyphColor: "text-emerald-100/80",
    floatingGlyphs: ["A", "★", "+"],
    chips: [
      { icon: Puzzle, labelKey: "parent_hub.creativity_cards.activities.chip_1", defaultLabel: "Games" },
      { icon: Star, labelKey: "parent_hub.creativity_cards.activities.chip_2", defaultLabel: "Skills" },
    ],
  },
  "origami-studio": {
    iconSrc: `${BASE}/origami-studio-icon.png`,
    heroSrc: `${BASE}/origami-studio-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(126,34,206,0.58) 0%, rgba(147,51,234,0.5) 45%, rgba(192,38,211,0.4) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(192,132,252,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(217,70,239,0.28), transparent 55%)",
    borderHover: "group-hover:border-fuchsia-300/35",
    chipBorder: "border-fuchsia-200/15",
    ctaGradient: "from-fuchsia-400 via-purple-500 to-violet-500",
    ctaShadow: "shadow-[0_0_20px_rgba(192,38,211,0.42)] group-hover:shadow-[0_0_28px_rgba(217,70,239,0.55)]",
    glyphColor: "text-fuchsia-100/80",
    floatingGlyphs: ["✦", "★", "✦"],
    chips: [
      { icon: BookOpen, labelKey: "parent_hub.creativity_cards.origami_studio.chip_1", defaultLabel: "Easy" },
      { icon: Sparkles, labelKey: "parent_hub.creativity_cards.origami_studio.chip_2", defaultLabel: "Creative" },
    ],
  },
  "art-craft": {
    iconSrc: `${BASE}/art-craft-icon.png`,
    heroSrc: `${BASE}/art-craft-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(194,65,12,0.58) 0%, rgba(234,88,12,0.5) 45%, rgba(251,146,60,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(251,146,60,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(244,114,182,0.25), transparent 55%)",
    borderHover: "group-hover:border-orange-300/35",
    chipBorder: "border-orange-200/15",
    ctaGradient: "from-orange-400 via-amber-500 to-pink-500",
    ctaShadow: "shadow-[0_0_20px_rgba(251,146,60,0.42)] group-hover:shadow-[0_0_28px_rgba(244,114,182,0.45)]",
    glyphColor: "text-orange-100/80",
    floatingGlyphs: ["✂", "◆", "▶"],
    chips: [
      { icon: Scissors, labelKey: "parent_hub.creativity_cards.art_craft.chip_1", defaultLabel: "DIY" },
      { icon: Video, labelKey: "parent_hub.creativity_cards.art_craft.chip_2", defaultLabel: "Tutorials" },
    ],
  },
  worksheets: {
    iconSrc: `${BASE}/worksheets-icon.png`,
    heroSrc: `${BASE}/worksheets-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(30,58,138,0.58) 0%, rgba(37,99,235,0.5) 45%, rgba(6,182,212,0.4) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(96,165,250,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(34,211,238,0.28), transparent 55%)",
    borderHover: "group-hover:border-sky-300/35",
    chipBorder: "border-sky-200/15",
    ctaGradient: "from-sky-400 via-blue-500 to-cyan-500",
    ctaShadow: "shadow-[0_0_20px_rgba(56,189,248,0.42)] group-hover:shadow-[0_0_28px_rgba(34,211,238,0.55)]",
    glyphColor: "text-sky-100/80",
    floatingGlyphs: ["123", "★", "P"],
    chips: [
      { icon: Calculator, labelKey: "parent_hub.creativity_cards.worksheets.chip_1", defaultLabel: "Math" },
      { icon: BookOpen, labelKey: "parent_hub.creativity_cards.worksheets.chip_2", defaultLabel: "Tracing" },
    ],
  },
  "coloring-books": {
    iconSrc: `${BASE}/coloring-books-icon.png`,
    heroSrc: `${BASE}/coloring-books-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(190,24,93,0.58) 0%, rgba(219,39,119,0.5) 45%, rgba(168,85,247,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(244,114,182,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(192,132,252,0.28), transparent 55%)",
    borderHover: "group-hover:border-pink-300/35",
    chipBorder: "border-pink-200/15",
    ctaGradient: "from-pink-400 via-fuchsia-500 to-purple-500",
    ctaShadow: "shadow-[0_0_20px_rgba(244,114,182,0.42)] group-hover:shadow-[0_0_28px_rgba(192,132,252,0.55)]",
    glyphColor: "text-pink-100/80",
    floatingGlyphs: ["★", "◆", "★"],
    chips: [
      { icon: Smile, labelKey: "parent_hub.creativity_cards.coloring_books.chip_1", defaultLabel: "Fun" },
      { icon: Heart, labelKey: "parent_hub.creativity_cards.coloring_books.chip_2", defaultLabel: "Relaxing" },
    ],
  },
  "fun-sheets": {
    iconSrc: `${BASE}/fun-sheets-icon.png`,
    heroSrc: `${BASE}/fun-sheets-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(54,83,20,0.58) 0%, rgba(101,163,13,0.5) 45%, rgba(132,204,22,0.4) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(163,230,53,0.32), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(132,204,22,0.25), transparent 55%)",
    borderHover: "group-hover:border-lime-300/35",
    chipBorder: "border-lime-200/15",
    ctaGradient: "from-lime-400 via-green-500 to-emerald-500",
    ctaShadow: "shadow-[0_0_20px_rgba(163,230,53,0.38)] group-hover:shadow-[0_0_28px_rgba(132,204,22,0.5)]",
    glyphColor: "text-lime-100/80",
    floatingGlyphs: ["+", "★", "◆"],
    chips: [
      { icon: Puzzle, labelKey: "parent_hub.creativity_cards.fun_sheets.chip_1", defaultLabel: "Activities" },
      { icon: Star, labelKey: "parent_hub.creativity_cards.fun_sheets.chip_2", defaultLabel: "Puzzle" },
    ],
  },
  "curiosity-library": {
    iconSrc: `${BASE}/curiosity-library-icon.png`,
    heroSrc: `${BASE}/curiosity-library-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(146,64,14,0.58) 0%, rgba(180,83,9,0.5) 45%, rgba(217,119,6,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(251,191,36,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(245,158,11,0.28), transparent 55%)",
    borderHover: "group-hover:border-amber-300/35",
    chipBorder: "border-amber-200/15",
    ctaGradient: "from-amber-400 via-orange-500 to-yellow-500",
    ctaShadow: "shadow-[0_0_20px_rgba(251,146,60,0.45)] group-hover:shadow-[0_0_28px_rgba(251,191,36,0.55)]",
    glyphColor: "text-amber-100/80",
    floatingGlyphs: ["★", "◆", "★"],
    chips: [
      { icon: Globe, labelKey: "parent_hub.creativity_cards.curiosity_library.chip_1", defaultLabel: "Explore" },
      { icon: Rocket, labelKey: "parent_hub.creativity_cards.curiosity_library.chip_2", defaultLabel: "Science" },
    ],
  },
  "event-prep": {
    iconSrc: `${BASE}/event-prep-icon.png`,
    heroSrc: `${BASE}/event-prep-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(109,40,217,0.58) 0%, rgba(147,51,234,0.48) 45%, rgba(249,115,22,0.38) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(168,85,247,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(251,146,60,0.28), transparent 55%)",
    borderHover: "group-hover:border-purple-300/35",
    chipBorder: "border-purple-200/15",
    ctaGradient: "from-purple-400 via-fuchsia-500 to-orange-500",
    ctaShadow: "shadow-[0_0_20px_rgba(168,85,247,0.42)] group-hover:shadow-[0_0_28px_rgba(251,146,60,0.45)]",
    glyphColor: "text-purple-100/80",
    floatingGlyphs: ["★", "◆", "★"],
    chips: [
      { icon: PartyPopper, labelKey: "parent_hub.creativity_cards.event_prep.chip_1", defaultLabel: "Fancy Dress" },
      { icon: Mic, labelKey: "parent_hub.creativity_cards.event_prep.chip_2", defaultLabel: "Speech" },
    ],
  },
};

/** Map hub section ids to creativity premium visual config keys. */
export const CREATIVITY_HUB_SECTION_MAP: Record<string, Exclude<CreativityCardId, "section-header">> = {
  activities: "activities",
  "origami-studio": "origami-studio",
  "art-craft": "art-craft",
  worksheets: "worksheets",
  "coloring-books": "coloring-books",
  "fun-sheets": "fun-sheets",
  "answer-to-kids-how": "curiosity-library",
  "event-prep": "event-prep",
};

export function isCreativityPremiumSection(id: string): id is Exclude<CreativityCardId, "section-header"> {
  return id in CREATIVITY_HUB_SECTION_MAP;
}

export function getCreativityCardVisual(
  sectionId: string,
): HubPremiumCardVisual | undefined {
  const key = CREATIVITY_HUB_SECTION_MAP[sectionId];
  return key ? CREATIVITY_CARD_VISUALS[key] : undefined;
}
