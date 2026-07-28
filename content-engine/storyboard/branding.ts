import {
  applyBrandEndCardToBrandingPlan,
  getBrandIdentityKit,
} from "../brand/index.js";
import type { ContentEngineConfig } from "../types/index.js";
import type { BrandingMode, BrandingPlan } from "../types/storyboard.js";

export function buildBrandingPlan(
  config: ContentEngineConfig,
  mode: BrandingMode,
  ctaFallback: string,
): BrandingPlan {
  const kit = getBrandIdentityKit();
  const base: BrandingPlan = {
    channelName: config.branding.channelName || kit.channelName,
    logoAssetId: kit.logoAssetId,
    colors: {
      primary: kit.colors.primary,
      secondary: kit.colors.secondary,
      accent: kit.colors.accent,
      background: kit.colors.background,
      text: kit.colors.text,
    },
    typography: {
      display: kit.typography.display,
      body: kit.typography.body,
    },
    cta: config.branding.endScreenCta || ctaFallback || kit.endCard.ctaLines[0]!,
    watermark: config.branding.watermark,
    watermarkPosition: "top-right",
    qrPlaceholder: "asset.placeholder.qr-amynest",
    playStorePlaceholder: "brand.amynest.google-play-badge",
    mode,
  };
  return applyBrandEndCardToBrandingPlan(base, base.cta);
}
