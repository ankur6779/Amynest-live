import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPhonicsAudioText,
  getPhonicsCacheFileName,
  normalizePhonicsLetterKey,
  resolvePhonicsLetterFromSymbol,
  resolvePhonicsPlaybackText,
} from "./index.js";
import {
  getPhonemeAudioText,
  getPhonemeCacheFileName,
  getCvcWordEntry,
  getCvcWordCacheFileName,
  CVC_WORDS,
} from "./cvc.js";
import { playCvcBlend } from "./cvc-blend.js";

describe("phonics-sounds", () => {
  it("maps letter I to igloo phoneme line (not alphabet name)", () => {
    assert.equal(getPhonicsAudioText("i"), "i as in igloo");
    assert.equal(getPhonicsAudioText("I"), "i as in igloo");
    assert.equal(getPhonicsAudioText("ih"), "i as in igloo");
  });

  it("fixes legacy buh phoneme", () => {
    assert.equal(getPhonicsAudioText("buh"), "b as in bat");
  });

  it("passes through existing as-in lines", () => {
    assert.equal(getPhonicsAudioText("a as in apple"), "a as in apple");
  });

  it("resolves symbol to key", () => {
    assert.equal(resolvePhonicsLetterFromSymbol("B", "buh"), "b");
    assert.equal(getPhonicsCacheFileName("b"), "phonics_b_bat");
  });

  it("normalizes digraph sh", () => {
    assert.equal(normalizePhonicsLetterKey("sh"), "sh");
    assert.equal(getPhonicsAudioText("sh"), "sh as in ship");
  });
});

describe("cvc blending", () => {
  it("maps IPA phonemes to instructional TTS (not letter names)", () => {
    assert.equal(getPhonemeAudioText("k"), "k sound");
    assert.equal(getPhonemeAudioText("æ"), "a as in apple");
    assert.equal(getPhonemeAudioText("ɪ"), "i as in igloo");
  });

  it("cat uses k æ t not alphabet names", () => {
    const cat = getCvcWordEntry("cat");
    assert.ok(cat);
    assert.deepEqual(cat!.phonemes, ["k", "æ", "t"]);
  });

  it("cache file names match GCS convention", () => {
    assert.equal(getPhonemeCacheFileName("k"), "phoneme_k");
    assert.equal(getPhonemeCacheFileName("æ"), "phoneme_ae_apple");
    assert.equal(getCvcWordCacheFileName("cat"), "word_cat");
  });

  it("playCvcBlend runs slow, fast, then word", async () => {
    const cat = CVC_WORDS.find((w) => w.word === "cat")!;
    const log: string[] = [];
    await playCvcBlend(cat, async (text, meta) => {
      log.push(`${meta?.phase}:${text}`);
      return { success: true };
    });
    assert.ok(log.some((l) => l.startsWith("slow:k sound")));
    assert.ok(log.some((l) => l.startsWith("fast:k sound")));
    assert.equal(log[log.length - 1], "word:cat");
  });

  it("resolvePhonicsPlaybackText from symbol + phoneme", () => {
    assert.equal(
      resolvePhonicsPlaybackText({ symbol: "A", phoneme: "æ", sound: "a as in apple" }),
      "a as in apple",
    );
  });
});
