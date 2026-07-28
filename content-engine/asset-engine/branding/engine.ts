import {
  getBrandIdentityKit,
  resolveBrandEndCard,
} from "../../brand/index.js";
import type {
  BrandingAssetSet,
  BrandingProfile,
  ResolvedAsset,
} from "../../types/asset-package.js";
import type { ResolutionPreset, StoryboardPackage } from "../../types/storyboard.js";
import { fingerprintAssetRequest } from "../fingerprint/index.js";
import { parseResolution } from "../planner/geometry.js";

/**
 * Inject AmyNest Brand Identity assets (official icon, characters, store badges).
 * Paths point at the canonical brand kit — never AI-regenerated logos/mascots.
 */
export function buildBrandingAssets(
  storyboard: StoryboardPackage,
  profile: BrandingProfile,
): BrandingAssetSet {
  const kit = getBrandIdentityKit();
  const end = resolveBrandEndCard(storyboard.topic.id);
  const colors = {
    primary: kit.colors.primary,
    secondary: kit.colors.secondary,
    accent: kit.colors.accent,
    background:
      profile === "light" ? "#FFF8F0" : kit.colors.background,
    text: profile === "light" ? "#14233A" : kit.colors.text,
    mode: (profile === "light" ? "light" : "dark") as "light" | "dark",
  };
  const { width, height } = parseResolution(storyboard.resolution);
  const base = {
    sceneId: "branding",
    width,
    height,
    aspectRatio: storyboard.aspectRatio,
    license: "AmyNest Brand Kit — Official Locked Assets",
    createdAt: new Date().toISOString(),
    costEstimateUsd: 0,
    fromCache: false,
    usedFallback: false,
  } as const;

  const logo = brandingAsset({
    ...base,
    assetId: storyboard.branding.logoAssetId,
    path: kit.appIconAsset,
    label: "logo",
    resolution: storyboard.resolution,
  });
  const watermark = brandingAsset({
    ...base,
    assetId: "brand.amynest.watermark",
    path: kit.appIconAsset,
    label: "watermark",
    resolution: storyboard.resolution,
  });
  const qrPlaceholder = brandingAsset({
    ...base,
    assetId: storyboard.branding.qrPlaceholder,
    path: "brand://placeholders/qr-amynest.png",
    label: "qr",
    resolution: storyboard.resolution,
  });
  const playStorePlaceholder = brandingAsset({
    ...base,
    assetId: storyboard.branding.playStorePlaceholder,
    path: end.googlePlayBadgePath,
    label: "play-store",
    resolution: storyboard.resolution,
  });

  return {
    profile,
    logo,
    watermark,
    qrPlaceholder,
    playStorePlaceholder,
    colors,
    typography: {
      display: kit.typography.display,
      body: kit.typography.body,
    },
    cta: end.ctaLine || storyboard.branding.cta,
  };
}

function brandingAsset(input: {
  assetId: string;
  sceneId: string;
  path: string;
  width: number;
  height: number;
  aspectRatio: ResolvedAsset["aspectRatio"];
  resolution: ResolutionPreset;
  license: string;
  createdAt: string;
  costEstimateUsd: number;
  fromCache: boolean;
  usedFallback: boolean;
  label: string;
}): ResolvedAsset {
  const fingerprint = fingerprintAssetRequest({
    assetType: "Promo Image",
    prompt: `branding:${input.label}`,
    resolution: input.resolution,
    aspectRatio: input.aspectRatio,
    fallback: input.path,
    fingerprintSeed: input.assetId,
  });

  return {
    assetId: input.assetId,
    requestId: `req_brand_${input.label}`,
    sceneId: input.sceneId,
    provider: "local-library",
    path: input.path,
    checksum: fingerprint.slice(0, 32),
    fingerprint,
    width: input.width,
    height: input.height,
    aspectRatio: input.aspectRatio,
    status: "resolved",
    license: input.license,
    createdAt: input.createdAt,
    costEstimateUsd: input.costEstimateUsd,
    fromCache: input.fromCache,
    usedFallback: input.usedFallback,
    metadata: {
      branding: true,
      label: input.label,
      official: true,
    },
  };
}
