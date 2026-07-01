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
    "linear-gradient(135deg, rgba(109,40,217,0.62) 0%, rgba(126,34,206,0.56) 46%, rgba(217,119,6,0.4) 100%)",
  ambientGlow:
    "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(168,85,247,0.42), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(251,191,36,0.28), transparent 55%)",
  borderHover: "group-hover:border-violet-300/40",
  chipBorder: "border-violet-200/15",
  ctaGradient: "from-amber-400 via-purple-500 to-violet-500",
  ctaShadow: "shadow-[0_0_24px_rgba(168,85,247,0.48)] group-hover:shadow-[0_0_32px_rgba(251,191,36,0.42)]",
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
      "linear-gradient(135deg, rgba(109,40,217,0.62) 0%, rgba(99,102,241,0.5) 45%, rgba(217,119,6,0.36) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(168,85,247,0.4), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(245,158,11,0.26), transparent 55%)",
    borderHover: "group-hover:border-purple-300/40",
    chipBorder: "border-purple-200/15",
    ctaGradient: "from-amber-400 via-purple-500 to-violet-500",
    ctaShadow: "shadow-[0_0_24px_rgba(139,92,246,0.48)] group-hover:shadow-[0_0_32px_rgba(245,158,11,0.42)]",
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
      "linear-gradient(135deg, rgba(180,83,9,0.62) 0%, rgba(217,119,6,0.56) 45%, rgba(126,34,206,0.38) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(251,191,36,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(249,115,22,0.28), transparent 55%)",
    borderHover: "group-hover:border-amber-300/42",
    chipBorder: "border-amber-200/20",
    ctaGradient: "from-amber-400 via-orange-500 to-purple-500",
    ctaShadow: "shadow-[0_0_24px_rgba(251,191,36,0.46)] group-hover:shadow-[0_0_32px_rgba(168,85,247,0.42)]",
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
      "linear-gradient(135deg, rgba(124,58,237,0.62) 0%, rgba(99,102,241,0.54) 45%, rgba(245,158,11,0.4) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(168,85,247,0.36), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(251,191,36,0.28), transparent 55%)",
    borderHover: "group-hover:border-violet-300/40",
    chipBorder: "border-violet-200/15",
    ctaGradient: "from-amber-400 via-purple-500 to-violet-500",
    ctaShadow: "shadow-[0_0_24px_rgba(168,85,247,0.45)] group-hover:shadow-[0_0_32px_rgba(251,191,36,0.45)]",
    glyphColor: "text-violet-100/80",
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
      "linear-gradient(135deg, rgba(67,56,202,0.62) 0%, rgba(109,40,217,0.54) 45%, rgba(217,119,6,0.36) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(96,165,250,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(129,140,248,0.28), transparent 55%)",
    borderHover: "group-hover:border-indigo-300/40",
    chipBorder: "border-indigo-200/15",
    ctaGradient: "from-amber-400 via-indigo-500 to-violet-500",
    ctaShadow: "shadow-[0_0_24px_rgba(99,102,241,0.45)] group-hover:shadow-[0_0_32px_rgba(245,158,11,0.42)]",
    glyphColor: "text-indigo-100/80",
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
      "linear-gradient(135deg, rgba(15,23,42,0.72) 0%, rgba(30,27,75,0.6) 45%, rgba(88,28,135,0.5) 100%)",
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
