import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertElevenLabsSpeakTextComplete,
  buildPhonicsElevenLabsPrompt,
  ELEVENLABS_SPEAK_TEXT,
  getElevenLabsPhonemeSpeakText,
  isPhonicsStopSoundKey,
  PHONICS_ELEVENLABS_VOICE_ID_DEFAULT,
  PHONICS_MAX_REJECT_DURATION_MS,
  PHONICS_MIN_REJECT_DURATION_MS,
  PHONICS_STOP_SOUND_MAX_DURATION_MS,
  validatePhonicsMp3Buffer,
} from "./phonics-generation.js";

describe("phonics-generation", () => {
  it("uses minimal pure phoneme hints (no sound, no instructions)", () => {
    assert.equal(getElevenLabsPhonemeSpeakText("b"), "b.");
    assert.equal(getElevenLabsPhonemeSpeakText("c"), "k.");
    assert.equal(getElevenLabsPhonemeSpeakText("a"), "ah");
    assert.equal(getElevenLabsPhonemeSpeakText("m"), "mmm");
    assert.equal(getElevenLabsPhonemeSpeakText("s"), "sss");
    assert.equal(getElevenLabsPhonemeSpeakText("th1"), "thh");
    assert.doesNotMatch(getElevenLabsPhonemeSpeakText("b"), /sound/i);
  });

  it("covers every catalog audioKey with forbidden-word guard", () => {
    assertElevenLabsSpeakTextComplete();
    assert.equal(Object.keys(ELEVENLABS_SPEAK_TEXT).length, 33);
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
