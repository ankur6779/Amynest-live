import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fingerprintAssetRequest, fingerprintSimilarity } from "./engine.js";

describe("fingerprint engine", () => {
  it("produces identical fingerprints for identical prompts", () => {
    const a = fingerprintAssetRequest({
      assetType: "Promo Image",
      prompt: "Warm family parenting visual",
      resolution: "1080x1920",
      aspectRatio: "9:16",
      fallback: "asset.fallback.promo-poster",
      fingerprintSeed: "scene-01",
    });
    const b = fingerprintAssetRequest({
      assetType: "Promo Image",
      prompt: "Warm family parenting visual",
      resolution: "1080x1920",
      aspectRatio: "9:16",
      fallback: "asset.fallback.promo-poster",
      fingerprintSeed: "scene-01",
    });
    assert.equal(a, b);
    assert.equal(fingerprintSimilarity(a, b), 1);
  });

  it("changes fingerprint when prompt changes", () => {
    const a = fingerprintAssetRequest({
      assetType: "Promo Image",
      prompt: "A",
      resolution: "1080x1920",
      aspectRatio: "9:16",
      fallback: "x",
      fingerprintSeed: "1",
    });
    const b = fingerprintAssetRequest({
      assetType: "Promo Image",
      prompt: "B",
      resolution: "1080x1920",
      aspectRatio: "9:16",
      fallback: "x",
      fingerprintSeed: "1",
    });
    assert.notEqual(a, b);
  });
});
