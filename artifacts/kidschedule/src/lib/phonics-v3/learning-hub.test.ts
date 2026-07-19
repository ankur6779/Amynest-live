import { describe, expect, it } from "vitest";
import {
  buildHubLessonRows,
  buildLearningHubModel,
  buildPracticeItems,
} from "./learning-hub";
import { defaultReadingPetState } from "./reading-pet";
import type { LessonResumeSnapshot } from "./lesson-resume";

describe("learning hub model", () => {
  it("marks first unfinished grapheme as current and later as upcoming", () => {
    const rows = buildHubLessonRows({
      letterGroupIndex: 1,
      masteredGraphemes: new Set(["s", "a"]),
      focusGrapheme: "t",
    });
    expect(rows[0]?.status).toBe("done");
    expect(rows[1]?.status).toBe("done");
    expect(rows[2]?.status).toBe("current");
    expect(rows[3]?.status).toBe("upcoming");
    expect(rows).toHaveLength(6);
  });

  it("shows Continue when resume exists and Start otherwise — never both", () => {
    const resume: LessonResumeSnapshot = {
      version: 1,
      grapheme: "s",
      letterGroupIndex: 1,
      focusWord: "sat",
      stepIndex: 3,
      results: [],
      starsEarned: 0,
      updatedAt: Date.now(),
    };
    const withResume = buildLearningHubModel({
      childName: "Yuhira",
      letterGroupIndex: 1,
      focusGrapheme: "s",
      masteredGraphemes: new Set(),
      wordsLearned: 0,
      starsEarned: 0,
      resume,
      pet: defaultReadingPetState(),
    });
    expect(withResume.primaryAction).toBe("continue");
    expect(withResume.primaryLabel).toBe("Continue Today's Adventure");
    expect(withResume.hasResume).toBe(true);

    const fresh = buildLearningHubModel({
      childName: "Yuhira",
      letterGroupIndex: 1,
      focusGrapheme: "s",
      masteredGraphemes: new Set(),
      wordsLearned: 0,
      starsEarned: 0,
      resume: null,
      pet: defaultReadingPetState(),
    });
    expect(fresh.primaryAction).toBe("start");
    expect(fresh.primaryLabel).toBe("Start Today");
    expect(fresh.hasResume).toBe(false);
  });

  it("only unlocks practice items when appropriate", () => {
    const locked = buildPracticeItems({
      hasResume: false,
      lessonsCompletedInGroup: 0,
      wordsLearned: 0,
      storiesUnlocked: false,
    });
    expect(locked.find((p) => p.id === "lesson")?.unlocked).toBe(true);
    expect(locked.find((p) => p.id === "reading")?.unlocked).toBe(false);
    expect(locked.find((p) => p.id === "story")?.unlocked).toBe(false);

    const open = buildPracticeItems({
      hasResume: true,
      lessonsCompletedInGroup: 2,
      wordsLearned: 4,
      storiesUnlocked: true,
    });
    expect(open.every((p) => p.unlocked)).toBe(true);
  });

  it("exposes only the next group in upcoming", () => {
    const model = buildLearningHubModel({
      childName: "Yuhira",
      letterGroupIndex: 1,
      focusGrapheme: "s",
      masteredGraphemes: new Set(),
      wordsLearned: 0,
      starsEarned: 0,
      resume: null,
      pet: defaultReadingPetState(),
    });
    expect(model.group.name).toBe("SATPIN");
    expect(model.upcoming?.nextGroupName).toBe("MDGOCK");
    expect(model.upcoming?.nextGroupId).toBe(2);
  });
});
