import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPhonemeSequence } from "./dataset.js";
import {
  getAllPhonicsAudioKeys,
  getPhonicsCvcCacheKey,
  getPhonicsLetterCacheKey,
  resolveGraphemeToAudioKey,
  resolvePhonicsAudioKey,
  resolvePhonicsSequenceKeys,
} from "./phoneme-map.js";

describe("phoneme-map", () => {
  it("maps letters to audio keys", () => {
    assert.equal(resolveGraphemeToAudioKey("b"), "b");
    assert.equal(resolveGraphemeToAudioKey("æ"), "a");
    assert.equal(resolveGraphemeToAudioKey("sh"), "sh");
  });

  it("uses th1/th2 for voiced vs unvoiced", () => {
    assert.deepEqual(getPhonemeSequence("thin"), ["th_unvoiced", "i", "n"]);
    assert.deepEqual(getPhonemeSequence("this"), ["th_voiced", "i", "s"]);
    assert.equal(resolveGraphemeToAudioKey("th_unvoiced"), "th1");
    assert.equal(resolveGraphemeToAudioKey("th_voiced"), "th2");
  });

  it("builds CVC phoneme sequences", () => {
    assert.deepEqual(getPhonemeSequence("cat"), ["c", "a", "t"]);
    assert.deepEqual(resolvePhonicsSequenceKeys("cat"), ["c", "a", "t"]);
    assert.deepEqual(getPhonemeSequence("ship"), ["sh", "i", "p"]);
  });

  it("uses phonics cache key format", () => {
    assert.equal(getPhonicsLetterCacheKey("a"), "phonics:a");
    assert.equal(getPhonicsCvcCacheKey("cat"), "phonics:cat");
  });

  it("lists all required audio keys", () => {
    const keys = getAllPhonicsAudioKeys();
    assert.ok(keys.includes("a"));
    assert.ok(keys.includes("sh"));
    assert.ok(keys.includes("th1"));
    assert.equal(resolvePhonicsAudioKey({ text: "b" }), "b");
  });
});
