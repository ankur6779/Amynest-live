import type { AssetPackage } from "../../types/asset-package.js";
import type { StoryboardPackage } from "../../types/storyboard.js";
import type { WatermarkSpec } from "../../types/render-package.js";

export function buildWatermarkSpec(
  storyboard: StoryboardPackage,
  assets: AssetPackage,
  enabled: boolean,
): WatermarkSpec {
  return {
    enabled: enabled && storyboard.branding.watermark,
    logoPath: assets.brandingAssets.logo.path,
    ctaText: assets.brandingAssets.cta || storyboard.branding.cta,
    qrPath: assets.brandingAssets.qrPlaceholder.path,
    playStorePath: assets.brandingAssets.playStorePlaceholder.path,
    endCardEnabled: storyboard.scenes.some(
      (s) => s.purpose === "cta" || s.purpose === "brand-end",
    ),
    position: storyboard.branding.watermarkPosition,
  };
}
