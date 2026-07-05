import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import { Headphones, Sparkles } from "lucide-react";

const BASE = "/illustrations";

export const AMY_AUDIO_LESSONS_CARD_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/amy-audio-lessons-mic.png`,
  heroSrc: `${BASE}/amy-audio-lessons-hero.png`,
  surfaceGradient:
    "linear-gradient(128deg, #1a1b2e 0%, #231a3d 38%, #2d1b4d 72%, #1e1640 100%)",
  ambientGlow:
    "radial-gradient(ellipse 70% 80% at 8% 50%, rgba(168,85,247,0.22), transparent 55%), radial-gradient(ellipse 55% 70% at 92% 38%, rgba(236,72,153,0.18), transparent 52%), radial-gradient(ellipse 40% 50% at 78% 88%, rgba(139,92,246,0.24), transparent 58%)",
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
