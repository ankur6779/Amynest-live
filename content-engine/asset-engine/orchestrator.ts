import { createHash } from "node:crypto";
import type { ContentEngineConfig } from "../types/index.js";
import type {
  AssetPackage,
  ResolvedAsset,
} from "../types/asset-package.js";
import { ASSET_PACKAGE_VERSION } from "../types/asset-package.js";
import type { StoryboardPackage, VisualType } from "../types/storyboard.js";
import {
  createTelemetryEvent,
  InMemoryTelemetrySink,
  type TelemetryEvent,
  type TelemetrySink,
} from "../telemetry/index.js";
import { resolveAssetEngineSettings } from "../config/asset-engine.js";
import { buildBrandingAssets } from "./branding/index.js";
import { InMemoryAssetCache, type AssetCacheStore } from "./cache/index.js";
import { buildAssetManifest } from "./manifest/index.js";
import { planAssetRequests } from "./planner/index.js";
import {
  AssetProviderRegistry,
  createDefaultAssetRegistry,
} from "./registry/index.js";
import { resolveAssetRequests } from "./resolver/index.js";
import { validateAssetPackage } from "./validation/index.js";

export interface AssetOrchestratorOptions {
  config: ContentEngineConfig;
  registry?: AssetProviderRegistry;
  cache?: AssetCacheStore;
  telemetry?: TelemetrySink;
}

export interface AssetOrchestrationResult {
  package: AssetPackage;
  telemetry: TelemetryEvent;
}

/**
 * Phase 4 orchestrator: StoryboardPackage → AssetPackage.
 * Provider-agnostic asset planning/resolution. Providers may return
 * planned descriptors or real on-disk media (e.g. Gemini/Veo).
 */
export class AssetOrchestrator {
  private readonly config: ContentEngineConfig;
  private readonly registry: AssetProviderRegistry;
  private readonly cache: AssetCacheStore;
  private readonly telemetry: TelemetrySink;

  constructor(options: AssetOrchestratorOptions) {
    this.config = options.config;
    this.registry = options.registry ?? createDefaultAssetRegistry();
    this.cache = options.cache ?? new InMemoryAssetCache();
    this.telemetry = options.telemetry ?? new InMemoryTelemetrySink();
  }

  async orchestrate(storyboard: StoryboardPackage): Promise<AssetOrchestrationResult> {
    const started = Date.now();
    const settings = resolveAssetEngineSettings(this.config);

    const requests = planAssetRequests(storyboard, {
      preferredProviders: settings.preferredProviders,
    });

    const resolution = await resolveAssetRequests(requests, {
      registry: this.registry,
      cache: this.cache,
      assetPriority: settings.assetPriority,
      preferredProviders: settings.preferredProviders,
      allowFallbacks: settings.allowFallbacks,
      maximumAIAssets: settings.maximumAIAssets,
      reuseThreshold: settings.reuseThreshold,
      cacheTtlSeconds: settings.cachePolicy.ttlSeconds,
      cacheVersion: settings.cachePolicy.version,
    });

    const brandingAssets = buildBrandingAssets(
      storyboard,
      settings.brandingProfile,
    );

    const assetTypesById = new Map<string, VisualType>();
    for (const request of requests) {
      assetTypesById.set(request.assetId, request.assetType);
    }

    const brandingResolved: ResolvedAsset[] = [
      brandingAssets.logo,
      brandingAssets.watermark,
      brandingAssets.qrPlaceholder,
      brandingAssets.playStorePlaceholder,
    ];

    const allResolved = [...resolution.resolved, ...brandingResolved];
    for (const brand of brandingResolved) {
      assetTypesById.set(brand.assetId, "Promo Image");
    }

    const assetManifest = buildAssetManifest({
      storyboardId: storyboard.id,
      resolved: allResolved,
      assetTypesById,
    });

    const cacheStore = this.cache as InMemoryAssetCache;
    const pkg: AssetPackage = {
      id: buildAssetPackageId(storyboard.id),
      version: ASSET_PACKAGE_VERSION,
      createdAt: new Date().toISOString(),
      storyboardId: storyboard.id,
      assetManifest,
      resolvedAssets: resolution.resolved,
      brandingAssets,
      missingAssets: resolution.missing,
      warnings: resolution.warnings,
      providerMetadata: resolution.providerMetadata,
      cacheMetadata: {
        hits: resolution.cacheHits,
        misses: resolution.cacheMisses,
        staleIgnored:
          typeof cacheStore.staleIgnoredCount === "number"
            ? cacheStore.staleIgnoredCount
            : 0,
        entriesStored: this.cache.size(),
        policy: settings.cachePolicy,
      },
      validation: {
        ok: true,
        errors: [],
        warnings: [],
      },
    };

    pkg.validation = validateAssetPackage(pkg);

    const event = createTelemetryEvent({
      name: "asset_engine.orchestrate",
      generationTimeMs: Date.now() - started,
      provider: "asset-orchestrator",
      errors: pkg.validation.errors.map((e) => e.message),
      retryCount: 0,
      cacheHit: resolution.cacheHits > 0,
      topicId: storyboard.topic.id,
      metadata: {
        planningDurationMs: Date.now() - started,
        sceneCount: storyboard.scenes.length,
        assetCount: resolution.resolved.length,
        cacheHits: resolution.cacheHits,
        fallbackUsage: resolution.fallbackUsage,
        estimatedGenerationCost: resolution.estimatedCostUsd,
        providerUsage: resolution.providerMetadata.length,
        validationWarnings: pkg.validation.warnings.length,
        aiAssetsUsed: resolution.aiAssetsUsed,
      },
    });
    this.telemetry.record(event);

    return { package: pkg, telemetry: event };
  }
}

function buildAssetPackageId(storyboardId: string): string {
  const digest = createHash("sha256")
    .update(`${storyboardId}|${ASSET_PACKAGE_VERSION}`)
    .digest("hex")
    .slice(0, 12);
  return `ap_${digest}`;
}
