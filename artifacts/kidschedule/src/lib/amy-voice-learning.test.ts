import { describe, expect, it } from "vitest";
import type { AmySpeechPolicy } from "./amy-speech-mode";
import { shouldQueueAmyVoiceLearning } from "./amy-voice-learning";

function mockPolicy(overrides: Partial<AmySpeechPolicy>): AmySpeechPolicy {
  return {
    originalText: "hello",
    normalizedText: "hello",
    phrases: ["hello"],
    rawPhraseChunks: ["hello"],
    phraseAttentionSilenceMs: [0],
    useSemanticSplit: false,
    prosody: {
      playbackRate: 1,
      synthesisRate: 0.92,
      phonicsGapMs: 120,
      phraseGapMs: 400,
      pauseMarker: " ... ",
    },
    learningPriority: 0,
    emotion: "neutral",
    intent: "neutral",
    difficultyLevel: "neutral",
    replayCount: 0,
    speechMode: "word",
    pipelineMode: "default",
    forcePhonicsOnly: false,
    preferDynamicTts: true,
    allowPhonicsFallback: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    retryDynamicTts: false,
    preferSpeechSynthesisFallback: false,
    dynamicTimeoutMs: 1500,
    ...overrides,
  };
}

describe("amy-voice-learning", () => {
  it("queues only on fallback with replay or high-priority mode", () => {
    const fallback = mockPolicy({ replayCount: 0, speechMode: "word" });
    expect(shouldQueueAmyVoiceLearning(fallback, "text_visual")).toBe(false);
    expect(shouldQueueAmyVoiceLearning(fallback, "static")).toBe(false);

    const replayed = mockPolicy({ replayCount: 2, speechMode: "word" });
    expect(shouldQueueAmyVoiceLearning(replayed, "text_visual")).toBe(true);

    const coach = mockPolicy({ replayCount: 0, speechMode: "speech_coach" });
    expect(shouldQueueAmyVoiceLearning(coach, "text_visual")).toBe(true);

    const phonics = mockPolicy({
      replayCount: 0,
      speechMode: "phonics",
      preferSpeechSynthesisFallback: true,
    });
    expect(shouldQueueAmyVoiceLearning(phonics, "emergency_local")).toBe(true);
  });
});
