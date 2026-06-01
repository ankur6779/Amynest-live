import { describe, expect, it } from "vitest";
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import {
  checkPhonicsLetterClip,
  checkPhonicsWordClip,
  validatePhonicsWordAudio,
} from "@/lib/phonics-audio-availability";

describe("phonics-audio-availability", () => {
  it("treats static-catalog CVC words as available even without library manifest", () => {
    const shop = checkPhonicsWordClip("shop");
    expect(shop.available).toBe(true);
    expect(shop.catalogKey).toBe("static:shop");
  });

  it("treats static-catalog digraph keys as available", () => {
    const sh = checkPhonicsLetterClip("sh");
    expect(sh.available).toBe(true);
  });

  it("marks words missing from both library and static catalog unavailable", () => {
    const missing = checkPhonicsWordClip("zzqxnotaword");
    expect(missing.available).toBe(false);
  });

  it("validatePhonicsWordAudio resolves IPA CVC phonemes to letter clip keys", () => {
    const entry = getCvcWordEntry("cat");
    expect(entry).toBeDefined();
    expect(checkPhonicsLetterClip("æ").available).toBe(false);
    const bundle = validatePhonicsWordAudio(entry!.word, entry!.phonemes);
    expect(bundle.available).toBe(true);
    expect(bundle.wordAudio).toBe(true);
    expect(bundle.phonemeAudio).toEqual([true, true, true]);
  });
});
