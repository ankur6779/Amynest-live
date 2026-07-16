import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LESSONS } from "@workspace/audio-lessons";
import { normalizeStaticAudioKey } from "./normalize.js";
import type { StaticAudioMap } from "./types.js";

const MAP_PATH = resolve(
  import.meta.dirname,
  "../../../artifacts/kidschedule/src/data/static-audio-map.json",
);

function loadMap(): StaticAudioMap {
  return JSON.parse(readFileSync(MAP_PATH, "utf8")) as StaticAudioMap;
}

describe("lesson static audio catalog coverage", () => {
  const map = loadMap();
  const missing: Array<{ lessonId: string; paragraphIdx: number; key: string; text: string }> =
    [];

  for (const lesson of LESSONS) {
    lesson.paragraphs.en.forEach((para, paragraphIdx) => {
      const text = para.trim();
      if (!text) return;
      const key = normalizeStaticAudioKey(text);
      const url = map.default[key];
      if (!url || !url.includes("/api/static-audio/")) {
        missing.push({ lessonId: lesson.id, paragraphIdx, key, text });
      }
    });
  }

  it("every lesson paragraph resolves in static-audio-map.json", () => {
    if (missing.length > 0) {
      const preview = missing
        .slice(0, 8)
        .map(
          (m) =>
            `${m.lessonId}[${m.paragraphIdx}] key=${m.key.slice(0, 60)}…`,
        )
        .join("\n");
      expect(missing, `Missing ${missing.length} lesson entries:\n${preview}`).toEqual([]);
    }
    expect(missing).toEqual([]);
  });

  it("early-school-bullying paragraph 1 hits catalog", () => {
    const lesson = LESSONS.find((l) => l.id === "early-school-bullying");
    expect(lesson).toBeDefined();
    const text = lesson!.paragraphs.en[1]!.trim();
    const key = normalizeStaticAudioKey(text);
    expect(map.default[key]).toBe("/api/static-audio/4df9e01b8d07bd9228cc592cf4d09aa8.mp3");
  });
});
