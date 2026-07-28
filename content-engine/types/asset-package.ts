import type { AspectRatio, ResolutionPreset, VisualType } from "./storyboard.js";

export const ASSET_PACKAGE_VERSION = "4.0.0";
export const ASSET_MANIFEST_VERSION = "1.0.0";

export type AssetProviderId =
  | "local-library"
  | "cache"
  | "screen-recording"
  | "illustration"
  | "openai-images"
  | "flux"
  | "ideogram"
  | "stable-diffusion"
  | "runway"
  | "google-veo"
  | "placeholder"
  | "future";

export type AssetPriorityTier =
  | "local-library"
  | "cache"
  | "screen-recording"
  | "ai-image"
  | "fallback-placeholder";

export type AssetStatus =
  | "resolved"
  | "cached"
  | "planned"
  | "fallback"
  | "missing"
  | "stale";

export type BrandingProfile = "default" | "dark" | "light" | "astro";

export interface AssetCachePolicy {
  ttlSeconds: number;
  version: string;
  invalidateOnFingerprintMismatch: boolean;
}

export interface AssetEngineSettings {
  assetPriority: AssetPriorityTier[];
  preferredProviders: AssetProviderId[];
  cachePolicy: AssetCachePolicy;
  brandingProfile: BrandingProfile;
  allowFallbacks: boolean;
  maximumAIAssets: number;
  /** 0–1 similarity reuse threshold for fingerprint matching. */
  reuseThreshold: number;
}

export interface AssetRequest {
  requestId: string;
  assetId: string;
  assetType: VisualType;
  priority: number;
  sceneId: string;
  resolution: ResolutionPreset;
  aspectRatio: AspectRatio;
  brandingRequired: boolean;
  prompt: string;
  fallback: string;
  providerPreference: AssetProviderId[];
  fingerprintSeed: string;
}

export interface ResolvedAsset {
  assetId: string;
  requestId: string;
  sceneId: string;
  provider: AssetProviderId;
  path: string;
  checksum: string;
  fingerprint: string;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  status: AssetStatus;
  license: string;
  createdAt: string;
  costEstimateUsd: number;
  fromCache: boolean;
  usedFallback: boolean;
  metadata: Record<string, string | number | boolean>;
}

export interface AssetManifestEntry {
  assetId: string;
  sceneId: string;
  provider: AssetProviderId;
  path: string;
  checksum: string;
  width: number;
  height: number;
  status: AssetStatus;
  license: string;
  createdAt: string;
  fingerprint: string;
  assetType: VisualType;
}

export interface AssetManifest {
  version: string;
  storyboardId: string;
  createdAt: string;
  entries: AssetManifestEntry[];
}

export interface BrandingAssetSet {
  profile: BrandingProfile;
  logo: ResolvedAsset;
  watermark: ResolvedAsset;
  qrPlaceholder: ResolvedAsset;
  playStorePlaceholder: ResolvedAsset;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    mode: "dark" | "light";
  };
  typography: {
    display: string;
    body: string;
  };
  cta: string;
}

export interface MissingAssetRecord {
  assetId: string;
  sceneId: string;
  reason: string;
  fallbackUsed: boolean;
  fallbackPath?: string;
}

export interface ProviderMetadataEntry {
  providerId: AssetProviderId;
  healthy: boolean;
  usageCount: number;
  estimatedCostUsd: number;
  message?: string;
}

export interface AssetCacheMetadata {
  hits: number;
  misses: number;
  staleIgnored: number;
  entriesStored: number;
  policy: AssetCachePolicy;
}

export interface AssetValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface AssetValidationReport {
  ok: boolean;
  errors: AssetValidationIssue[];
  warnings: AssetValidationIssue[];
}

export interface AssetPackage {
  id: string;
  version: string;
  createdAt: string;
  storyboardId: string;
  assetManifest: AssetManifest;
  resolvedAssets: ResolvedAsset[];
  brandingAssets: BrandingAssetSet;
  missingAssets: MissingAssetRecord[];
  warnings: string[];
  providerMetadata: ProviderMetadataEntry[];
  cacheMetadata: AssetCacheMetadata;
  validation: AssetValidationReport;
}

export type AssetExportFormat = "json" | "yaml" | "asset-manifest-v1";

export interface AssetExportResult {
  format: AssetExportFormat;
  content: string;
  contentType: string;
}

export interface AssetResolveContext {
  fingerprint: string;
  width: number;
  height: number;
  allowGenerationPlanning: boolean;
}

export interface AssetCostEstimate {
  currency: "USD";
  amount: number;
  unit: "asset";
}

export interface AssetProviderHealth {
  ok: boolean;
  message?: string;
  checkedAt: string;
}
