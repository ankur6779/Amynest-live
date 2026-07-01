import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import {
  Baby,
  BookOpen,
  ClipboardList,
  Compass,
  Heart,
  Lightbulb,
  Mic,
  RefreshCw,
  Sparkles,
  Sprout,
  Star,
  Target,
  Zap,
} from "lucide-react";

export type ParentSupportCardId =
  | "section-header"
  | "articles"
  | "emotional"
  | "life-skills"
  | "ptm-prep"
  | "new-parent-tips";

const BASE = "/illustrations/parent-support";

export const PARENT_SUPPORT_SECTION_HEADER_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/section-header-icon.png`,
  heroSrc: `${BASE}/section-header-hero.png`,
  surfaceGradient:
    "linear-gradient(135deg, rgba(190,24,93,0.55) 0%, rgba(147,51,234,0.48) 45%, rgba(79,70,229,0.42) 100%)",
  ambientGlow:
    "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(244,114,182,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(168,85,247,0.3), transparent 55%)",
  borderHover: "group-hover:border-pink-300/35",
  chipBorder: "border-pink-200/15",
  ctaGradient: "from-rose-400 via-pink-500 to-purple-500",
  ctaShadow: "shadow-[0_0_20px_rgba(244,114,182,0.42)] group-hover:shadow-[0_0_28px_rgba(168,85,247,0.5)]",
  glyphColor: "text-pink-100/80",
  floatingGlyphs: ["♥", "★", "♥"],
  chips: [
    { icon: Heart, labelKey: "parent_hub.parent_support_cards.section.chip_1", defaultLabel: "Care" },
    { icon: Sparkles, labelKey: "parent_hub.parent_support_cards.section.chip_2", defaultLabel: "Guidance" },
  ],
};

export const PARENT_SUPPORT_CARD_VISUALS: Record<
  Exclude<ParentSupportCardId, "section-header">,
  HubPremiumCardVisual
> = {
  articles: {
    iconSrc: `${BASE}/articles-icon.png`,
    heroSrc: `${BASE}/articles-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(67,56,202,0.58) 0%, rgba(79,70,229,0.5) 45%, rgba(37,99,235,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(129,140,248,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(59,130,246,0.28), transparent 55%)",
    borderHover: "group-hover:border-indigo-300/35",
    chipBorder: "border-indigo-200/15",
    ctaGradient: "from-indigo-400 via-violet-500 to-blue-500",
    ctaShadow: "shadow-[0_0_20px_rgba(99,102,241,0.42)] group-hover:shadow-[0_0_28px_rgba(59,130,246,0.55)]",
    glyphColor: "text-indigo-100/80",
    floatingGlyphs: ["◆", "★", "◆"],
    chips: [
      { icon: BookOpen, labelKey: "parent_hub.parent_support_cards.articles.chip_1", defaultLabel: "Research Based" },
      { icon: Baby, labelKey: "parent_hub.parent_support_cards.articles.chip_2", defaultLabel: "Age Matched" },
    ],
  },
  emotional: {
    iconSrc: `${BASE}/emotional-icon.png`,
    heroSrc: `${BASE}/emotional-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(219,39,119,0.58) 0%, rgba(236,72,153,0.5) 45%, rgba(147,51,234,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(244,114,182,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(192,132,252,0.28), transparent 55%)",
    borderHover: "group-hover:border-rose-300/35",
    chipBorder: "border-rose-200/15",
    ctaGradient: "from-rose-400 via-pink-500 to-fuchsia-500",
    ctaShadow: "shadow-[0_0_20px_rgba(244,114,182,0.45)] group-hover:shadow-[0_0_28px_rgba(236,72,153,0.55)]",
    glyphColor: "text-rose-100/80",
    floatingGlyphs: ["♥", "★", "♥"],
    chips: [
      { icon: Mic, labelKey: "parent_hub.parent_support_cards.emotional.chip_1", defaultLabel: "Listen" },
      { icon: Sprout, labelKey: "parent_hub.parent_support_cards.emotional.chip_2", defaultLabel: "Heal" },
    ],
  },
  "life-skills": {
    iconSrc: `${BASE}/life-skills-icon.png`,
    heroSrc: `${BASE}/life-skills-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(219,39,119,0.58) 0%, rgba(236,72,153,0.5) 45%, rgba(59,130,246,0.4) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(244,114,182,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(96,165,250,0.28), transparent 55%)",
    borderHover: "group-hover:border-rose-300/35",
    chipBorder: "border-rose-200/15",
    ctaGradient: "from-rose-400 via-pink-500 to-blue-500",
    ctaShadow: "shadow-[0_0_20px_rgba(244,114,182,0.42)] group-hover:shadow-[0_0_28px_rgba(96,165,250,0.5)]",
    glyphColor: "text-rose-100/80",
    floatingGlyphs: ["★", "◆", "★"],
    chips: [
      { icon: Target, labelKey: "parent_hub.parent_support_cards.life_skills.chip_1", defaultLabel: "Daily Mission" },
      { icon: Star, labelKey: "parent_hub.parent_support_cards.life_skills.chip_2", defaultLabel: "Confidence" },
    ],
  },
  "ptm-prep": {
    iconSrc: `${BASE}/ptm-prep-icon.png`,
    heroSrc: `${BASE}/ptm-prep-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(37,99,235,0.58) 0%, rgba(79,70,229,0.5) 45%, rgba(67,56,202,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(96,165,250,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(129,140,248,0.28), transparent 55%)",
    borderHover: "group-hover:border-blue-300/35",
    chipBorder: "border-blue-200/15",
    ctaGradient: "from-rose-400 via-pink-500 to-blue-500",
    ctaShadow: "shadow-[0_0_20px_rgba(59,130,246,0.42)] group-hover:shadow-[0_0_28px_rgba(244,114,182,0.48)]",
    glyphColor: "text-blue-100/80",
    floatingGlyphs: ["✓", "★", "◆"],
    chips: [
      { icon: ClipboardList, labelKey: "parent_hub.parent_support_cards.ptm_prep.chip_1", defaultLabel: "Notes" },
      { icon: Zap, labelKey: "parent_hub.parent_support_cards.ptm_prep.chip_2", defaultLabel: "Action Plan" },
    ],
  },
  "new-parent-tips": {
    iconSrc: `${BASE}/new-parent-tips-icon.png`,
    heroSrc: `${BASE}/new-parent-tips-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(190,24,93,0.6) 0%, rgba(219,39,119,0.5) 45%, rgba(59,130,246,0.4) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(244,114,182,0.34), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(96,165,250,0.26), transparent 55%)",
    borderHover: "group-hover:border-rose-300/35",
    chipBorder: "border-rose-200/15",
    ctaGradient: "from-rose-400 via-pink-500 to-blue-500",
    ctaShadow: "shadow-[0_0_20px_rgba(244,114,182,0.4)] group-hover:shadow-[0_0_28px_rgba(96,165,250,0.48)]",
    glyphColor: "text-rose-100/80",
    floatingGlyphs: ["★", "◆", "★"],
    chips: [
      { icon: Baby, labelKey: "parent_hub.parent_support_cards.new_parent_tips.chip_1", defaultLabel: "Newborn" },
      { icon: Lightbulb, labelKey: "parent_hub.parent_support_cards.new_parent_tips.chip_2", defaultLabel: "Gentle Tips" },
    ],
  },
};

export const PARENT_SUPPORT_HUB_SECTION_MAP: Record<string, Exclude<ParentSupportCardId, "section-header">> = {
  articles: "articles",
  emotional: "emotional",
  "life-skills": "life-skills",
  "ptm-prep": "ptm-prep",
  "new-parent-tips": "new-parent-tips",
};

export const PARENT_SUPPORT_CARD_BADGES: Partial<
  Record<Exclude<ParentSupportCardId, "section-header">, string>
> = {
  articles: "NEW ARTICLE DAILY",
  emotional: "24×7 CARE",
  "life-skills": "REAL LIFE",
  "ptm-prep": "SCHOOL READY",
  "new-parent-tips": "GENTLE GUIDE",
};
