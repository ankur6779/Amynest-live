import { describe, expect, it } from "vitest";
import {
  isNonEnglishLearningZoneText,
  validateLearningZonePayload,
} from "@workspace/learning-zone-english";

describe("learning-zone-english", () => {
  it("flags Hinglish and Devanagari", () => {
    expect(isNonEnglishLearningZoneText("Amy se aur generate karo")).toBe(true);
    expect(isNonEnglishLearningZoneText("न्यूट्रिशन हब")).toBe(true);
    expect(isNonEnglishLearningZoneText("Try again tomorrow")).toBe(false);
    expect(isNonEnglishLearningZoneText("Generate More with Amy")).toBe(false);
  });

  it("validates nested AI payloads", () => {
    const bad = validateLearningZonePayload({
      tricks: [{ title: "Double", trick: "Add same number", audioText: "Amy se suno" }],
    });
    expect(bad.valid).toBe(false);
    expect(bad.offenders.length).toBeGreaterThan(0);

    const good = validateLearningZonePayload({
      words: [{ word: "cat", hint: "A small pet that says meow" }],
    });
    expect(good.valid).toBe(true);
  });
});
