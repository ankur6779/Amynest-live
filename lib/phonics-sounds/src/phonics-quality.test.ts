import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  approvePhonemeMeta,
  buildPhonicsAudioMeta,
  detectSuspiciousAudio,
  isUpgradeQualityCandidate,
  markForReview,
  shouldSkipStaticClipForLearning,
} from "./phonics-quality.js";

describe("phonics-quality", () => {
  it("marks duration outliers for review", () => {
    assert.equal(markForReview(250), "needs_review");
    assert.equal(markForReview(750), "needs_review");
    assert.equal(markForReview(450), "auto");
  });

  it("detects suspicious stop sounds", () => {
    assert.equal(detectSuspiciousAudio("b", 650), "too_long_stop_sound");
    assert.equal(detectSuspiciousAudio("a", 650), null);
    assert.equal(detectSuspiciousAudio("a", 950), "likely_wrong_pronunciation");
  });

  it("skips fallback tone clips for static learning playback", () => {
    const tone = buildPhonicsAudioMeta({
      key: "b",
      durationMs: 320,
      size: 5000,
      source: "fallback_tone",
    });
    assert.equal(shouldSkipStaticClipForLearning(tone), true);
  });

  it("approves and excludes from upgrade queue", () => {
    const meta = approvePhonemeMeta(
      buildPhonicsAudioMeta({
        key: "b",
        durationMs: 400,
        size: 6000,
        source: "elevenlabs",
      }),
    );
    assert.equal(meta.quality, "approved");
    assert.equal(isUpgradeQualityCandidate(meta), false);
  });
});
