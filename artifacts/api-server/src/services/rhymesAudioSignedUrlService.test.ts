import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getRhymesRegistryEntry } from "@workspace/rhymes-audio";
import {
  createRhymesSignedUrlCache,
  type RhymesSignedUrlCacheConfig,
} from "./rhymesSignedUrlCache.js";

const DOGGIE_ID = "how-much-is-that-doggie-in-the-window";

const TEST_CONFIG: RhymesSignedUrlCacheConfig = {
  signedUrlTtlMs: 45 * 60 * 1000,
  cacheTtlMs: 12 * 60 * 1000,
};

function buildSignedUrl(dateIso: string, expiresSec: number): string {
  return (
    "https://storage.googleapis.com/amynest-audio-storage/Rhymes/test.mp3" +
    "?X-Goog-Algorithm=GOOG4-RSA-SHA256" +
    "&X-Goog-Credential=test%40project.iam.gserviceaccount.com%2F20260612%2Fauto%2Fstorage%2Fgoog4_request" +
    `&X-Goog-Date=${dateIso}` +
    `&X-Goog-Expires=${expiresSec}` +
    "&X-Goog-SignedHeaders=host" +
    "&X-Goog-Signature=deadbeef"
  );
}

describe("rhymesSignedUrlCache", () => {
  let cache: ReturnType<typeof createRhymesSignedUrlCache>;

  beforeEach(() => {
    cache = createRhymesSignedUrlCache(TEST_CONFIG);
  });

  it("purges stale cache when GCS signature is expired (ExpiredToken regression)", () => {
    const entry = getRhymesRegistryEntry(DOGGIE_ID);
    assert.ok(entry);

    const expiredUrl = buildSignedUrl("20260612T134706Z", 2700);
    cache.write(entry, expiredUrl, 2700);

    assert.equal(cache.size(), 1);
    assert.equal(cache.readRaw(DOGGIE_ID)?.signedUrl, expiredUrl);
    assert.equal(cache.read(DOGGIE_ID), null);
    assert.equal(cache.size(), 0);
  });

  it("cacheExpiresAt uses milliseconds not seconds (no *1000 inflation)", () => {
    const entry = getRhymesRegistryEntry(DOGGIE_ID);
    assert.ok(entry);

    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    const y = futureDate.getUTCFullYear();
    const mo = String(futureDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(futureDate.getUTCDate()).padStart(2, "0");
    const h = String(futureDate.getUTCHours()).padStart(2, "0");
    const mi = String(futureDate.getUTCMinutes()).padStart(2, "0");
    const s = String(futureDate.getUTCSeconds()).padStart(2, "0");
    const dateIso = `${y}${mo}${d}T${h}${mi}${s}Z`;

    const validUrl = buildSignedUrl(dateIso, Math.floor(TEST_CONFIG.signedUrlTtlMs / 1000));
    cache.write(entry, validUrl, Math.floor(TEST_CONFIG.signedUrlTtlMs / 1000));

    const hit = cache.read(DOGGIE_ID);
    assert.ok(hit);
    const cacheTtlMs = hit!.cacheExpiresAt - Date.now();
    assert.ok(cacheTtlMs <= TEST_CONFIG.cacheTtlMs + 1_000);
    assert.ok(cacheTtlMs > TEST_CONFIG.cacheTtlMs - 5_000);
    assert.ok(cacheTtlMs < 24 * 60 * 60 * 1000, "cache TTL must not inflate to multi-day");
  });

  it("expiresIn reflects min(cache, signature) remaining — never multi-day", () => {
    const entry = getRhymesRegistryEntry(DOGGIE_ID);
    assert.ok(entry);

    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    const y = futureDate.getUTCFullYear();
    const mo = String(futureDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(futureDate.getUTCDate()).padStart(2, "0");
    const h = String(futureDate.getUTCHours()).padStart(2, "0");
    const mi = String(futureDate.getUTCMinutes()).padStart(2, "0");
    const s = String(futureDate.getUTCSeconds()).padStart(2, "0");
    const dateIso = `${y}${mo}${d}T${h}${mi}${s}Z`;
    const validUrl = buildSignedUrl(dateIso, Math.floor(TEST_CONFIG.signedUrlTtlMs / 1000));
    cache.write(entry, validUrl, Math.floor(TEST_CONFIG.signedUrlTtlMs / 1000));

    const hit = cache.read(DOGGIE_ID);
    assert.ok(hit);
    const expiresIn = cache.remainingExpiresInSec(hit!);
    assert.ok(expiresIn <= Math.ceil(TEST_CONFIG.cacheTtlMs / 1000) + 5);
    assert.ok(expiresIn <= Math.ceil(TEST_CONFIG.signedUrlTtlMs / 1000) + 5);
    assert.ok(expiresIn < 100_000, "expiresIn must not report multi-day TTL");
  });
});
