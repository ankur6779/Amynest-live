import type { LucideIcon } from "lucide-react";

export type HubPremiumChipConfig = {
  icon: LucideIcon;
  labelKey: string;
  defaultLabel: string;
};

export type HubPremiumCardVisual = {
  iconSrc: string;
  heroSrc: string;
  surfaceGradient: string;
  ambientGlow: string;
  borderHover: string;
  chipBorder: string;
  ctaGradient: string;
  ctaShadow: string;
  glyphColor: string;
  floatingGlyphs: readonly string[];
  chips: readonly HubPremiumChipConfig[];
};

/** Strip leading emoji from hub tile titles for premium card typography. */
export function stripHubTileEmoji(title: string): string {
  return title.replace(/^[\s\p{Extended_Pictographic}\uFE0F]+/u, "").trim();
}
