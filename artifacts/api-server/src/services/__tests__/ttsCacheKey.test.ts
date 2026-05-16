import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

/** Mirror of computeCacheKey in elevenLabsService (global, not user-specific). */
function cacheKey(text: string, voiceId: string, modelId: string, mode: "default" | "phonics") {
  if (mode === "default") {
    return createHash("sha256").update(`${modelId}|${voiceId}|${text}`).digest("hex");
  }
  return createHash("sha256")
    .update(`\x00mode=${mode}\x00${modelId}\x00${voiceId}\x00${text}`)
    .digest("hex");
}

describe("TTS cache key (multi-user reuse)", () => {
  it("same text/voice/model yields same key for any user", () => {
    const a = cacheKey("Hello Amy", "voice1", "model1", "default");
    const b = cacheKey("Hello Amy", "voice1", "model1", "default");
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });

  it("phonics mode is namespaced separately from default", () => {
    const d = cacheKey("a", "voice1", "model1", "default");
    const p = cacheKey("a", "voice1", "model1", "phonics");
    assert.notEqual(d, p);
  });
});
