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

export const LEARNING_ZONE_CARD_VISUALS: Record<LearningZoneCardId, HubPremiumCardVisual> = {
  "smart-math-tricks": {
    iconSrc: `${BASE}/smart-math-tricks-icon.png`,
    heroSrc: `${BASE}/smart-math-tricks-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(180,83,9,0.58) 0%, rgba(217,119,6,0.5) 42%, rgba(245,158,11,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(251,191,36,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(249,115,22,0.28), transparent 55%)",
    borderHover: "group-hover:border-amber-300/35",
    chipBorder: "border-amber-200/15",
    ctaGradient: "from-amber-400 via-orange-500 to-amber-600",
    ctaShadow: "shadow-[0_0_20px_rgba(251,146,60,0.45)] group-hover:shadow-[0_0_28px_rgba(251,146,60,0.6)]",
    glyphColor: "text-amber-200/80",
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
      "linear-gradient(135deg, rgba(14,116,144,0.58) 0%, rgba(8,145,178,0.5) 45%, rgba(20,184,166,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(34,211,238,0.32), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(6,182,212,0.28), transparent 55%)",
    borderHover: "group-hover:border-cyan-300/35",
    chipBorder: "border-cyan-200/15",
    ctaGradient: "from-cyan-400 via-sky-500 to-teal-500",
    ctaShadow: "shadow-[0_0_20px_rgba(34,211,238,0.4)] group-hover:shadow-[0_0_28px_rgba(34,211,238,0.55)]",
    glyphColor: "text-cyan-100/80",
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
      "linear-gradient(135deg, rgba(67,56,202,0.58) 0%, rgba(79,70,229,0.5) 45%, rgba(99,102,241,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(129,140,248,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(99,102,241,0.28), transparent 55%)",
    borderHover: "group-hover:border-indigo-300/35",
    chipBorder: "border-indigo-200/15",
    ctaGradient: "from-indigo-400 via-violet-500 to-blue-500",
    ctaShadow: "shadow-[0_0_20px_rgba(99,102,241,0.42)] group-hover:shadow-[0_0_28px_rgba(129,140,248,0.55)]",
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
      "linear-gradient(135deg, rgba(147,51,234,0.58) 0%, rgba(168,85,247,0.5) 45%, rgba(217,70,239,0.4) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(192,132,252,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(236,72,153,0.28), transparent 55%)",
    borderHover: "group-hover:border-fuchsia-300/35",
    chipBorder: "border-fuchsia-200/15",
    ctaGradient: "from-fuchsia-400 via-purple-500 to-pink-500",
    ctaShadow: "shadow-[0_0_20px_rgba(192,38,211,0.42)] group-hover:shadow-[0_0_28px_rgba(217,70,239,0.55)]",
    glyphColor: "text-fuchsia-100/80",
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
      "linear-gradient(135deg, rgba(5,150,105,0.58) 0%, rgba(16,185,129,0.5) 45%, rgba(20,184,166,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(52,211,153,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(45,212,191,0.28), transparent 55%)",
    borderHover: "group-hover:border-emerald-300/35",
    chipBorder: "border-emerald-200/15",
    ctaGradient: "from-emerald-400 via-teal-500 to-green-500",
    ctaShadow: "shadow-[0_0_20px_rgba(52,211,153,0.42)] group-hover:shadow-[0_0_28px_rgba(45,212,191,0.55)]",
    glyphColor: "text-emerald-100/80",
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
      "linear-gradient(135deg, rgba(180,83,9,0.55) 0%, rgba(217,119,6,0.48) 42%, rgba(234,179,8,0.4) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(251,191,36,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(245,158,11,0.3), transparent 55%)",
    borderHover: "group-hover:border-yellow-300/35",
    chipBorder: "border-yellow-200/15",
    ctaGradient: "from-yellow-400 via-amber-500 to-orange-500",
    ctaShadow: "shadow-[0_0_20px_rgba(250,204,21,0.42)] group-hover:shadow-[0_0_28px_rgba(251,191,36,0.55)]",
    glyphColor: "text-amber-100/80",
    floatingGlyphs: ["★", "1st", "★"],
    chips: [
      { icon: Target, labelKey: "parent_hub.learning_zone_cards.olympiad.chip_1", defaultLabel: "Mock Tests" },
      { icon: Trophy, labelKey: "parent_hub.learning_zone_cards.olympiad.chip_2", defaultLabel: "Leaderboards" },
    ],
  },
};

export { stripHubTileEmoji } from "@/lib/hub-premium-card-types";
