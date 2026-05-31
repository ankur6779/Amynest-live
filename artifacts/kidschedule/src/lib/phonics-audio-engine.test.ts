import { describe, expect, it } from "vitest";
import {
  buildCvcBlendQueue,
  validateAllCvcWordAudio,
} from "@/lib/phonics-audio-engine";
import { getCvcWordEntry, getCvcWordsByLevel } from "@workspace/phonics-sounds";

describe("phonics-audio-engine", () => {
  it("buildCvcBlendQueue produces phoneme then word steps without loops", () => {
    const cat = getCvcWordEntry("cat")!;
    const steps = buildCvcBlendQueue(cat);
    expect(steps.length).toBe(cat.phonemes.length + 1);
    expect(steps.slice(0, -1).every((s) => s.kind === "phoneme")).toBe(true);
    expect(steps.at(-1)?.kind).toBe("word");
    expect(steps.at(-1)?.audioKey).toBe("cat");
    const phonemeKeys = steps.slice(0, -1).map((s) => s.audioKey);
    expect(new Set(phonemeKeys).size).toBe(phonemeKeys.length);
  });

  it("level 1 and level 2 word sets differ", () => {
    const l1 = getCvcWordsByLevel(1).map((w) => w.word).sort().join(",");
    const l2 = getCvcWordsByLevel(2).map((w) => w.word).sort().join(",");
    expect(l1).not.toBe(l2);
  });

  it("validateAllCvcWordAudio reports structure for every unique word", () => {
    const result = validateAllCvcWordAudio();
    expect(result.words.length).toBeGreaterThan(0);
    for (const w of result.words) {
      expect(w).toHaveProperty("wordAudio");
      expect(w).toHaveProperty("phonemeAudio");
      expect(w).toHaveProperty("blendAudio");
    }
  });
});
