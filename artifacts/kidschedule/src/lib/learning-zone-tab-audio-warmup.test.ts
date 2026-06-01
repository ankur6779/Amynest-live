import { describe, expect, it, beforeEach } from "vitest";
import {
  _resetLearningZoneTabWarmupForTests,
  pickAbacusTabWarmTexts,
  pickSmartStudyTabWarmTexts,
  pickSpellingTabWarmWords,
} from "@/lib/learning-zone-tab-audio-warmup";

describe("learning-zone-tab-audio-warmup", () => {
  beforeEach(() => {
    _resetLearningZoneTabWarmupForTests();
  });

  it("returns no words below spelling minimum age", () => {
    expect(pickSpellingTabWarmWords(1, 18)).toEqual([]);
  });

  it("picks catalog words for eligible child", () => {
    const words = pickSpellingTabWarmWords(42, 60);
    expect(words.length).toBeGreaterThan(0);
    expect(words[0]).toMatchObject({
      id: expect.any(String),
      word: expect.any(String),
    });
  });

  it("picks abacus level-1 lesson steps", () => {
    const texts = pickAbacusTabWarmTexts();
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.some((t) => t.toLowerCase().includes("abacus"))).toBe(true);
  });

  it("picks smart study play tile speak lines", () => {
    const texts = pickSmartStudyTabWarmTexts(4);
    expect(texts.length).toBeGreaterThan(0);
  });
});
