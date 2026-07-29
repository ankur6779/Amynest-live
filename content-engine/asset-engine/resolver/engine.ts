import type {
  AssetPriorityTier,
  AssetProviderId,
  AssetRequest,
  MissingAssetRecord,
  ProviderMetadataEntry,
  ResolvedAsset,
} from "../../types/asset-package.js";
import type { AssetCacheStore } from "../cache/index.js";
import { fingerprintAssetRequest } from "../fingerprint/index.js";
import { parseResolution } from "../planner/geometry.js";
import type { AssetProviderRegistry } from "../registry/index.js";

export interface ResolveAssetsOptions {
  registry: AssetProviderRegistry;
  cache: AssetCacheStore;
  assetPriority: AssetPriorityTier[];
  preferredProviders: AssetProviderId[];
  allowFallbacks: boolean;
  maximumAIAssets: number;
  reuseThreshold: number;
  cacheTtlSeconds: number;
  cacheVersion: string;
}

export interface ResolveAssetsResult {
  resolved: ResolvedAsset[];
  missing: MissingAssetRecord[];
  warnings: string[];
  providerMetadata: ProviderMetadataEntry[];
  cacheHits: number;
  cacheMisses: number;
  fallbackUsage: number;
  estimatedCostUsd: number;
  aiAssetsUsed: number;
}

const TIER_PROVIDERS: Record<AssetPriorityTier, AssetProviderId[]> = {
  "local-library": ["local-library", "illustration"],
  cache: ["cache"],
  "screen-recording": ["screen-recording"],
  "ai-image": [
    "google-imagen",
    "openai-images",
    "flux",
    "ideogram",
    "stable-diffusion",
    "runway",
    "google-veo",
  ],
  "fallback-placeholder": ["placeholder"],
};

/**
 * Resolve asset requests via priority chain.
 * Never fails completely when allowFallbacks is true.
 */
