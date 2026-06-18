import { beforeAll, describe, expect, it } from "vitest";
import { getCvcWordEntry } from "@workspace/phonics-sounds";
import { preloadPhonicsBundledManifest } from "@/lib/phonics-bundled-manifest";
import {
  checkPhonicsLetterClip,
  checkPhonicsWordClip,
  checkPhonicsContentClip,
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

  describe("manifest-backed decodable sentences", () => {
    beforeAll(async () => {
      await preloadPhonicsBundledManifest();
    });

    it("resolves decodable story sentences from bundled manifest beyond core catalog", () => {
      const samSat = checkPhonicsContentClip("Sam sat.", "sentence");
      expect(samSat.available).toBe(true);
      expect(samSat.catalogKey).toBe("sentence:sam_sat");
    });
  });
});
