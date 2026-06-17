import { beforeAll, describe, expect, it } from "vitest";
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import {
  checkPhonicsLetterClip,
  checkPhonicsWordClip,
  validatePhonicsWordAudio,
} from "@/lib/phonics-audio-availability";
import { preloadPhonicsBundledManifest } from "@/lib/phonics-bundled-manifest";

describe("phonics-audio-availability", () => {
  beforeAll(async () => {
    await preloadPhonicsBundledManifest();
  });
  it("uses ElevenLabs library manifest for CVC words (not legacy static catalog)", () => {
    const shop = checkPhonicsWordClip("shop");
    expect(shop.available).toBe(true);
    expect(shop.catalogKey).toBe("cvc:shop");
  });

  it("uses ElevenLabs library manifest for digraph letter clips", () => {
    const sh = checkPhonicsLetterClip("sh");
    expect(sh.available).toBe(true);
    expect(sh.catalogKey).toBe("digraph:sh");
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
