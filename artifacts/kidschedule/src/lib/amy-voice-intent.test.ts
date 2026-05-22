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
} from "./amy-voice-difficulty";
import { buildAdaptiveDelivery, detectAmyEmotion } from "./amy-voice-emotion";
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
  it("detects struggling from high replay count", () => {
    resetAmyDifficultySession();
    recordAmyVoiceDeliveryFallback();
    recordAmyVoiceDeliveryFallback();
    const result = assessAmyDifficulty("hello", "default", 4);
    expect(result.level).toBe("struggling");
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
});
