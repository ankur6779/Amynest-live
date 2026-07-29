import type {
  ContentEngineConfig,
  ResolvedAssetEngineConfig,
} from "../types/index.js";
import type { AssetEngineSettings } from "../types/asset-package.js";
import { ASSET_PACKAGE_VERSION } from "../types/asset-package.js";

export const DEFAULT_ASSET_ENGINE_SETTINGS: AssetEngineSettings = {
  assetPriority: [
    "local-library",
    "cache",
    "screen-recording",
    "ai-image",
    "fallback-placeholder",
  ],
  // Cost-first: local/offline before paid Imagen/Veo.
  preferredProviders: [
    "local-library",
    "screen-recording",
    "illustration",
    "placeholder",
    "openai-images",
    "google-imagen",
    "google-veo",
  ],
  cachePolicy: {
    ttlSeconds: 86_400,
    version: ASSET_PACKAGE_VERSION,
    invalidateOnFingerprintMismatch: true,
  },
  brandingProfile: "default",
  allowFallbacks: true,
  maximumAIAssets: 2,
  reuseThreshold: 0.85,
};

/** Merge Phase 4 asset-engine defaults (backward compatible). */
export function resolveAssetEngineSettings(
  config: ContentEngineConfig,
): ResolvedAssetEngineConfig {
  return {
    ...config,
    assetPriority: config.assetPriority ?? DEFAULT_ASSET_ENGINE_SETTINGS.assetPriority,
    preferredProviders:
      config.preferredProviders ?? DEFAULT_ASSET_ENGINE_SETTINGS.preferredProviders,
    cachePolicy: {
      ...DEFAULT_ASSET_ENGINE_SETTINGS.cachePolicy,
      ...(config.cachePolicy ?? {}),
      ttlSeconds:
        config.cachePolicy?.ttlSeconds ??
        config.cacheTTL ??
        DEFAULT_ASSET_ENGINE_SETTINGS.cachePolicy.ttlSeconds,
      version:
        config.cachePolicy?.version ??
        DEFAULT_ASSET_ENGINE_SETTINGS.cachePolicy.version,
    },
    brandingProfile:
      config.brandingProfile ?? DEFAULT_ASSET_ENGINE_SETTINGS.brandingProfile,
    allowFallbacks:
      config.allowFallbacks ?? DEFAULT_ASSET_ENGINE_SETTINGS.allowFallbacks,
    maximumAIAssets:
      config.maximumAIAssets ?? DEFAULT_ASSET_ENGINE_SETTINGS.maximumAIAssets,
    reuseThreshold:
      config.reuseThreshold ?? DEFAULT_ASSET_ENGINE_SETTINGS.reuseThreshold,
  };
}
