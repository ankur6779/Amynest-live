/**
 * Daily Kids Activity wrong-child keying — Parent Hub sibling switches must not
 * overwrite child B's done/saved origami/activity ids with child A's in-memory sets.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("DailyKidsActivity child-switch keying", () => {
  it("Parent Hub remounts DailyKidsActivity per effectiveChild.id", () => {
    const src = readFileSync(
      resolve(__dirname, "../pages/parenting-hub.tsx"),
      "utf8",
    );
    expect(src).toMatch(
      /<DailyKidsActivity\s+[^>]*key=\{effectiveChild\.id\}/,
    );
  });

  it("DailyKidsActivity reloads done/saved state when childName/key changes", () => {
    const src = readFileSync(
      resolve(__dirname, "./daily-kids-activity.tsx"),
      "utf8",
    );
    expect(src).toMatch(/setDone\(new Set\(p\.doneIds \?\? \[\]\)\)/);
    expect(src).toMatch(/\}, \[childName, key\]\)/);
  });
});
