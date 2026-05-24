import { describe, expect, it } from "vitest";
import {
  detectSpeechMode,
  formatProsodyForTts,
  getProsodyProfile,
  isMixedContent,
  isPhonicsTrainingKey,
  normalizeMathExpression,
  normalizeSentenceNumbers,
  normalizeSpellingInput,
  normalizeText,
  numberToDigits,
  numberToWords,
  prepareAmySpeechInput,
  prepareAmyCatalogSpeech,
  prepareAmyLessonParagraphSpeech,
  splitAtIntentMarkers,
  splitSemanticPhrases,
  getPhonicsTrainingAudioText,
} from "./amy-speech-mode";
import { computeLearningPriority } from "./amy-voice-learning";

describe("amy-speech-mode", () => {
  it("detects math and numbers", () => {
    expect(detectSpeechMode("12 + 5")).toBe("math");
    expect(detectSpeechMode("45")).toBe("number");
  });

  it("detects mixed content with numbers and words", () => {
    expect(isMixedContent("step 3 of 5")).toBe(true);
    expect(detectSpeechMode("step 3 of 5")).toBe("mixed");
    const policy = prepareAmySpeechInput("step 3 of 5");
    expect(policy.speechMode).toBe("mixed");
    expect(policy.allowPhonicsSequence).toBe(false);
    expect(policy.prosody.phraseGapMs).toBeGreaterThanOrEqual(450);
  });

  it("splits at intent markers then step patterns", () => {
    const intent = splitAtIntentMarkers("listen carefully then add twelve apples");
    expect(intent.length).toBe(2);
    const input =
      "step three of five then add twelve apples to the basket and count them all";
    const phrases = splitSemanticPhrases(normalizeText(input, "mixed"), "mixed");
    expect(phrases.length).toBeGreaterThan(1);
  });

  it("uses adaptive prosody for speech coach", () => {
    const profile = getProsodyProfile("speech_coach", "listen carefully now try again please", 2);
    expect(profile.playbackRate).toBeGreaterThanOrEqual(0.85);
    expect(profile.playbackRate).toBeLessThanOrEqual(0.95);
    expect(profile.phraseGapMs).toBeGreaterThanOrEqual(400);
    const formatted = formatProsodyForTts("listen carefully now try again", "speech_coach", profile);
    expect(formatted).toContain("...");
  });

  it("emphasizes math operators with pauses", () => {
    const profile = getProsodyProfile("math", "twelve plus five", 1);
    const formatted = formatProsodyForTts("twelve plus five", "math", profile);
    expect(formatted).toMatch(/plus/i);
    expect(formatted).toContain("...");
  });

  it("uses tight phonics pacing profile", () => {
    const profile = getProsodyProfile("phonics", "b", 1);
    expect(profile.phonicsGapMs).toBeGreaterThanOrEqual(100);
    expect(profile.phonicsGapMs).toBeLessThanOrEqual(130);
  });

  it("normalizes math to spoken words", () => {
    expect(normalizeMathExpression("12 + 5")).toBe("twelve plus five");
    expect(normalizeMathExpression("8 × 3")).toBe("eight times three");
  });

  it("detects phonics and spelling", () => {
    expect(detectSpeechMode("sh")).toBe("phonics");
    expect(detectSpeechMode("b")).toBe("phonics");
    expect(detectSpeechMode("c a t")).toBe("spelling");
    expect(isPhonicsTrainingKey("sh")).toBe(true);
    expect(isPhonicsTrainingKey("cat")).toBe(false);
  });

  it("treats short unknown words as word mode", () => {
    expect(detectSpeechMode("frog")).toBe("word");
    expect(detectSpeechMode("quiz")).toBe("word");
  });

  it("blocks phonics fallback for sentences", () => {
    const policy = prepareAmySpeechInput("I like cats.");
    expect(policy.speechMode).toBe("sentence");
    expect(policy.allowPhonicsSequence).toBe(false);
    expect(policy.preferSpeechSynthesisFallback).toBe(true);
  });

  it("uses phoneme audio keys not letter names", () => {
    expect(getPhonicsTrainingAudioText("b")).toBe("b");
    expect(getPhonicsTrainingAudioText("a")).toBe("a");
    expect(getPhonicsTrainingAudioText("sh")).toBe("sh");
  });

  it("phonics mode plays one static clip key per tile", () => {
    const letter = prepareAmySpeechInput("b", { mode: "phonics" });
    expect(letter.normalizedText).toBe("b");
    expect(letter.allowPhonicsSequence).toBe(false);
    expect(letter.forcePhonicsOnly).toBe(true);

    const vowel = prepareAmySpeechInput("a as in apple", { mode: "phonics" });
    expect(vowel.normalizedText).toBe("a");
    expect(vowel.allowPhonicsSequence).toBe(false);
  });

  it("reads numbers as words", () => {
    expect(numberToWords(100)).toBe("one hundred");
    expect(prepareAmySpeechInput("45").normalizedText).toBe("Forty five");
  });

  it("reads long IDs digit-by-digit", () => {
    expect(numberToDigits("123456")).toBe("one two three four five six");
  });

  it("spelling mode reads digits one at a time", () => {
    expect(normalizeSpellingInput("c 1 t")).toBe("c one t");
  });

  it("normalizes sentence numbers naturally", () => {
    expect(normalizeSentenceNumbers("I have 2 cats")).toBe("i have two cats");
  });

  it("catalog playback keeps verbatim text and prefers static audio", () => {
    const trick =
      "Doubling! When you add a number to itself, you double it. 6 plus 6 equals 12. Try doubling 7 — seven plus seven is 14!";
    const policy = prepareAmyCatalogSpeech(trick);
    expect(policy.normalizedText).toBe(trick);
    expect(policy.preferDynamicTts).toBe(false);
    expect(policy.useSemanticSplit).toBe(false);
    expect(prepareAmySpeechInput(trick, { catalogPlayback: true }).normalizedText).toBe(trick);
  });

  it("lesson paragraphs play as one phrase (no semantic split)", () => {
    const long =
      "The 4-month sleep regression is not a regression. Pick one approach for two weeks.";
    const policy = prepareAmyLessonParagraphSpeech(long);
    expect(policy.useSemanticSplit).toBe(false);
    expect(policy.phrases).toHaveLength(1);
    expect(policy.normalizedText).toBe(long);
    expect(policy.preferDynamicTts).toBe(false);
    expect(policy.retryDynamicTts).toBe(true);
    expect(policy.dynamicTimeoutMs).toBeGreaterThanOrEqual(12_000);
    expect(prepareAmySpeechInput(long, { lessonParagraph: true }).phrases).toHaveLength(1);
  });

  it("long lesson paragraphs without lessonParagraph flag would semantic-split", () => {
    const colic =
      "Colic is defined as intense crying for more than 3 hours a day, more than 3 days a week, for at least 3 weeks — usually peaking around 6 to 8 weeks. It is not your fault.";
    const withoutFlag = prepareAmySpeechInput(colic);
    expect(withoutFlag.phrases.length).toBeGreaterThan(1);
    expect(withoutFlag.useSemanticSplit).toBe(true);
  });
});

describe("amy-voice-learning", () => {
  it("prioritizes speech coach above general", () => {
    const coach = computeLearningPriority("Great job!", "default", "speech_coach");
    const general = computeLearningPriority("Great job!", "default", "word");
    expect(coach).toBeGreaterThan(general);
  });

  it("boosts priority for long phrases", () => {
    const short = computeLearningPriority("hi", "default", "word");
    const long = computeLearningPriority(
      "one two three four five six seven eight nine ten eleven twelve",
      "default",
      "speech_coach",
    );
    expect(long).toBeGreaterThan(short);
  });
});
