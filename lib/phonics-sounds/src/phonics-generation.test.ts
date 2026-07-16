import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertElevenLabsSpeakTextComplete,
  assertSpeechSynthPhonemeTextSafe,
  buildPhonicsElevenLabsPrompt,
  ELEVENLABS_SPEAK_TEXT,
  getElevenLabsPhonemeSpeakText,
  getElevenLabsSpeakOverride,
  getPhonemeSynthesisText,
  isPhonicsStopSoundKey,
  PHONICS_ELEVENLABS_VOICE_ID_DEFAULT,
  PHONICS_MAX_REJECT_DURATION_MS,
  PHONICS_MIN_REJECT_DURATION_MS,
  PHONICS_STOP_SOUND_MAX_DURATION_MS,
  SPEECH_SYNTH_PHONEME_TEXT,
  validatePhonicsMp3Buffer,
} from "./phonics-generation.js";
import { getPhonicsCatalogAudioKeys } from "./phonics-generation.js";

describe("phonics-generation", () => {
  it("uses minimal pure phoneme hints (no sound, no instructions)", () => {
    assert.equal(getElevenLabsPhonemeSpeakText("b"), "b.");
    assert.equal(getElevenLabsPhonemeSpeakText("c"), "k.");
    assert.equal(getElevenLabsPhonemeSpeakText("a"), "ahh");
    assert.equal(getElevenLabsPhonemeSpeakText("m"), "mmm");
    assert.equal(getElevenLabsPhonemeSpeakText("s"), "sss");
    assert.equal(getElevenLabsPhonemeSpeakText("th1"), "thhh.");
    assert.doesNotMatch(getElevenLabsPhonemeSpeakText("b"), /sound/i);
  });

  it("routes IPA phoneme-tag entries to a tag-capable model", () => {
    assert.match(getElevenLabsPhonemeSpeakText("i"), /<phoneme alphabet="ipa"/);
    assert.match(getElevenLabsPhonemeSpeakText("o"), /<phoneme alphabet="ipa"/);
    for (const [key, text] of Object.entries(ELEVENLABS_SPEAK_TEXT)) {
      if (text.includes("<phoneme")) {
        const override = getElevenLabsSpeakOverride(key);
        assert.ok(
          override?.modelId,
          `${key} uses a phoneme tag but has no tag-capable model override`,
        );
      }
    }
  });

  it("covers every catalog audioKey with forbidden-word guard", () => {
    assertElevenLabsSpeakTextComplete();
    assert.equal(Object.keys(ELEVENLABS_SPEAK_TEXT).length, 35);
    for (const text of Object.values(ELEVENLABS_SPEAK_TEXT)) {
      assert.doesNotMatch(text, /\bsound\b/i);
    }
  });

  it("identifies stop sound keys", () => {
    assert.equal(isPhonicsStopSoundKey("b"), true);
    assert.equal(isPhonicsStopSoundKey("k"), true);
    assert.equal(isPhonicsStopSoundKey("a"), false);
  });

  it("rejects stop sounds longer than 600ms", () => {
    const stopBytes = Math.ceil(((PHONICS_STOP_SOUND_MAX_DURATION_MS + 50) / 1000) * (128 * 1000) / 8);
    const result = validatePhonicsMp3Buffer(Buffer.alloc(stopBytes, 0xff), "b");
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /too_long_for_stop_sound/);
  });

  it("builds QA brief for human review", () => {
    const prompt = buildPhonicsElevenLabsPrompt("b");
    assert.match(prompt, /letter name/i);
    assert.match(prompt, /buh/i);
    assert.match(prompt, /250ms/);
  });

  it("defaults to female ElevenLabs voice id", () => {
    assert.equal(PHONICS_ELEVENLABS_VOICE_ID_DEFAULT, "QbQKfe9vgx5OsbZUvlFv");
  });

  it("rejects clips estimated longer than 900ms", () => {
    const tooLongBytes = Math.ceil(((PHONICS_MAX_REJECT_DURATION_MS + 100) / 1000) * (128 * 1000) / 8);
    const result = validatePhonicsMp3Buffer(Buffer.alloc(tooLongBytes, 0xff), "a");
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /too_long/);
  });

  it("rejects clips estimated shorter than 250ms for mobile", () => {
    const tooShortBytes = Math.floor(((PHONICS_MIN_REJECT_DURATION_MS - 50) / 1000) * (128 * 1000) / 8);
    const result = validatePhonicsMp3Buffer(Buffer.alloc(Math.max(tooShortBytes, 600), 0xff), "a");
    if (result.estimatedDurationMs < PHONICS_MIN_REJECT_DURATION_MS) {
      assert.equal(result.ok, false);
      assert.match(result.reason ?? "", /too_short_for_mobile/);
    }
  });

  it("accepts typical short phoneme clip size", () => {
    const buf = Buffer.alloc(6000, 0xff);
    const result = validatePhonicsMp3Buffer(buf, "m");
    assert.equal(result.ok, true);
    assert.ok(result.estimatedDurationMs >= PHONICS_MIN_REJECT_DURATION_MS);
    assert.ok(result.estimatedDurationMs <= PHONICS_MAX_REJECT_DURATION_MS);
  });
});

describe("speech-synthesis phoneme text (letter-name-proof fallback)", () => {
  const LETTER_NAMES = new Set([
    "bee", "cee", "see", "dee", "ee", "ef", "gee", "aitch", "jay", "kay",
    "el", "em", "en", "oh", "pee", "cue", "ar", "ess", "tee", "you",
    "vee", "double-u", "doubleyou", "ex", "eks", "why", "zee", "zed", "ay",
  ]);

  it("covers every catalog audioKey", () => {
    assertSpeechSynthPhonemeTextSafe();
    for (const key of getPhonicsCatalogAudioKeys()) {
      assert.ok(
        SPEECH_SYNTH_PHONEME_TEXT[key]?.trim(),
        `missing synthesis text for ${key}`,
      );
    }
  });

  it("never produces an alphabet name (no bee/cee/dee/pee/tee)", () => {
    for (const [key, text] of Object.entries(SPEECH_SYNTH_PHONEME_TEXT)) {
      const norm = text.trim().toLowerCase().replace(/[.\s]/g, "");
      assert.ok(!LETTER_NAMES.has(norm), `${key} → "${text}" is an alphabet name`);
    }
  });

  it("uses pure-sound spellings for vowels and continuants", () => {
    assert.equal(getPhonemeSynthesisText("a"), "ah");
    assert.equal(getPhonemeSynthesisText("s"), "ssss");
    assert.equal(getPhonemeSynthesisText("m"), "mmmm");
    // Single-letter consonants must not be bare letters (browser says letter name).
    assert.notEqual(getPhonemeSynthesisText("b"), "b");
    assert.notEqual(getPhonemeSynthesisText("w"), "w");
    assert.notEqual(getPhonemeSynthesisText("y"), "y");
  });
});
