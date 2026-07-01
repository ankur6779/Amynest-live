import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import {
  Coins,
  Gamepad2,
  Gift,
  GraduationCap,
  Star,
  Trophy,
} from "lucide-react";

export type GamingHubCardId = "section-header" | "gaming-hub";

const BASE = "/illustrations/gaming-hub";

export const GAMING_HUB_SECTION_HEADER_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/section-header-icon.png`,
  heroSrc: `${BASE}/section-header-hero.png`,
  surfaceGradient:
    "linear-gradient(135deg, rgba(88,28,135,0.62) 0%, rgba(109,40,217,0.54) 45%, rgba(34,197,94,0.3) 100%)",
  ambientGlow:
    "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(168,85,247,0.4), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(34,197,94,0.26), transparent 55%)",
  borderHover: "group-hover:border-violet-300/35",
  chipBorder: "border-violet-200/15",
  ctaGradient: "from-violet-400 via-purple-500 to-lime-400",
  ctaShadow: "shadow-[0_0_20px_rgba(139,92,246,0.45)] group-hover:shadow-[0_0_28px_rgba(74,222,128,0.5)]",
  glyphColor: "text-violet-100/80",
  floatingGlyphs: ["★", "XP", "★"],
  chips: [
    { icon: Gamepad2, labelKey: "parent_hub.gaming_hub_cards.section.chip_1", defaultLabel: "Play" },
    { icon: Trophy, labelKey: "parent_hub.gaming_hub_cards.section.chip_2", defaultLabel: "Earn" },
  ],
};

export const GAMING_HUB_CARD_VISUALS: Record<Exclude<GamingHubCardId, "section-header">, HubPremiumCardVisual> = {
  "gaming-hub": {
    iconSrc: `${BASE}/gaming-hub-icon.png`,
    heroSrc: `${BASE}/gaming-hub-hero.png`,
    surfaceGradient:
      "linear-gradient(135deg, rgba(88,28,135,0.58) 0%, rgba(124,58,237,0.5) 45%, rgba(74,222,128,0.32) 100%)",
    ambientGlow:
      "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(168,85,247,0.38), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(74,222,128,0.26), transparent 55%)",
    borderHover: "group-hover:border-violet-300/35",
    chipBorder: "border-violet-200/15",
    ctaGradient: "from-violet-400 via-purple-500 to-lime-400",
    ctaShadow: "shadow-[0_0_20px_rgba(192,38,211,0.42)] group-hover:shadow-[0_0_28px_rgba(74,222,128,0.5)]",
    glyphColor: "text-fuchsia-100/80",
    floatingGlyphs: ["★", "XP", "1st"],
    chips: [
      { icon: GraduationCap, labelKey: "parent_hub.gaming_hub_cards.gaming_hub.chip_1", defaultLabel: "Learn" },
      { icon: Gamepad2, labelKey: "parent_hub.gaming_hub_cards.gaming_hub.chip_2", defaultLabel: "Play" },
      { icon: Coins, labelKey: "parent_hub.gaming_hub_cards.gaming_hub.chip_3", defaultLabel: "Earn" },
      { icon: Gift, labelKey: "parent_hub.gaming_hub_cards.gaming_hub.chip_4", defaultLabel: "Rewards" },
    ],
  },
};

export { stripHubTileEmoji } from "@/lib/hub-premium-card-types";
