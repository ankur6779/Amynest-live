import type { HubPremiumCardVisual } from "@/lib/hub-premium-card-types";
import { Compass, Moon, Sparkles, Star } from "lucide-react";

const BASE = "/illustrations/amy-astro";
/** Cache-bust when cutout assets change so clients pick up transparent heroes. */
const ASSET_V = "20260727a";

/**
 * Collapsed Amy Astro Intelligence section — symbolic moon/star icon only
 * (matches Learning Zone / other hub section tiles; no character photo).
 */
export const AMY_ASTRO_SECTION_HEADER_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/section-header-icon.png?v=${ASSET_V}`,
  heroSrc: `${BASE}/section-header-hero.png?v=${ASSET_V}`,
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

/** Expanded launch tile — transparent cutout Amy so glass/glow shows through. */
export const AMY_ASTRO_LAUNCH_VISUAL: HubPremiumCardVisual = {
  iconSrc: `${BASE}/amy-astro-icon.png?v=${ASSET_V}`,
  heroSrc: `${BASE}/amy-astro-hero.png?v=${ASSET_V}`,
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
    {
      icon: Moon,
      labelKey: "parent_hub.amy_astro_cards.launch.chip_1",
      defaultLabel: "Soft portrait",
    },
    {
      icon: Compass,
      labelKey: "parent_hub.amy_astro_cards.launch.chip_2",
      defaultLabel: "Reflect",
    },
  ],
};
