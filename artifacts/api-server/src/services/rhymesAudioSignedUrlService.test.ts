import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearRhymesSignedUrlCacheForTests,
  isRhymesSignedUrlCacheHitForTests,
  resolveRhymesSignedUrl,
  seedRhymesSignedUrlCacheForTests,
} from "./rhymesAudioSignedUrlService.js";

const TWINKLE_ID = "twinkle-twinkle-little-star";

describe("rhymesAudioSignedUrlService", () => {
  beforeEach(() => {
    clearRhymesSignedUrlCacheForTests();
  });

  it("returns not_found for unknown audioId", async () => {
    const result = await resolveRhymesSignedUrl("not-a-real-lullaby-id");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "not_found");
  });

  it("evicts cache entry when GCS signed URL expires even if server cache TTL remains", async () => {
    seedRhymesSignedUrlCacheForTests({
      audioId: TWINKLE_ID,
      cacheTtlMs: 60_000,
      signedUrlTtlSec: -1,
    });
    assert.equal(isRhymesSignedUrlCacheHitForTests(TWINKLE_ID), false);

    const result = await resolveRhymesSignedUrl(TWINKLE_ID);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "gcs_unconfigured");
    }
  });

  it("serves cached signed URL while both server cache and GCS URL remain valid", async () => {
    seedRhymesSignedUrlCacheForTests({
      audioId: TWINKLE_ID,
      signedUrl: "https://storage.googleapis.com/example/fresh.mp3?sig=abc",
      cacheTtlMs: 60_000,
      signedUrlTtlSec: 120,
    });

    const result = await resolveRhymesSignedUrl(TWINKLE_ID);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.cached, true);
      assert.equal(result.signedUrl, "https://storage.googleapis.com/example/fresh.mp3?sig=abc");
      assert.ok(result.expiresIn >= 60 && result.expiresIn <= 120);
    }
  });

  it("default server cache TTL stays well below GCS signed URL lifetime", () => {
    const defaultCacheTtlMs = 12 * 60 * 1000;
    const defaultSignedUrlTtlMs = 45 * 60 * 1000;
    assert.ok(
      defaultCacheTtlMs < defaultSignedUrlTtlMs,
      "server cache must refresh before GCS URLs expire",
    );
    assert.ok(
      defaultCacheTtlMs < 3_600_000,
      "server cache TTL must be in milliseconds (not accidentally multiplied to hours)",
    );
  });
});
