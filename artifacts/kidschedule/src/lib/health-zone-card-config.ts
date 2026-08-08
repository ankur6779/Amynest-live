import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import {
  Apple,
  Heart,
  Leaf,
  Sparkles,
  Users,
  Wind,
} from "lucide-react";

export type HealthZoneCardId = "section-header" | "nutrition" | "health-lab";

const BASE = "/illustrations/health-zone";

export const HEALTH_ZONE_SECTION_HEADER_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/section-header-icon.png`,
  heroSrc: `${BASE}/section-header-hero.png`,
  surfaceGradient:
    "linear-gradient(135deg, rgba(6,78,59,0.62) 0%, rgba(5,150,105,0.54) 45%, rgba(20,184,166,0.46) 100%)",
  ambientGlow:
    "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(52,211,153,0.4), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(45,212,191,0.32), transparent 55%)",
  borderHover: "group-hover:border-emerald-300/35",
  chipBorder: "border-emerald-200/15",
  ctaGradient: "from-emerald-400 via-teal-500 to-green-500",
  ctaShadow: "shadow-[0_0_20px_rgba(52,211,153,0.45)] group-hover:shadow-[0_0_28px_rgba(45,212,191,0.55)]",
  glyphColor: "text-emerald-100/80",
  floatingGlyphs: ["Ca", "Fe", "B12"],
  chips: [
    { icon: Leaf, labelKey: "parent_hub.health_zone_cards.section.chip_1", defaultLabel: "Wellness" },
    { icon: Heart, labelKey: "parent_hub.health_zone_cards.section.chip_2", defaultLabel: "Habits" },
  ],
};

export const HEALTH_ZONE_CARD_VISUALS: Record<Exclude<HealthZoneCardId, "section-header">, HubPremiumCardVisual> = {
  nutrition: {
    iconSrc: `${BASE}/nutrition-icon.png`,
    heroSrc: `${BASE}/nutrition-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(6,95,70,0.58) 0%, rgba(5,150,105,0.5) 42%, rgba(20,184,166,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(52,211,153,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(45,212,191,0.28), transparent 55%)",
    borderHover: "group-hover:border-emerald-300/35",
    chipBorder: "border-emerald-200/15",
    ctaGradient: "from-emerald-400 via-teal-500 to-green-500",
    ctaShadow: "shadow-[0_0_20px_rgba(52,211,153,0.42)] group-hover:shadow-[0_0_28px_rgba(45,212,191,0.55)]",
    glyphColor: "text-emerald-100/80",
    floatingGlyphs: ["Ca", "K", "B12"],
    chips: [
      { icon: Apple, labelKey: "parent_hub.health_zone_cards.nutrition.chip_1", defaultLabel: "Healthy Meals" },
      { icon: Leaf, labelKey: "parent_hub.health_zone_cards.nutrition.chip_2", defaultLabel: "Nutrition" },
      { icon: Users, labelKey: "parent_hub.health_zone_cards.nutrition.chip_3", defaultLabel: "Family" },
    ],
  },
  "health-lab": {
    iconSrc: `${BASE}/health-lab-icon.png`,
    heroSrc: `${BASE}/health-lab-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(6,95,70,0.58) 0%, rgba(5,150,105,0.5) 45%, rgba(20,184,166,0.42) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(52,211,153,0.35), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(45,212,191,0.28), transparent 55%)",
    borderHover: "group-hover:border-emerald-300/35",
    chipBorder: "border-emerald-200/15",
    ctaGradient: "from-emerald-400 via-teal-500 to-cyan-500",
    ctaShadow: "shadow-[0_0_20px_rgba(52,211,153,0.42)] group-hover:shadow-[0_0_28px_rgba(45,212,191,0.55)]",
    glyphColor: "text-emerald-100/80",
    floatingGlyphs: ["♡", "☁", "✦"],
    chips: [
      { icon: Sparkles, labelKey: "parent_hub.health_zone_cards.health_lab.chip_1", defaultLabel: "Move" },
      { icon: Wind, labelKey: "parent_hub.health_zone_cards.health_lab.chip_2", defaultLabel: "Breathe" },
      { icon: Heart, labelKey: "parent_hub.health_zone_cards.health_lab.chip_3", defaultLabel: "Care" },
    ],
  },
};

export const HEALTH_ZONE_HUB_SECTION_MAP: Partial<Record<string, Exclude<HealthZoneCardId, "section-header">>> = {
  nutrition: "nutrition",
  "health-lab": "health-lab",
};

export { stripHubTileEmoji } from "@/lib/hub-premium-card-types";
