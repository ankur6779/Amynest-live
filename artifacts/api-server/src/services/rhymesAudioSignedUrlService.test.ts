import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearRhymesSignedUrlCacheForTests,
  resolveRhymesSignedUrl,
} from "./rhymesAudioSignedUrlService.js";

describe("rhymesAudioSignedUrlService", () => {
  beforeEach(() => {
    clearRhymesSignedUrlCacheForTests();
  });

  it("returns not_found for unknown audioId", async () => {
    const result = await resolveRhymesSignedUrl("not-a-real-lullaby-id");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "not_found");
  });
});
