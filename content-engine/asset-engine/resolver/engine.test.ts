import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AssetRequest } from "../../types/asset-package.js";
import { InMemoryAssetCache } from "../cache/index.js";
import { createDefaultAssetRegistry } from "../registry/index.js";
import { resolveAssetRequests } from "./engine.js";

function request(overrides: Partial<AssetRequest> = {}): AssetRequest {
  return {
    requestId: "req_1",
    assetId: "scene-01-hook-asset-01",
    assetType: "Promo Image",
    priority: 10,
    sceneId: "scene-01-hook",
    resolution: "1080x1920",
    aspectRatio: "9:16",
    brandingRequired: true,
    prompt: "AmyNest parenting promo poster gentle discipline",
    fallback: "asset.fallback.promo-poster",
    providerPreference: ["local-library", "placeholder"],
    fingerprintSeed: "seed-1",
    ...overrides,
  };
}

describe("asset resolver", () => {
  it("resolves via local library before fallback", async () => {
    const result = await resolveAssetRequests([request()], {
      registry: createDefaultAssetRegistry(),
      cache: new InMemoryAssetCache(),
      assetPriority: [
        "local-library",
        "cache",
        "screen-recording",
        "ai-image",
        "fallback-placeholder",
      ],
      preferredProviders: ["local-library"],
      allowFallbacks: true,
      maximumAIAssets: 0,
      reuseThreshold: 0.85,
      cacheTtlSeconds: 60,
      cacheVersion: "4.0.0",
    });
    assert.equal(result.resolved.length, 1);
    assert.equal(result.resolved[0]?.provider, "local-library");
    assert.equal(result.resolved[0]?.usedFallback, false);
  });

  it("always returns a fallback when nothing else matches", async () => {
    const result = await resolveAssetRequests(
      [
        request({
          assetType: "Future AI Video",
          prompt: "obscure unmatched video prompt xyz",
          providerPreference: ["runway"],
        }),
      ],
      {
        registry: createDefaultAssetRegistry(),
        cache: new InMemoryAssetCache(),
        assetPriority: ["ai-image", "fallback-placeholder"],
        preferredProviders: ["runway"],
        allowFallbacks: true,
        maximumAIAssets: 0,
        reuseThreshold: 0.99,
        cacheTtlSeconds: 60,
        cacheVersion: "4.0.0",
      },
    );
    assert.equal(result.resolved.length, 1);
    assert.equal(result.resolved[0]?.status, "fallback");
    assert.ok(result.fallbackUsage >= 1);
  });

  it("reuses cached assets on second resolve", async () => {
    const cache = new InMemoryAssetCache();
    const options = {
      registry: createDefaultAssetRegistry(),
      cache,
      assetPriority: [
        "cache",
        "local-library",
        "fallback-placeholder",
      ] as const,
      preferredProviders: ["local-library" as const],
      allowFallbacks: true,
      maximumAIAssets: 0,
      reuseThreshold: 0.85,
      cacheTtlSeconds: 60,
      cacheVersion: "4.0.0",
    };
    const first = await resolveAssetRequests([request()], {
      ...options,
      assetPriority: [...options.assetPriority],
      preferredProviders: [...options.preferredProviders],
    });
    const second = await resolveAssetRequests([request()], {
      ...options,
      assetPriority: [...options.assetPriority],
      preferredProviders: [...options.preferredProviders],
    });
    assert.equal(first.cacheHits, 0);
    assert.ok(second.cacheHits >= 1);
    assert.equal(second.resolved[0]?.fromCache, true);
  });
});
