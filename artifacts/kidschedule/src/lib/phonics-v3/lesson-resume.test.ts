import { afterEach, describe, expect, it } from "vitest";
import {
  applyResumeToState,
  clearLessonResume,
  loadLessonResume,
  resumeMatchesTarget,
  saveLessonResume,
} from "./lesson-resume";
import {
  buildLessonTarget,
  createLessonState,
  advanceLessonStep,
} from "./reading-lesson-engine";

describe("lesson resume", () => {
  const childId = 4242;

  afterEach(() => {
    clearLessonResume(childId);
  });

  it("persists and restores mid-lesson step index", () => {
    const target = buildLessonTarget("s", 1);
    let state = createLessonState(target);
    state = advanceLessonStep(state, { correct: true, attempts: 1 });
    state = advanceLessonStep(state, { correct: true, attempts: 1 });
    saveLessonResume(childId, state);

    const snap = loadLessonResume(childId);
    expect(snap?.stepIndex).toBe(2);
    expect(snap?.grapheme).toBe("s");
    expect(resumeMatchesTarget(snap, target)).toBe(true);

    const restored = applyResumeToState(target, snap);
    expect(restored.stepIndex).toBe(2);
    expect(restored.results).toHaveLength(2);
  });

  it("clears resume on complete", () => {
    const target = buildLessonTarget("a", 1);
    const state = { ...createLessonState(target), stepIndex: 4 };
    saveLessonResume(childId, state);
    expect(loadLessonResume(childId)).toBeTruthy();
    saveLessonResume(childId, { ...state, complete: true });
    expect(loadLessonResume(childId)).toBeNull();
  });

  it("does not apply resume for a different grapheme", () => {
    const targetS = buildLessonTarget("s", 1);
    const targetA = buildLessonTarget("a", 1);
    const state = advanceLessonStep(createLessonState(targetS), {
      correct: true,
      attempts: 1,
    });
    saveLessonResume(childId, state);
    const snap = loadLessonResume(childId);
    expect(resumeMatchesTarget(snap, targetA)).toBe(false);
    expect(applyResumeToState(targetA, snap).stepIndex).toBe(0);
  });
});
