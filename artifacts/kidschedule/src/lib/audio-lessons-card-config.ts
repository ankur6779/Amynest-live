import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import { Headphones, Sparkles } from "lucide-react";

const BASE = "/illustrations";

export const AMY_AUDIO_LESSONS_CARD_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/amy-audio-lessons-mic.png`,
  heroSrc: `${BASE}/amy-audio-lessons-hero.png`,
  surfaceGradient:
    "linear-gradient(135deg, rgba(168,85,247,0.58) 0%, rgba(126,34,206,0.52) 42%, rgba(67,56,202,0.48) 100%)",
  ambientGlow:
    "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(192,132,252,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(129,140,248,0.3), transparent 55%)",
  borderHover: "group-hover:border-violet-300/35",
  chipBorder: "border-violet-200/15",
  ctaGradient: "from-violet-400 via-purple-500 to-indigo-500",
  ctaShadow: "shadow-[0_0_20px_rgba(139,92,246,0.42)] group-hover:shadow-[0_0_28px_rgba(168,85,247,0.5)]",
  glyphColor: "text-violet-100/80",
  floatingGlyphs: ["♪", "★", "♪"],
  chips: [
    { icon: Headphones, labelKey: "pages.ai_coach.audio_lessons_tag_audio", defaultLabel: "Audio" },
    { icon: Sparkles, labelKey: "pages.ai_coach.audio_lessons_tag_age_curated", defaultLabel: "Age Curated" },
  ],
};
