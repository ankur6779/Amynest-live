import type { ContentEngineConfig } from "../types/index.js";
import type { BrandingMode, BrandingPlan } from "../types/storyboard.js";

export function buildBrandingPlan(
  config: ContentEngineConfig,
  mode: BrandingMode,
  ctaFallback: string,
): BrandingPlan {
  return {
    channelName: config.branding.channelName,
    logoAssetId: "brand.amynest.logo-primary",
    colors: {
      primary: "#1B4D6E",
      secondary: "#F4C95F",
      accent: "#E67E5A",
      background: "#0F2740",
      text: "#FFF8F0",
    },
    typography: {
      display: "Fraunces",
      body: "Source Sans 3",
    },
    cta: config.branding.endScreenCta || ctaFallback,
    watermark: config.branding.watermark,
    watermarkPosition: "top-right",
    qrPlaceholder: "asset.placeholder.qr-amynest",
    playStorePlaceholder: "asset.placeholder.play-store-badge",
    mode,
  };
}
