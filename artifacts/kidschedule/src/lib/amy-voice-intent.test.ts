import { describe, expect, it } from "vitest";
import {
  detectAmyIntent,
  linkConversationalPhrases,
  resolveDeliveryEmotion,
  simplifyPhrasesForDifficulty,
} from "./amy-voice-intent";
import {
  assessAmyDifficulty,
  applyDifficultyProsody,
  mergeDifficultyEmotion,
  recordAmyVoiceDeliveryFallback,
  resetAmyDifficultySession,
  smoothDifficultyLevel,
} from "./amy-voice-difficulty";
import {
  anchorProsodyToSession,
  buildAdaptiveDelivery,
  detectAmyEmotion,
  resetSessionAmyTone,
} from "./amy-voice-emotion";
import { getProsodyProfile } from "./amy-speech-mode";

describe("amy-voice-intent", () => {
  it("detects intent categories", () => {
    expect(detectAmyIntent("good job!", "word")).toBe("feedback");
    expect(detectAmyIntent("try again", "sentence")).toBe("correction");
    expect(detectAmyIntent("listen carefully", "speech_coach")).toBe("attention");
    expect(detectAmyIntent("step three of five", "mixed")).toBe("instruction");
  });

  it("resolves emotion and intent without conflict", () => {
    expect(resolveDeliveryEmotion("happy", "instruction")).toBe("instructive");
    expect(resolveDeliveryEmotion("happy", "correction")).toBe("encouraging");
  });

  it("links phrases with conversational transitions", () => {
    const linked = linkConversationalPhrases(
      ["Step three of five.", "Add twelve apples."],
      "instruction",
    );
    expect(linked[1]).toMatch(/^Now,/i);
  });

  it("simplifies phrases when struggling", () => {
    const simplified = simplifyPhrasesForDifficulty(
      ["one", "two", "three", "four"],
      true,
    );
    expect(simplified.length).toBe(2);
  });
});

describe("amy-voice-difficulty", () => {
  it("detects struggling from high replay count after gradual smoothing", () => {
    resetAmyDifficultySession();
    recordAmyVoiceDeliveryFallback();
    recordAmyVoiceDeliveryFallback();
    let level: ReturnType<typeof assessAmyDifficulty>["level"] = "neutral";
    for (let i = 0; i < 4; i++) {
      level = assessAmyDifficulty("hello", "default", 4).level;
    }
    expect(level).toBe("struggling");
  });

  it("smooths difficulty transitions gradually", () => {
    resetAmyDifficultySession();
    expect(smoothDifficultyLevel("neutral")).toBe("neutral");
    const first = smoothDifficultyLevel("struggling");
    expect(first).toBe("neutral");
    const third = smoothDifficultyLevel("struggling");
    expect(third).toBe("struggling");
  });

  it("speeds up for confident learners", () => {
    resetAmyDifficultySession();
    const base = getProsodyProfile("word", "cat", 1);
    const confident = applyDifficultyProsody(base, "confident");
    expect(confident.prosody.playbackRate).toBeGreaterThan(base.playbackRate);
  });

  it("merges encouraging tone when struggling", () => {
    expect(mergeDifficultyEmotion("happy", "struggling", true)).toBe("encouraging");
  });
});

describe("buildAdaptiveDelivery", () => {
  it("combines intent emotion and difficulty", () => {
    resetAmyDifficultySession();
    resetSessionAmyTone();
    const base = getProsodyProfile("speech_coach", "try again and listen", 2);
    const delivery = buildAdaptiveDelivery(
      base,
      "speech_coach",
      "try again and listen",
      3,
      "correction",
      "struggling",
    );
    expect(delivery.intent).toBe("correction");
    expect(delivery.emotion).toBe("encouraging");
    expect(delivery.prosody.playbackRate).toBeLessThan(base.playbackRate);
    expect(detectAmyEmotion("try again", "sentence")).toBe("encouraging");
  });

  it("anchors prosody within session deviation bounds", () => {
    resetSessionAmyTone();
    const base = getProsodyProfile("sentence", "add twelve apples", 1);
    const first = buildAdaptiveDelivery(base, "sentence", "add twelve apples", 0);
    const extreme = {
      ...first.prosody,
      playbackRate: base.playbackRate * 1.35,
      phraseGapMs: base.phraseGapMs * 1.35,
    };
    const anchored = anchorProsodyToSession(extreme);
    expect(anchored.playbackRate).toBeLessThanOrEqual(base.playbackRate * 1.12);
    expect(anchored.playbackRate).toBeGreaterThanOrEqual(base.playbackRate * 0.88);
  });
});
