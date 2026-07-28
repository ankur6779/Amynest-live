import type {
  BrandingAssetSet,
  BrandingProfile,
  ResolvedAsset,
} from "../../types/asset-package.js";
import type { ResolutionPreset, StoryboardPackage } from "../../types/storyboard.js";
import { fingerprintAssetRequest } from "../fingerprint/index.js";
import { parseResolution } from "../planner/geometry.js";

const PROFILE_COLORS: Record<
  BrandingProfile,
  BrandingAssetSet["colors"]
> = {
  default: {
    primary: "#1B4D6E",
    secondary: "#F4C95F",
    accent: "#E67E5A",
    background: "#0F2740",
    text: "#FFF8F0",
    mode: "dark",
  },
  dark: {
    primary: "#0B1F33",
    secondary: "#F4C95F",
    accent: "#E67E5A",
    background: "#071421",
    text: "#F7FBFF",
    mode: "dark",
  },
  light: {
    primary: "#1B4D6E",
    secondary: "#C9952A",
    accent: "#D4653F",
    background: "#FFF8F0",
    text: "#14233A",
    mode: "light",
  },
  astro: {
    primary: "#2B1E5E",
    secondary: "#F6D57A",
    accent: "#8EC5FF",
    background: "#120B2E",
    text: "#F8F4FF",
    mode: "dark",
  },
};

/** Inject AmyNest branding asset descriptors (no binary generation). */
export function buildBrandingAssets(
  storyboard: StoryboardPackage,
  profile: BrandingProfile,
): BrandingAssetSet {
  const colors = PROFILE_COLORS[profile];
  const { width, height } = parseResolution(storyboard.resolution);
  const base = {
    sceneId: "branding",
    width,
    height,
    aspectRatio: storyboard.aspectRatio,
    license: "AmyNest Brand Kit",
    createdAt: new Date().toISOString(),
    costEstimateUsd: 0,
    fromCache: false,
    usedFallback: false,
  } as const;

  const logo = brandingAsset({
    ...base,
    assetId: storyboard.branding.logoAssetId,
    path: `brand://logo/${profile}.png`,
    label: "logo",
    resolution: storyboard.resolution,
  });
  const watermark = brandingAsset({
    ...base,
    assetId: "brand.amynest.watermark",
    path: `brand://watermark/${profile}.png`,
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
    path: "brand://placeholders/play-store-badge.png",
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
      display: storyboard.branding.typography.display,
      body: storyboard.branding.typography.body,
    },
    cta: storyboard.branding.cta,
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
    },
  };
}
