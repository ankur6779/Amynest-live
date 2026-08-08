import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import {
  BookOpen,
  Bot,
  Car,
  Globe,
  Mic,
  Moon,
  Sparkles,
  Star,
  Target,
  Waves,
} from "lucide-react";

export type StoriesCardId =
  | "section-header"
  | "story-hub"
  | "talking-amy"
  | "speech-coach"
  | "discovery-worlds";

const BASE = "/illustrations/stories";

export const STORIES_SECTION_HEADER_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/section-header-icon.png`,
  heroSrc: `${BASE}/section-header-hero.png`,
  surfaceGradient:
    "linear-gradient(135deg, rgba(79,70,229,0.62) 0%, rgba(99,102,241,0.54) 45%, rgba(217,70,239,0.4) 100%)",
  ambientGlow:
    "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(129,140,248,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(217,70,239,0.3), transparent 55%)",
  borderHover: "group-hover:border-indigo-300/35",
  chipBorder: "border-indigo-200/15",
  ctaGradient: "from-fuchsia-400 via-indigo-500 to-violet-500",
  ctaShadow: "shadow-[0_0_20px_rgba(99,102,241,0.45)] group-hover:shadow-[0_0_28px_rgba(217,70,239,0.5)]",
  glyphColor: "text-indigo-100/80",
  floatingGlyphs: ["★", "✦", "★"],
  chips: [
    { icon: BookOpen, labelKey: "parent_hub.stories_cards.section.chip_1", defaultLabel: "Listen" },
    { icon: Sparkles, labelKey: "parent_hub.stories_cards.section.chip_2", defaultLabel: "Imagine" },
  ],
};

export const STORIES_CARD_VISUALS: Record<Exclude<StoriesCardId, "section-header">, HubPremiumCardVisual> = {
  "story-hub": {
    iconSrc: `${BASE}/story-hub-icon.png`,
    heroSrc: `${BASE}/story-hub-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(190,24,93,0.58) 0%, rgba(147,51,234,0.5) 45%, rgba(79,70,229,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(244,114,182,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(168,85,247,0.28), transparent 55%)",
    borderHover: "group-hover:border-fuchsia-300/35",
    chipBorder: "border-fuchsia-200/15",
    ctaGradient: "from-fuchsia-400 via-purple-500 to-indigo-500",
    ctaShadow: "shadow-[0_0_20px_rgba(192,38,211,0.42)] group-hover:shadow-[0_0_28px_rgba(168,85,247,0.55)]",
    glyphColor: "text-fuchsia-100/80",
    floatingGlyphs: ["☾", "★", "✦"],
    chips: [
      { icon: Moon, labelKey: "parent_hub.stories_cards.story_hub.chip_1", defaultLabel: "Bedtime" },
      { icon: BookOpen, labelKey: "parent_hub.stories_cards.story_hub.chip_2", defaultLabel: "Moral Stories" },
    ],
  },
  "talking-amy": {
    iconSrc: `${BASE}/talking-amy-icon.png`,
    heroSrc: `${BASE}/talking-amy-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(42,34,38,0.92) 0%, rgba(58,46,42,0.88) 48%, rgba(36,30,34,0.94) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(232,212,184,0.22), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(180,140,120,0.16), transparent 55%)",
    borderHover: "group-hover:border-[rgba(232,212,184,0.28)]",
    chipBorder: "border-[rgba(232,212,184,0.16)]",
    ctaGradient: "from-amber-200/70 via-stone-300/55 to-rose-200/60",
    ctaShadow: "shadow-[0_8px_24px_rgba(0,0,0,0.28)] group-hover:shadow-[0_10px_28px_rgba(0,0,0,0.34)]",
    glyphColor: "text-[rgba(232,212,184,0.75)]",
    floatingGlyphs: ["·", "✦", "·"],
    chips: [
      { icon: Mic, labelKey: "parent_hub.stories_cards.talking_amy.chip_1", defaultLabel: "Soft voices" },
      { icon: Bot, labelKey: "parent_hub.stories_cards.talking_amy.chip_2", defaultLabel: "On device" },
    ],
  },
  "speech-coach": {
    iconSrc: `${BASE}/speech-coach-icon.png`,
    heroSrc: `${BASE}/speech-coach-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(79,70,229,0.58) 0%, rgba(99,102,241,0.5) 45%, rgba(217,70,239,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(129,140,248,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(217,70,239,0.28), transparent 55%)",
    borderHover: "group-hover:border-indigo-300/35",
    chipBorder: "border-indigo-200/15",
    ctaGradient: "from-fuchsia-400 via-indigo-500 to-violet-500",
    ctaShadow: "shadow-[0_0_20px_rgba(99,102,241,0.42)] group-hover:shadow-[0_0_28px_rgba(217,70,239,0.5)]",
    glyphColor: "text-indigo-100/80",
    floatingGlyphs: ["A", "B", "C"],
    chips: [
      { icon: Waves, labelKey: "parent_hub.stories_cards.speech_coach.chip_1", defaultLabel: "Pronunciation" },
      { icon: Target, labelKey: "parent_hub.stories_cards.speech_coach.chip_2", defaultLabel: "Confidence" },
    ],
  },
  "discovery-worlds": {
    iconSrc: `${BASE}/discovery-worlds-icon.png`,
    heroSrc: `${BASE}/discovery-worlds-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(79,70,229,0.58) 0%, rgba(99,102,241,0.5) 45%, rgba(217,70,239,0.4) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(129,140,248,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(217,70,239,0.28), transparent 55%)",
    borderHover: "group-hover:border-indigo-300/35",
    chipBorder: "border-indigo-200/15",
    ctaGradient: "from-fuchsia-400 via-indigo-500 to-violet-500",
    ctaShadow: "shadow-[0_0_20px_rgba(99,102,241,0.42)] group-hover:shadow-[0_0_28px_rgba(217,70,239,0.5)]",
    glyphColor: "text-indigo-100/80",
    floatingGlyphs: ["★", "◆", "★"],
    chips: [
      { icon: Globe, labelKey: "parent_hub.stories_cards.discovery_worlds.chip_1", defaultLabel: "Animals" },
      { icon: Car, labelKey: "parent_hub.stories_cards.discovery_worlds.chip_2", defaultLabel: "Vehicles" },
    ],
  },
};

export const STORIES_HUB_SECTION_MAP: Record<string, Exclude<StoriesCardId, "section-header">> = {
  "story-hub": "story-hub",
  "speech-coach": "speech-coach",
};

export const STORIES_LAUNCH_CARD_IDS = {
  "talking-amy": "talking-amy",
  "discovery-worlds": "discovery-worlds",
} as const;

export type StoriesLaunchCardId = keyof typeof STORIES_LAUNCH_CARD_IDS;

export const STORIES_CARD_BADGES: Partial<Record<Exclude<StoriesCardId, "section-header">, string>> = {
  "story-hub": "ALL STORIES",
  "talking-amy": "WITH YOU",
  "speech-coach": "DAILY PRACTICE",
  "discovery-worlds": "EXPLORE",
};
