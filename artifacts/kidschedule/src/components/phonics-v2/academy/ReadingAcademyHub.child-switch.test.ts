/**
 * Reading Academy wrong-child keying — sibling phonics switches must not
 * overwrite child B's academy progress with child A's in-memory books/fluency.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  loadAcademyProgress,
  saveAcademyProgress,
  type ReadingAcademyProgress,
} from "@/lib/phonics-v3/reading-academy-progress";

const CHILD_A = 21;
const CHILD_B = 22;

function seeded(overrides: Partial<ReadingAcademyProgress> = {}): ReadingAcademyProgress {
  return {
    version: 1,
    completedBookIds: ["sam-sat"],
    bookCompletedAt: { "sam-sat": 1 },
    comprehensionScores: [90],
    sentencesRead: 12,
    lastBookId: "sam-sat",
    ...overrides,
  };
}

describe("Reading Academy child-switch keying", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("PhonicsV2 remounts ReadingAcademyHub per childId", () => {
    const src = readFileSync(
      resolve(__dirname, "../PhonicsV2.tsx"),
      "utf8",
    );
    expect(src).toMatch(/<ReadingAcademyHub\s+[^>]*key=\{childId\}/);
  });

  it("ReadingAcademyHub reloads progress when childId changes", () => {
    const src = readFileSync(
      resolve(__dirname, "./ReadingAcademyHub.tsx"),
      "utf8",
    );
    expect(src).toMatch(/setProgress\(loadAcademyProgress\(childId\)\)/);
    expect(src).toMatch(/\}, \[childId\]\)/);
  });

  it("saving under the active child after reload keeps sibling academy progress isolated", () => {
    saveAcademyProgress(CHILD_A, seeded({ sentencesRead: 40 }));
    saveAcademyProgress(
      CHILD_B,
      seeded({
        completedBookIds: ["pat-sat"],
        bookCompletedAt: { "pat-sat": 2 },
        comprehensionScores: [70],
        sentencesRead: 5,
        lastBookId: "pat-sat",
      }),
    );

    const nextB = {
      ...loadAcademyProgress(CHILD_B),
      sentencesRead: 6,
    };
    saveAcademyProgress(CHILD_B, nextB);

    expect(loadAcademyProgress(CHILD_A).sentencesRead).toBe(40);
    expect(loadAcademyProgress(CHILD_A).completedBookIds).toEqual(["sam-sat"]);
    expect(loadAcademyProgress(CHILD_B).sentencesRead).toBe(6);
    expect(loadAcademyProgress(CHILD_B).completedBookIds).toEqual(["pat-sat"]);
  });
});
