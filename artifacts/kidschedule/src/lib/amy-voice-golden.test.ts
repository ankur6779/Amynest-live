import { describe, expect, it } from "vitest";
import {
  AMY_VOICE_GOLDEN_SCENARIOS,
  buildGoldenSpeechBehavior,
  type GoldenSpeechBehavior,
} from "./amy-voice-golden";

/** Normalized regression fingerprints — update intentionally when speech behavior changes. */
const GOLDEN_BEHAVIOR: Record<string, Omit<GoldenSpeechBehavior, "scenarioId">> = {
  "math-equation": {
    speechMode: "math",
    pipelineMode: "default",
    normalizedText: "Let's try this… twelve ... minus ... five equals seven",
    phraseCount: 1,
    phrases: ["Let's try this… twelve ... minus ... five equals seven"],
    useSemanticSplit: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
  "phonics-letter": {
    speechMode: "phonics",
    pipelineMode: "phonics",
    normalizedText: "b",
    phraseCount: 1,
    phrases: ["b"],
    useSemanticSplit: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
  "speech-coach-instruction": {
    speechMode: "speech_coach",
    pipelineMode: "default",
    normalizedText: "Listen carefully. ... ... Try the word again please.",
    phraseCount: 2,
    phrases: ["Listen carefully.", "Try the word again please."],
    useSemanticSplit: true,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
  "hyphen-compound": {
    speechMode: "math",
    pipelineMode: "default",
    normalizedText: "Let's try this… follow the three ... minus ... step script",
    phraseCount: 1,
    phrases: ["Let's try this… follow the three ... minus ... step script"],
    useSemanticSplit: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
  "numbered-steps": {
    speechMode: "mixed",
    pipelineMode: "default",
    normalizedText: "Let's try this… one add apples. two count them",
    phraseCount: 1,
    phrases: ["Let's try this… one add apples. two count them"],
    useSemanticSplit: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
  "mixed-step-count": {
    speechMode: "mixed",
    pipelineMode: "default",
    normalizedText: "Let's try this… step three of five",
    phraseCount: 1,
    phrases: ["Let's try this… step three of five"],
    useSemanticSplit: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
  "spelling-sequence": {
    speechMode: "spelling",
    pipelineMode: "phonics",
    normalizedText: "C a t",
    phraseCount: 1,
    phrases: ["C a t"],
    useSemanticSplit: false,
    allowPhonicsSequence: true,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
  "math-subtraction": {
    speechMode: "math",
    pipelineMode: "default",
    normalizedText: "Let's try this… twelve ... minus ... five",
    phraseCount: 1,
    phrases: ["Let's try this… twelve ... minus ... five"],
    useSemanticSplit: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
  "lesson-paragraph": {
    speechMode: "sentence",
    pipelineMode: "default",
    normalizedText:
      "The 4-month sleep regression is not a regression — it is a permanent reorganisation. Pick one approach, then stick with it for two weeks.",
    phraseCount: 1,
    phrases: [
      "The 4-month sleep regression is not a regression — it is a permanent reorganisation. Pick one approach, then stick with it for two weeks.",
    ],
    useSemanticSplit: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
  "mixed-long-instruction": {
    speechMode: "mixed",
    pipelineMode: "default",
    normalizedText:
      "Let's try this… step three of five ... ... Add twelve apples to the basket and count them all together.",
    phraseCount: 2,
    phrases: [
      "Let's try this… step three of five",
      "Add twelve apples to the basket and count them all together.",
    ],
    useSemanticSplit: true,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
  "recovery-struggling": {
    speechMode: "speech_coach",
    pipelineMode: "default",
    normalizedText: "That's okay… sound out the word slowly",
    phraseCount: 1,
    phrases: ["That's okay… sound out the word slowly"],
    useSemanticSplit: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "struggling",
    teacherRecoveryApplied: true,
  },
  "recovery-effort": {
    speechMode: "speech_coach",
    pipelineMode: "default",
    normalizedText: "Let's try this… great job reading that word",
    phraseCount: 1,
    phrases: ["Let's try this… great job reading that word"],
    useSemanticSplit: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
  "confident-cohort-fast": {
    speechMode: "sentence",
    pipelineMode: "default",
    normalizedText: "Read the. ... Word.",
    phraseCount: 2,
    phrases: ["Read the.", "Word."],
    useSemanticSplit: true,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "confident",
    teacherRecoveryApplied: false,
  },
  "phonics-digraph": {
    speechMode: "phonics",
    pipelineMode: "phonics",
    normalizedText: "sh",
    phraseCount: 1,
    phrases: ["sh"],
    useSemanticSplit: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
  "math-word-problem": {
    speechMode: "math",
    pipelineMode: "default",
    normalizedText: "Let's try this… step two of four then solve eight ... plus ... three",
    phraseCount: 1,
    phrases: ["Let's try this… step two of four then solve eight ... plus ... three"],
    useSemanticSplit: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    difficulty: "neutral",
    teacherRecoveryApplied: false,
  },
};

describe("amy-voice golden scenarios", () => {
  it("covers all configured modes", () => {
    expect(AMY_VOICE_GOLDEN_SCENARIOS.length).toBeGreaterThanOrEqual(15);
    const ids = AMY_VOICE_GOLDEN_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const scenario of AMY_VOICE_GOLDEN_SCENARIOS) {
    it(`matches golden behavior for ${scenario.id}`, () => {
      const behavior = buildGoldenSpeechBehavior(scenario);
      const expected = GOLDEN_BEHAVIOR[scenario.id];
      expect(expected, `missing golden fixture for ${scenario.id}`).toBeDefined();
      const { scenarioId: _id, ...actual } = behavior;
      expect(actual).toEqual(expected);
    });
  }
});
