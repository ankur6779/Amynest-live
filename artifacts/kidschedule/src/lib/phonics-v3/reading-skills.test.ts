import { describe, expect, it } from "vitest";
import {
  defaultReadingSkillsState,
  fluencyLabel,
  getWeakSkills,
  recordLessonSkills,
  recordSkillAttempt,
} from "./reading-skills";

describe("reading-skills", () => {
  it("records skill attempts with EMA scoring", () => {
    let state = defaultReadingSkillsState();
    state = recordSkillAttempt(state, "blending", true);
    state = recordSkillAttempt(state, "blending", true);
    expect(state.skills.blending.score).toBeGreaterThan(0);
    expect(state.skills.blending.attempts).toBe(2);
  });

  it("awards badges after reading multiple words", () => {
    let state = defaultReadingSkillsState();
    const results = [
      { stepId: "hear", correct: true },
      { stepId: "build_word", correct: true },
      { stepId: "read_independent", correct: true },
    ];
    for (const w of ["sat", "sit", "pin", "pan", "tap"]) {
      state = recordLessonSkills(state, results, 2, w);
    }
    expect(state.wordsRead.length).toBe(5);
    expect(state.badges).toContain("first_five_words");
    expect(state.readingStars).toBe(10);
  });

  it("surfaces weak skills for adaptive practice", () => {
    let state = defaultReadingSkillsState();
    state = recordSkillAttempt(state, "blending", true);
    state = recordSkillAttempt(state, "blending", true);
    state = recordSkillAttempt(state, "segmenting", false);
    state = recordSkillAttempt(state, "segmenting", false);
    const weak = getWeakSkills(state, 2);
    expect(weak[0]).toBe("segmenting");
  });

  it("labels fluency bands", () => {
    expect(fluencyLabel(85)).toBe("Confident");
    expect(fluencyLabel(65)).toBe("Developing");
    expect(fluencyLabel(40)).toBe("Emerging");
  });
});
