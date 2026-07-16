import { describe, expect, it } from "vitest";
import {
  READING_LESSON_STEPS,
  advanceLessonStep,
  buildLetterIdOptions,
  buildLessonTarget,
  buildSegmentChoices,
  buildSoundPositionOptions,
  canUnlockNextLetterGroup,
  createLessonState,
  currentStep,
  lessonProgressPct,
  pickNextLessonGrapheme,
} from "./reading-lesson-engine";

describe("reading-lesson-engine", () => {
  it("defines the full 10-step Synthetic Phonics sequence", () => {
    expect(READING_LESSON_STEPS).toHaveLength(10);
    expect(READING_LESSON_STEPS.map((s) => s.id)).toEqual([
      "hear",
      "mouth",
      "repeat",
      "letter_id",
      "trace",
      "find_sound",
      "beginning",
      "ending",
      "build_word",
      "read_independent",
    ]);
  });

  it("builds a Group 1 lesson that focuses on an early blend word", () => {
    const target = buildLessonTarget("s", 1);
    expect(target.grapheme).toBe("s");
    expect(target.letterGroupIndex).toBe(1);
    expect(["sat", "sit", "sip"].some((w) => w === target.focusWord || target.practiceWords.includes(w))).toBe(
      true,
    );
  });

  it("advances steps and awards stars on completion", () => {
    let state = createLessonState(buildLessonTarget("s", 1));
    expect(currentStep(state).id).toBe("hear");
    for (let i = 0; i < READING_LESSON_STEPS.length; i++) {
      state = advanceLessonStep(state, { correct: true, attempts: 1 });
    }
    expect(state.complete).toBe(true);
    expect(state.starsEarned).toBe(3);
    expect(lessonProgressPct(state)).toBe(100);
  });

  it("builds beginning-sound options with one target", () => {
    const opts = buildSoundPositionOptions("s", "beginning", ["sat", "pin", "tap", "pan"], 2);
    expect(opts.filter((o) => o.isTarget)).toHaveLength(1);
    expect(opts.length).toBeGreaterThanOrEqual(2);
    const target = opts.find((o) => o.isTarget)!;
    expect(target.word.startsWith("s")).toBe(true);
  });

  it("builds letter-id options including the target", () => {
    const opts = buildLetterIdOptions("t", 3);
    expect(opts.some((o) => o.isTarget && o.letter === "t")).toBe(true);
  });

  it("builds segment choices for CVC words", () => {
    const seg = buildSegmentChoices("sat");
    expect(seg.displayLetters).toEqual(["s", "a", "t"]);
    expect(seg.distractors.length).toBeGreaterThan(0);
  });

  it("picks the next unfinished grapheme in the current SATPIN group", () => {
    expect(pickNextLessonGrapheme(1, [])).toBe("s");
    expect(pickNextLessonGrapheme(1, ["s", "a"])).toBe("t");
  });

  it("gates next group on blending and reading readiness", () => {
    expect(
      canUnlockNextLetterGroup({
        letterGroupIndex: 1,
        skillScores: {
          letter_recognition: 80,
          beginning_sounds: 70,
        },
        blendingAccuracy: 80,
        readingAccuracy: 70,
      }).ok,
    ).toBe(true);
    expect(
      canUnlockNextLetterGroup({
        letterGroupIndex: 1,
        skillScores: {
          letter_recognition: 40,
          beginning_sounds: 70,
        },
        blendingAccuracy: 80,
        readingAccuracy: 70,
      }).ok,
    ).toBe(false);
  });
});
