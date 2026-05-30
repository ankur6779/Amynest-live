import { describe, expect, it } from "vitest";
import {
  PHONICS_MANIFEST_MIN_ASSETS,
  validatePhonicsManifest,
} from "@/lib/phonics-manifest-validation";
import type { PhonicsAudioLibraryManifest } from "@workspace/phonics-sounds";

describe("validatePhonicsManifest", () => {
  it("passes for the shipped manifest", () => {
    const result = validatePhonicsManifest();
    expect(result.ok).toBe(true);
    expect(result.assetCount).toBeGreaterThanOrEqual(PHONICS_MANIFEST_MIN_ASSETS);
    expect(result.missingUrlCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when assets are missing gcsPath", () => {
    const bad: PhonicsAudioLibraryManifest = {
      version: 1,
      libraryVersion: 1,
      generatedAt: "",
      bucket: "b",
      baseUrl: "https://example.com",
      voiceId: "v",
      modelId: "m",
      assetCount: 1,
      assets: {
        "letter:a": {
          id: "a",
          type: "letter",
          text: "a",
          gcsPath: "",
          url: "https://storage.googleapis.com/b/phonics/letters/a.mp3",
          version: 1,
        },
      },
    };
    const result = validatePhonicsManifest(bad);
    expect(result.ok).toBe(false);
    expect(result.missingUrlCount).toBe(1);
  });

  it("fails when asset count is below minimum", () => {
    const sparse: PhonicsAudioLibraryManifest = {
      version: 1,
      libraryVersion: 1,
      generatedAt: "",
      bucket: "b",
      baseUrl: "https://example.com",
      voiceId: "v",
      modelId: "m",
      assetCount: 2,
      assets: {
        "letter:a": {
          id: "a",
          type: "letter",
          text: "a",
          gcsPath: "phonics/letters/a.mp3",
          url: "https://storage.googleapis.com/b/phonics/letters/a.mp3",
          version: 1,
        },
      },
    };
    const result = validatePhonicsManifest(sparse);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("asset_count_below_min"))).toBe(true);
  });
});
