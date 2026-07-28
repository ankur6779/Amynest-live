import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ResolvedAsset } from "../../types/asset-package.js";
import { InMemoryAssetCache } from "./store.js";

function asset(fingerprint: string): ResolvedAsset {
  return {
    assetId: "a1",
    requestId: "r1",
    sceneId: "s1",
    provider: "local-library",
    path: "library://x.png",
    checksum: fingerprint.slice(0, 32),
    fingerprint,
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    status: "resolved",
    license: "test",
    createdAt: new Date().toISOString(),
    costEstimateUsd: 0,
    fromCache: false,
    usedFallback: false,
    metadata: {},
  };
}

describe("asset cache", () => {
  it("stores, hits, and expires entries", () => {
    const cache = new InMemoryAssetCache();
    const fp = "abc123";
    cache.set(fp, asset(fp), {
      ttlSeconds: 60,
      version: "4.0.0",
      invalidateOnFingerprintMismatch: true,
    });
    assert.equal(cache.getExact(fp)?.path, "library://x.png");
    cache.invalidate(fp);
    assert.equal(cache.getExact(fp), undefined);
  });

  it("ignores stale versioned entries", () => {
    const cache = new InMemoryAssetCache();
    const fp = "stale";
    cache.set(fp, asset(fp), {
      ttlSeconds: 60,
      version: "3.0.0",
      invalidateOnFingerprintMismatch: true,
    });
    // Force bad version through private map
    const entry = (cache as unknown as { map: Map<string, { version: string }> }).map.get(fp)!;
    entry.version = "3.0.0";
    assert.equal(cache.getExact(fp), undefined);
  });
});
