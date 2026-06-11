import { describe, expect, it } from "vitest";
import { collectKidschedulePhonicsAudioInventory } from "./phonics-audio-inventory-sources";

describe("phonics-audio-inventory-sources", () => {
  it("collects V1/V2/V3 story sentences and words", () => {
    const items = collectKidschedulePhonicsAudioInventory();
    expect(items.length).toBeGreaterThan(200);
    expect(items.some((i) => i.category === "story_sentence")).toBe(true);
    expect(items.some((i) => i.category === "story_title")).toBe(true);
    expect(items.some((i) => i.category === "cvcc")).toBe(true);
    expect(items.some((i) => i.category === "ccvc")).toBe(true);
    expect(items.some((i) => i.category === "mission_prompt")).toBe(true);
    expect(items.some((i) => i.category === "assessment_prompt")).toBe(true);
  });

  it("has no duplicate catalog keys", () => {
    const items = collectKidschedulePhonicsAudioInventory();
    const keys = items.map((i) => i.catalogKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
