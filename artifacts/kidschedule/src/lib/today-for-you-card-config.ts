import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import {
  Bot,
  CheckCircle2,
  Lightbulb,
  Moon,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

export type TodayForYouCardId =
  | "section-header"
  | "amy-ai"
  | "daily-tips"
  | "generate-routine"
  | "tomorrow-forecast"
  | "command-center";

const BASE = "/illustrations/today-for-you";

export const TODAY_FOR_YOU_SECTION_HEADER_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/section-header-icon.png`,
  heroSrc: `${BASE}/section-header-hero.png`,
  surfaceGradient:
    "linear-gradient(135deg, rgba(124,58,237,0.62) 0%, rgba(79,70,229,0.54) 45%, rgba(147,51,234,0.48) 100%)",
  ambientGlow:
    "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(168,85,247,0.42), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(244,114,182,0.32), transparent 55%)",
  borderHover: "group-hover:border-violet-300/40",
  chipBorder: "border-violet-200/15",
  ctaGradient: "from-violet-400 via-purple-500 to-fuchsia-500",
  ctaShadow: "shadow-[0_0_24px_rgba(168,85,247,0.5)] group-hover:shadow-[0_0_32px_rgba(192,132,252,0.6)]",
  glyphColor: "text-violet-100/80",
  floatingGlyphs: ["★", "✦", "★"],
  chips: [
    { icon: Sparkles, labelKey: "parent_hub.today_for_you_cards.section.chip_1", defaultLabel: "AI Ready" },
    { icon: Star, labelKey: "parent_hub.today_for_you_cards.section.chip_2", defaultLabel: "For You" },
  ],
};

export const TODAY_FOR_YOU_CARD_VISUALS: Record<
  Exclude<TodayForYouCardId, "section-header">,
  HubPremiumCardVisual
> = {
  "amy-ai": {
    iconSrc: `${BASE}/amy-ai-icon.png`,
    heroSrc: `${BASE}/amy-ai-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(109,40,217,0.62) 0%, rgba(79,70,229,0.54) 45%, rgba(219,39,119,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(168,85,247,0.4), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(244,114,182,0.3), transparent 55%)",
    borderHover: "group-hover:border-purple-300/40",
    chipBorder: "border-purple-200/15",
    ctaGradient: "from-violet-400 via-purple-500 to-pink-500",
    ctaShadow: "shadow-[0_0_24px_rgba(139,92,246,0.5)] group-hover:shadow-[0_0_32px_rgba(168,85,247,0.6)]",
    glyphColor: "text-purple-100/80",
    floatingGlyphs: ["◉", "★", "◉"],
    chips: [
      { icon: Bot, labelKey: "parent_hub.today_for_you_cards.amy_ai.chip_1", defaultLabel: "AI Chat" },
      { icon: Lightbulb, labelKey: "parent_hub.today_for_you_cards.amy_ai.chip_2", defaultLabel: "Smart Advice" },
    ],
  },
  "daily-tips": {
    iconSrc: `${BASE}/daily-tips-icon.png`,
    heroSrc: `${BASE}/daily-tips-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(180,83,9,0.62) 0%, rgba(217,119,6,0.54) 45%, rgba(234,88,12,0.46) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(251,191,36,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(249,115,22,0.28), transparent 55%)",
    borderHover: "group-hover:border-amber-300/40",
    chipBorder: "border-amber-200/15",
    ctaGradient: "from-amber-400 via-orange-500 to-yellow-500",
    ctaShadow: "shadow-[0_0_24px_rgba(251,191,36,0.45)] group-hover:shadow-[0_0_32px_rgba(249,115,22,0.55)]",
    glyphColor: "text-amber-100/80",
    floatingGlyphs: ["★", "✦", "★"],
    chips: [
      { icon: Star, labelKey: "parent_hub.today_for_you_cards.daily_tips.chip_1", defaultLabel: "Daily Pick" },
      { icon: CheckCircle2, labelKey: "parent_hub.today_for_you_cards.daily_tips.chip_2", defaultLabel: "Easy To Apply" },
    ],
  },
  "generate-routine": {
    iconSrc: `${BASE}/generate-routine-icon.png`,
    heroSrc: `${BASE}/generate-routine-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(13,148,136,0.62) 0%, rgba(20,184,166,0.54) 45%, rgba(37,99,235,0.44) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(45,212,191,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(52,211,153,0.28), transparent 55%)",
    borderHover: "group-hover:border-teal-300/40",
    chipBorder: "border-teal-200/15",
    ctaGradient: "from-teal-400 via-emerald-500 to-cyan-500",
    ctaShadow: "shadow-[0_0_24px_rgba(45,212,191,0.45)] group-hover:shadow-[0_0_32px_rgba(52,211,153,0.55)]",
    glyphColor: "text-teal-100/80",
    floatingGlyphs: ["✓", "★", "◆"],
    chips: [
      { icon: Users, labelKey: "parent_hub.today_for_you_cards.generate_routine.chip_1", defaultLabel: "Personalised" },
      { icon: Sparkles, labelKey: "parent_hub.today_for_you_cards.generate_routine.chip_2", defaultLabel: "Smart Plan" },
    ],
  },
  "tomorrow-forecast": {
    iconSrc: `${BASE}/tomorrow-forecast-icon.png`,
    heroSrc: `${BASE}/tomorrow-forecast-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(37,99,235,0.62) 0%, rgba(79,70,229,0.54) 45%, rgba(147,51,234,0.46) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(96,165,250,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(129,140,248,0.28), transparent 55%)",
    borderHover: "group-hover:border-blue-300/40",
    chipBorder: "border-blue-200/15",
    ctaGradient: "from-blue-400 via-indigo-500 to-violet-500",
    ctaShadow: "shadow-[0_0_24px_rgba(59,130,246,0.45)] group-hover:shadow-[0_0_32px_rgba(99,102,241,0.55)]",
    glyphColor: "text-blue-100/80",
    floatingGlyphs: ["☾", "★", "✦"],
    chips: [
      { icon: Zap, labelKey: "parent_hub.today_for_you_cards.tomorrow_forecast.chip_1", defaultLabel: "Energy" },
      { icon: Moon, labelKey: "parent_hub.today_for_you_cards.tomorrow_forecast.chip_2", defaultLabel: "Sleep" },
    ],
  },
  "command-center": {
    iconSrc: `${BASE}/command-center-icon.png`,
    heroSrc: `${BASE}/command-center-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(30,27,75,0.68) 0%, rgba(49,46,129,0.58) 45%, rgba(88,28,135,0.48) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(99,102,241,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(168,85,247,0.28), transparent 55%)",
    borderHover: "group-hover:border-indigo-300/35",
    chipBorder: "border-indigo-200/15",
    ctaGradient: "from-indigo-400 via-violet-500 to-purple-500",
    ctaShadow: "shadow-[0_0_24px_rgba(99,102,241,0.45)] group-hover:shadow-[0_0_32px_rgba(129,140,248,0.55)]",
    glyphColor: "text-indigo-100/80",
    floatingGlyphs: ["◆", "★", "◆"],
    chips: [
      { icon: TrendingUp, labelKey: "parent_hub.today_for_you_cards.command_center.chip_1", defaultLabel: "Insights" },
      { icon: Trophy, labelKey: "parent_hub.today_for_you_cards.command_center.chip_2", defaultLabel: "Progress" },
    ],
  },
};

export const TODAY_FOR_YOU_HUB_SECTION_MAP: Record<
  string,
  Exclude<TodayForYouCardId, "section-header">
> = {
  "amy-ai": "amy-ai",
  "daily-tips": "daily-tips",
  "generate-routine": "generate-routine",
  "tomorrow-forecast": "tomorrow-forecast",
  "command-center": "command-center",
};

export const TODAY_FOR_YOU_CARD_BADGES: Partial<
  Record<Exclude<TodayForYouCardId, "section-header">, string>
> = {
  "amy-ai": "AI ASSISTANT",
  "daily-tips": "TODAY'S PICK",
  "generate-routine": "AI GENERATED",
  "tomorrow-forecast": "AI FORECAST",
  "command-center": "EXECUTIVE DASHBOARD",
};

export type TodayForYouLaunchCardId = "generate-routine";
