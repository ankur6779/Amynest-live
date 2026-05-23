import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTtsCacheKeyPayload, computeTtsCacheKey } from "./tts-cache-key.js";

describe("computeTtsCacheKey", () => {
  it("includes voice, model, and text for default mode", () => {
    const keyA = computeTtsCacheKey("hello", "nova", "tts-1", "default");
    const keyB = computeTtsCacheKey("hello", "alloy", "tts-1", "default");
    assert.notEqual(keyA, keyB);
    assert.match(keyA, /^[a-f0-9]{64}$/);
  });

  it("separates phonics mode from default for same text", () => {
    const def = computeTtsCacheKey("a as in apple", "nova", "tts-1", "default");
    const phonics = computeTtsCacheKey("a as in apple", "nova", "tts-1", "phonics");
    assert.notEqual(def, phonics);
  });

  it("buildTtsCacheKeyPayload is stable", () => {
    assert.equal(
      buildTtsCacheKeyPayload("hi", "nova", "tts-1", "default"),
      "tts-1|nova|hi",
    );
  });
});
