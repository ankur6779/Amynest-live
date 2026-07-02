import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import {
  Brain,
  BookOpen,
  Calculator,
  GraduationCap,
  Headphones,
  Mic,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

export type LearningZoneCardId =
  | "smart-math-tricks"
  | "abacus"
  | "phonics"
  | "smart-study"
  | "spelling-mastery"
  | "olympiad";

const BASE = "/illustrations/learning-zone";

export const LEARNING_ZONE_SECTION_HEADER_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/section-header-icon.png`,
  heroSrc: `${BASE}/section-header-hero.png`,
  surfaceGradient:
    "linear-gradient(135deg, rgba(30,64,175,0.6) 0%, rgba(79,70,229,0.54) 46%, rgba(245,158,11,0.4) 100%)",
  ambientGlow:
    "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(129,140,248,0.4), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(251,191,36,0.26), transparent 55%)",
  borderHover: "group-hover:border-indigo-300/40",
  chipBorder: "border-indigo-200/15",
  ctaGradient: "from-amber-400 via-indigo-500 to-blue-500",
  ctaShadow: "shadow-[0_0_24px_rgba(99,102,241,0.48)] group-hover:shadow-[0_0_32px_rgba(251,191,36,0.42)]",
  glyphColor: "text-indigo-100/80",
  floatingGlyphs: ["A", "★", "1"],
  chips: [
    { icon: BookOpen, labelKey: "parent_hub.learning_zone_cards.section.chip_1", defaultLabel: "Learn" },
    { icon: Star, labelKey: "parent_hub.learning_zone_cards.section.chip_2", defaultLabel: "Grow" },
  ],
};

export const LEARNING_ZONE_CARD_VISUALS: Record<LearningZoneCardId, HubPremiumCardVisual> = {
  "smart-math-tricks": {
    iconSrc: `${BASE}/smart-math-tricks-icon.png`,
    heroSrc: `${BASE}/smart-math-tricks-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(30,64,175,0.58) 0%, rgba(37,99,235,0.5) 42%, rgba(245,158,11,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(251,191,36,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(249,115,22,0.28), transparent 55%)",
    borderHover: "group-hover:border-blue-300/35",
    chipBorder: "border-blue-200/15",
    ctaGradient: "from-orange-400 via-blue-500 to-indigo-500",
    ctaShadow: "shadow-[0_0_20px_rgba(59,130,246,0.42)] group-hover:shadow-[0_0_28px_rgba(251,146,60,0.5)]",
    glyphColor: "text-blue-100/80",
    floatingGlyphs: ["5×8", "42", "+"],
    chips: [
      { icon: Zap, labelKey: "parent_hub.learning_zone_cards.smart_math_tricks.chip_1", defaultLabel: "Quick Tricks" },
      { icon: Brain, labelKey: "parent_hub.learning_zone_cards.smart_math_tricks.chip_2", defaultLabel: "Brain Boost" },
    ],
  },
  abacus: {
    iconSrc: `${BASE}/abacus-icon.png`,
    heroSrc: `${BASE}/abacus-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(30,64,175,0.58) 0%, rgba(59,130,246,0.5) 45%, rgba(249,115,22,0.4) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(96,165,250,0.34), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(251,146,60,0.26), transparent 55%)",
    borderHover: "group-hover:border-blue-300/35",
    chipBorder: "border-blue-200/15",
    ctaGradient: "from-orange-400 via-sky-500 to-indigo-500",
    ctaShadow: "shadow-[0_0_20px_rgba(56,189,248,0.4)] group-hover:shadow-[0_0_28px_rgba(251,146,60,0.5)]",
    glyphColor: "text-blue-100/80",
    floatingGlyphs: ["1", "2", "3"],
    chips: [
      { icon: Calculator, labelKey: "parent_hub.learning_zone_cards.abacus.chip_1", defaultLabel: "Mental Math" },
      { icon: Zap, labelKey: "parent_hub.learning_zone_cards.abacus.chip_2", defaultLabel: "Speed" },
    ],
  },
  phonics: {
    iconSrc: `${BASE}/phonics-icon.png`,
    heroSrc: `${BASE}/phonics-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(37,99,235,0.58) 0%, rgba(79,70,229,0.5) 45%, rgba(245,158,11,0.38) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(129,140,248,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(99,102,241,0.28), transparent 55%)",
    borderHover: "group-hover:border-indigo-300/35",
    chipBorder: "border-indigo-200/15",
    ctaGradient: "from-orange-400 via-indigo-500 to-blue-500",
    ctaShadow: "shadow-[0_0_20px_rgba(99,102,241,0.42)] group-hover:shadow-[0_0_28px_rgba(245,158,11,0.45)]",
    glyphColor: "text-indigo-100/80",
    floatingGlyphs: ["A", "B", "C"],
    chips: [
      { icon: Headphones, labelKey: "parent_hub.learning_zone_cards.phonics.chip_1", defaultLabel: "Sounds" },
      { icon: BookOpen, labelKey: "parent_hub.learning_zone_cards.phonics.chip_2", defaultLabel: "Read Better" },
    ],
  },
  "smart-study": {
    iconSrc: `${BASE}/smart-study-icon.png`,
    heroSrc: `${BASE}/smart-study-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(29,78,216,0.58) 0%, rgba(99,102,241,0.5) 45%, rgba(249,115,22,0.36) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(129,140,248,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(251,146,60,0.26), transparent 55%)",
    borderHover: "group-hover:border-indigo-300/35",
    chipBorder: "border-indigo-200/15",
    ctaGradient: "from-orange-400 via-blue-500 to-indigo-500",
    ctaShadow: "shadow-[0_0_20px_rgba(99,102,241,0.42)] group-hover:shadow-[0_0_28px_rgba(251,146,60,0.45)]",
    glyphColor: "text-indigo-100/80",
    floatingGlyphs: ["★", "✦", "★"],
    chips: [
      { icon: GraduationCap, labelKey: "parent_hub.learning_zone_cards.smart_study.chip_1", defaultLabel: "All Subjects" },
      { icon: Star, labelKey: "parent_hub.learning_zone_cards.smart_study.chip_2", defaultLabel: "Practice + Audio" },
    ],
  },
  "spelling-mastery": {
    iconSrc: `${BASE}/spelling-mastery-icon.png`,
    heroSrc: `${BASE}/spelling-mastery-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(30,64,175,0.58) 0%, rgba(37,99,235,0.5) 45%, rgba(251,146,60,0.38) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(96,165,250,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(249,115,22,0.28), transparent 55%)",
    borderHover: "group-hover:border-blue-300/35",
    chipBorder: "border-blue-200/15",
    ctaGradient: "from-orange-400 via-blue-500 to-indigo-500",
    ctaShadow: "shadow-[0_0_20px_rgba(59,130,246,0.42)] group-hover:shadow-[0_0_28px_rgba(249,115,22,0.5)]",
    glyphColor: "text-blue-100/80",
    floatingGlyphs: ["A", "P", "P", "L", "E"],
    chips: [
      { icon: Mic, labelKey: "parent_hub.learning_zone_cards.spelling_mastery.chip_1", defaultLabel: "Dictation" },
      { icon: Trophy, labelKey: "parent_hub.learning_zone_cards.spelling_mastery.chip_2", defaultLabel: "Compete" },
    ],
  },
  olympiad: {
    iconSrc: `${BASE}/olympiad-icon.png`,
    heroSrc: `${BASE}/olympiad-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(29,78,216,0.56) 0%, rgba(37,99,235,0.5) 42%, rgba(234,179,8,0.4) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(251,191,36,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(245,158,11,0.3), transparent 55%)",
    borderHover: "group-hover:border-blue-300/35",
    chipBorder: "border-blue-200/15",
    ctaGradient: "from-amber-400 via-blue-500 to-indigo-500",
    ctaShadow: "shadow-[0_0_20px_rgba(59,130,246,0.42)] group-hover:shadow-[0_0_28px_rgba(250,204,21,0.45)]",
    glyphColor: "text-blue-100/80",
    floatingGlyphs: ["★", "1st", "★"],
    chips: [
      { icon: Target, labelKey: "parent_hub.learning_zone_cards.olympiad.chip_1", defaultLabel: "Mock Tests" },
      { icon: Trophy, labelKey: "parent_hub.learning_zone_cards.olympiad.chip_2", defaultLabel: "Leaderboards" },
    ],
  },
};

export { stripHubTileEmoji } from "@/lib/hub-premium-card-types";
