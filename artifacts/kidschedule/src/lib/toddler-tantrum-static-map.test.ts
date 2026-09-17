import { describe, expect, it } from "vitest";
import { getLessonById, getSeriesById, partIndexForLesson } from "@workspace/audio-lessons";
import { normalizeStaticAudioKey } from "@workspace/static-audio/browser";
import map from "@/data/static-audio-map.json";

const EXPECTED_HASHES = [
  "7dfdc091a7f21e1bcef11082a8731cd6",
  "5ab7ad0073bdfdb3a5659a29f9c5f366",
  "9eec334de10474d30d7f60440145f45f",
  "2c7dafca84f9847d6e0b67eb66355c04",
  "548a7b30726379cb54cb7404ed6cead4",
] as const;

describe("toddler-tantrums-101 GCS catalog mapping", () => {
  const lesson = getLessonById("toddler-tantrums-101");
  const series = getSeriesById("toddler-tantrums");

  it("is part 1 of Tantrums & Boundaries", () => {
    expect(lesson?.id).toBe("toddler-tantrums-101");
    expect(series?.title.en).toBe("Tantrums & Boundaries");
    expect(partIndexForLesson(series!, lesson!.id)).toBe(0);
  });

  it("maps every paragraph to the existing GCS static-audio object", () => {
    const paragraphs = lesson?.paragraphs.en ?? [];
    expect(paragraphs.length).toBe(5);
    for (const [idx, text] of paragraphs.entries()) {
      const normalized = normalizeStaticAudioKey(text);
      const url = (map.default as Record<string, string>)[normalized];
      expect(url, `P${idx} map miss`).toBe(`/api/static-audio/${EXPECTED_HASHES[idx]}.mp3`);
    }
  });
});