export async function resolveAssetRequests(
  requests: readonly AssetRequest[],
  options: ResolveAssetsOptions,
): Promise<ResolveAssetsResult> {
  const usage = new Map<AssetProviderId, ProviderMetadataEntry>();
  const resolved: ResolvedAsset[] = [];
  const missing: MissingAssetRecord[] = [];
  const warnings: string[] = [];
  let cacheHits = 0;
  let cacheMisses = 0;
  let fallbackUsage = 0;
  let estimatedCostUsd = 0;
  let aiAssetsUsed = 0;

  for (const request of requests) {
    const fingerprint = fingerprintAssetRequest(request);
    const { width, height } = parseResolution(request.resolution);
    const chain = buildProviderChain(request, options.assetPriority, options.preferredProviders);

    let asset: ResolvedAsset | null = null;

    // Fingerprint reuse: consult cache before provider work whenever enabled.
    if (options.assetPriority.includes("cache")) {
      const cached =
        options.cache.getExact(fingerprint) ??
        options.cache.getSimilar(fingerprint, options.reuseThreshold);
      if (cached) {
        asset = {
          ...cached,
          assetId: request.assetId,
          requestId: request.requestId,
          sceneId: request.sceneId,
          fromCache: true,
          status: "cached",
        };
        cacheHits += 1;
        bumpUsage(usage, "cache", true, 0, "cache hit");
        resolved.push(asset);
        continue;
      }
      cacheMisses += 1;
      bumpUsage(usage, "cache", true, 0, "cache miss");
    }

    for (const providerId of chain) {
      if (providerId === "cache") {
        // Already handled above.
        continue;
      }

      if (!options.registry.has(providerId)) continue;
      const provider = options.registry.get(providerId);
      const health = await provider.health();
      if (!health.ok && providerId !== "placeholder") {
        bumpUsage(usage, providerId, false, 0, health.message);
        continue;
      }

      const isAi = TIER_PROVIDERS["ai-image"].includes(providerId);
      if (isAi && aiAssetsUsed >= options.maximumAIAssets) {
        warnings.push(
          `Skipped AI provider ${providerId} for ${request.assetId} — maximumAIAssets reached`,
        );
        continue;
      }

      const cost = provider.estimateCost(request);
      const result = await provider.resolve(request, {
        fingerprint,
        width,
        height,
        allowGenerationPlanning: isAi && aiAssetsUsed < options.maximumAIAssets,
      });

      if (!result) {
        bumpUsage(usage, providerId, health.ok, 0, "no match");
        continue;
      }

      asset = result;
      estimatedCostUsd += result.costEstimateUsd || cost.amount;
      bumpUsage(usage, providerId, true, result.costEstimateUsd || cost.amount);
      if (isAi) aiAssetsUsed += 1;
      if (result.usedFallback || result.status === "fallback") fallbackUsage += 1;
      break;
    }

    if (!asset && options.allowFallbacks && options.registry.has("placeholder")) {
      const placeholder = options.registry.get("placeholder");
      asset = await placeholder.resolve(request, {
        fingerprint,
        width,
        height,
        allowGenerationPlanning: false,
      });
      if (asset) {
        fallbackUsage += 1;
        bumpUsage(usage, "placeholder", true, 0, "forced fallback");
        missing.push({
          assetId: request.assetId,
          sceneId: request.sceneId,
          reason: "No preferred provider matched; placeholder used",
          fallbackUsed: true,
          fallbackPath: asset.path,
        });
      }
    }

    if (!asset) {
      missing.push({
        assetId: request.assetId,
        sceneId: request.sceneId,
        reason: "Unable to resolve asset and fallbacks disabled",
        fallbackUsed: false,
      });
      warnings.push(`Missing asset ${request.assetId} for scene ${request.sceneId}`);
      continue;
    }

    if (!asset.fromCache && asset.status !== "fallback") {
      options.cache.set(fingerprint, asset, {
        ttlSeconds: options.cacheTtlSeconds,
        version: options.cacheVersion,
        invalidateOnFingerprintMismatch: true,
      });
    }

    resolved.push(asset);
  }

  return {
    resolved,
    missing,
    warnings,
    providerMetadata: [...usage.values()],
    cacheHits,
    cacheMisses,
    fallbackUsage,
    estimatedCostUsd,
    aiAssetsUsed,
  };
}

/**
 * Cost-first chain: walk assetPriority tiers (local → cache → … → AI).
 * Preferred / request providers may reorder *within* a tier, never jump ahead of local.
 */
function buildProviderChain(
  request: AssetRequest,
  tiers: AssetPriorityTier[],
  preferred: AssetProviderId[],
): AssetProviderId[] {
  const chain: AssetProviderId[] = [];
  const push = (id: AssetProviderId) => {
    if (!chain.includes(id)) chain.push(id);
  };

  for (const tier of tiers) {
    if (tier === "cache") continue; // Fingerprint cache is consulted before the chain.
    const tierProviders = TIER_PROVIDERS[tier];
    for (const id of request.providerPreference) {
      if (tierProviders.includes(id)) push(id);
    }
    for (const id of preferred) {
      if (tierProviders.includes(id)) push(id);
    }
    for (const id of tierProviders) push(id);
  }

  push("placeholder");
  return chain;
}

function bumpUsage(
  usage: Map<AssetProviderId, ProviderMetadataEntry>,
  providerId: AssetProviderId,
  healthy: boolean,
  cost: number,
  message?: string,
): void {
  const existing = usage.get(providerId);
  if (!existing) {
    usage.set(providerId, {
      providerId,
      healthy,
      usageCount: 1,
      estimatedCostUsd: cost,
      message,
    });
    return;
  }
  existing.usageCount += 1;
  existing.estimatedCostUsd += cost;
  existing.healthy = existing.healthy && healthy;
  if (message) existing.message = message;
}
