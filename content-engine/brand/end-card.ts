import { existsSync } from "node:fs";
import { getBrandIdentityKit, pickBrandCtaLine } from "./identity.js";
import type { BrandEndCardSpec } from "./types.js";
import type { BrandingPlan } from "../types/storyboard.js";

export interface ResolvedBrandEndCard {
  spec: BrandEndCardSpec;
  ctaLine: string;
  appIconPath: string;
  googlePlayBadgePath: string;
  appleAppStoreBadgePath: string;
  websiteUrl: string;
  downloadLine: string;
  durationSeconds: number;
  assetsPresent: boolean;
  missingAssets: string[];
}

export function resolveBrandEndCard(seed = "amynest"): ResolvedBrandEndCard {
  const kit = getBrandIdentityKit();
  const missing: string[] = [];
  for (const path of [
    kit.endCard.appIconAsset,
    kit.endCard.googlePlayBadgeAsset,
    kit.endCard.appleAppStoreBadgeAsset,
  ]) {
    if (!existsSync(path)) missing.push(path);
  }
  return {
    spec: kit.endCard,
    ctaLine: pickBrandCtaLine(seed),
    appIconPath: kit.endCard.appIconAsset,
    googlePlayBadgePath: kit.endCard.googlePlayBadgeAsset,
    appleAppStoreBadgePath: kit.endCard.appleAppStoreBadgeAsset,
    websiteUrl: kit.endCard.websiteUrl,
    downloadLine: kit.endCard.downloadLine,
    durationSeconds: kit.endCard.durationSeconds.default,
    assetsPresent: missing.length === 0,
    missingAssets: missing,
  };
}

/** Enrich storyboard branding with mandatory end-card asset ids/paths. */
export function applyBrandEndCardToBrandingPlan(
  plan: BrandingPlan,
  seed: string,
): BrandingPlan {
  const end = resolveBrandEndCard(seed);
  return {
    ...plan,
    cta: end.ctaLine,
    logoAssetId: "brand.amynest.app-icon-official",
    playStorePlaceholder: "brand.amynest.google-play-badge",
    qrPlaceholder: plan.qrPlaceholder || "asset.placeholder.qr-amynest",
  };
}

export function buildEndCardOverlayCopy(seed: string): {
  title: string;
  subtitle: string;
  stores: string;
  website: string;
} {
  const end = resolveBrandEndCard(seed);
  return {
    title: end.ctaLine,
    subtitle: end.downloadLine,
    stores: "Google Play  ·  Apple App Store",
    website: end.websiteUrl.replace(/^https?:\/\//, ""),
  };
}
