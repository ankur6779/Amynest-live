import { describe, expect, it } from "vitest";
import { buildSpeechFeedback, resolveSpeechTier } from "./speech-feedback";

describe("speech-feedback", () => {
  it("maps scores to four tiers", () => {
    expect(resolveSpeechTier(true, 0.95)).toBe("excellent");
    expect(resolveSpeechTier(false, 0.8)).toBe("good");
    expect(resolveSpeechTier(false, 0.6)).toBe("almost");
    expect(resolveSpeechTier(false, 0.2)).toBe("try_again");
  });

  it("provides positive phoneme guidance", () => {
    const fb = buildSpeechFeedback({
      word: "cat",
      transcript: "cot",
      correct: false,
      score: 0.5,
    });
    expect(fb.guidance).toMatch(/Great|Nice|Good|practice/i);
    expect(fb.label).toBeTruthy();
  });
});
