import { describe, expect, it } from "vitest";
import {
  defaultFamilyProgress,
  recordFamilyWordPractice,
} from "./family-progress";

describe("family-progress", () => {
  it("starts families as not_started", () => {
    const p = defaultFamilyProgress();
    expect(p.at.status).toBe("not_started");
  });

  it("moves to practicing after first word", () => {
    const p = recordFamilyWordPractice(defaultFamilyProgress(), "at", "cat");
    expect(p.at.status).toBe("practicing");
    expect(p.at.wordsPracticed).toContain("cat");
  });

  it("awards badge when all family words mastered", () => {
    let p = defaultFamilyProgress();
    for (const w of ["cat", "bat", "hat", "mat", "rat"]) {
      p = recordFamilyWordPractice(p, "at", w, true);
    }
    expect(p.at.status).toBe("mastered");
    expect(p.at.badgeEarned).toBe(true);
  });
});
