import { describe, expect, it } from "vitest";
import {
  applyEmotionToProsody,
  applyReplayProsody,
  buildAdaptiveProsody,
  computePhraseTransitionGap,
  detectAmyEmotion,
} from "./amy-voice-emotion";
import { getProsodyProfile } from "./amy-speech-mode";

describe("amy-voice-emotion", () => {
  it("detects emotional tones by context", () => {
    expect(detectAmyEmotion("good job!", "word")).toBe("happy");
    expect(detectAmyEmotion("try again", "sentence")).toBe("encouraging");
    expect(detectAmyEmotion("12 + 5", "math")).toBe("instructive");
    expect(detectAmyEmotion("b", "phonics")).toBe("patient");
  });

  it("adjusts prosody for happy vs encouraging", () => {
    const base = getProsodyProfile("speech_coach", "listen now try again", 2);
    const happy = applyEmotionToProsody(base, "happy");
    const encouraging = applyEmotionToProsody(base, "encouraging");
    expect(happy.playbackRate).toBeGreaterThan(encouraging.playbackRate);
    expect(encouraging.phraseGapMs).toBeGreaterThan(happy.phraseGapMs);
  });

  it("slows replay for clarity", () => {
    const base = getProsodyProfile("word", "cat", 1);
    const first = applyReplayProsody(base, 1);
    const third = applyReplayProsody(base, 3);
    expect(third.playbackRate).toBeLessThan(first.playbackRate);
    expect(third.phraseGapMs).toBeGreaterThan(first.phraseGapMs);
  });

  it("adapts phrase gaps for short vs instructional transitions", () => {
    const short = computePhraseTransitionGap("good job", "well done", 500, "happy");
    const instruct = computePhraseTransitionGap(
      "step three of five",
      "then add twelve apples",
      500,
      "instructive",
    );
    expect(short).toBeLessThan(instruct);
  });

  it("builds full adaptive prosody with emotion", () => {
    const base = getProsodyProfile("speech_coach", "great work keep going", 2);
    const { emotion, prosody } = buildAdaptiveProsody(
      base,
      "speech_coach",
      "great work keep going",
      2,
    );
    expect(emotion).toBe("happy");
    expect(prosody.playbackRate).toBeLessThanOrEqual(1.08);
  });
});
