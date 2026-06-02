import { describe, expect, it } from "vitest";
import {
  buildSpellingSessionPrewarmItems,
  lookupSpellingAudioUrl,
  resolveSpellingAudioUrlWithFallback,
} from "@/lib/spelling-audio-map";
import { isSpellingLibraryProxyUrl } from "@/lib/static-audio-guard";

describe("spelling audio manifest", () => {
  it("resolves catalog word to static-audio proxy when available", () => {
    const url = lookupSpellingAudioUrl("cat", "2-4:easy:cat");
    expect(url).toBeTruthy();
    expect(url).toContain("/api/static-audio/");
  });

  it("prefers static catalog for words like cake when spelling GCS clip is missing", () => {
    const url = lookupSpellingAudioUrl("cake", "2-4:medium:cake");
    expect(url).toBeTruthy();
    expect(url).toContain("/api/static-audio/");
  });

  it("falls back when primary entry missing", () => {
    const url = resolveSpellingAudioUrlWithFallback("not-a-real-word-xyz", "fake:id");
    expect(url).toBeTruthy();
    expect(isSpellingLibraryProxyUrl(url!)).toBe(true);
  });

  it("prewarms current word plus next 3", () => {
    const words = [
      { id: "2-4:easy:cat", word: "cat" },
      { id: "2-4:easy:dog", word: "dog" },
      { id: "2-4:easy:sun", word: "sun" },
      { id: "2-4:easy:hat", word: "hat" },
      { id: "2-4:easy:run", word: "run" },
    ];
    const items = buildSpellingSessionPrewarmItems(words, 0, 3);
    expect(items.length).toBe(4);
    expect(items[0]?.word).toBe("cat");
    expect(items[3]?.word).toBe("hat");
  });
});
