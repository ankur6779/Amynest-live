/**
 * Daily Story Studio wrong-child keying — Parent Hub sibling switches must not
 * overwrite child B's story progress/streak with child A's in-memory maps.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("DailyStorySection child-switch keying", () => {
  it("Parent Hub remounts DailyStorySection per effectiveChild.id", () => {
    const src = readFileSync(
      resolve(__dirname, "../pages/parenting-hub.tsx"),
      "utf8",
    );
    expect(src).toMatch(
      /<DailyStorySection\s+[^>]*key=\{effectiveChild\.id\}/,
    );
  });

  it("DailyStorySection reloads progress and clears story session on child change", () => {
    const src = readFileSync(
      resolve(__dirname, "./daily-story-section.tsx"),
      "utf8",
    );
    expect(src).toMatch(/setProgress\(readProgressForKey\(progressKey\)\)/);
    expect(src).toMatch(/storySessionRef\.current = null/);
    expect(src).toMatch(/\}, \[childName, childId, progressKey, streakKey\]\)/);
  });
});
