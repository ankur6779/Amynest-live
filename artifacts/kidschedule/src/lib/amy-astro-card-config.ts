import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import { Compass, Moon, Sparkles, Star } from "lucide-react";

const BASE = "/illustrations/amy-astro";

/**
 * Collapsed Amy Astro Intelligence section — symbolic moon/star icon only
 * (matches Learning Zone / other hub section tiles; no character photo).
 */
export const AMY_ASTRO_SECTION_HEADER_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/section-header-icon.png`,
  heroSrc: `${BASE}/section-header-hero.png`,
  surfaceGradient:
    "linear-gradient(135deg, rgba(30,64,175,0.6) 0%, rgba(79,70,229,0.54) 46%, rgba(245,158,11,0.4) 100%)",
  ambientGlow:
    "radial-gradient(ellipse 75% 65% at 18% 45%, rgba(129,140,248,0.4), transparent 58%), radial-gradient(ellipse 65% 75% at 88% 42%, rgba(251,191,36,0.26), transparent 55%)",
  borderHover: "group-hover:border-indigo-300/40",
  chipBorder: "border-indigo-200/15",
  ctaGradient: "from-amber-400 via-indigo-500 to-violet-600",
  ctaShadow:
    "shadow-[0_0_24px_rgba(99,102,241,0.48)] group-hover:shadow-[0_0_32px_rgba(251,191,36,0.42)]",
  glyphColor: "text-indigo-100/80",
  floatingGlyphs: ["✦", "☾", "★"],
  chips: [
    {
      icon: Star,
      labelKey: "parent_hub.amy_astro_cards.section.chip_1",
      defaultLabel: "Birth Sky",
    },
    {
      icon: Sparkles,
      labelKey: "parent_hub.amy_astro_cards.section.chip_2",
      defaultLabel: "Portrait",
    },
  ],
};

/** Expanded launch tile — astrology-style Amy hero (meditative / crystal ball). */
export const AMY_ASTRO_LAUNCH_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/amy-astro-icon.png`,
  heroSrc: `${BASE}/amy-astro-hero.png`,
  surfaceGradient:
    "linear-gradient(135deg, rgba(30,27,75,0.78) 0%, rgba(79,70,229,0.55) 48%, rgba(245,158,11,0.4) 100%)",
  ambientGlow:
    "radial-gradient(ellipse 75% 65% at 16% 48%, rgba(167,139,250,0.4), transparent 58%), radial-gradient(ellipse 65% 75% at 90% 40%, rgba(251,191,36,0.3), transparent 55%)",
  borderHover: "group-hover:border-amber-300/35",
  chipBorder: "border-indigo-200/18",
  ctaGradient: "from-amber-400 via-violet-500 to-indigo-600",
  ctaShadow:
    "shadow-[0_0_22px_rgba(129,140,248,0.45)] group-hover:shadow-[0_0_30px_rgba(251,191,36,0.48)]",
  glyphColor: "text-amber-100/85",
  floatingGlyphs: ["☾", "✦", "✧"],
  chips: [
    {
      icon: Moon,
      labelKey: "parent_hub.amy_astro_cards.launch.chip_1",
      defaultLabel: "Cosmic Portrait",
    },
    {
      icon: Compass,
      labelKey: "parent_hub.amy_astro_cards.launch.chip_2",
      defaultLabel: "Ask Amy",
    },
  ],
};
