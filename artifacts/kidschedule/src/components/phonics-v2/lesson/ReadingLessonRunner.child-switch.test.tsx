/**
 * Phonics lesson resume wipe — sibling child-switch must not overwrite
 * child B's amynest:phonics-lesson-resume:{B} with child A's mid-lesson state.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import { ReadingLessonRunner } from "./ReadingLessonRunner";
import {
  advanceLessonStep,
  buildLessonTarget,
  createLessonState,
} from "@/lib/phonics-v3/reading-lesson-engine";
import {
  loadLessonResume,
  saveLessonResume,
} from "@/lib/phonics-v3/lesson-resume";

const CHILD_A = 101;
const CHILD_B = 202;

describe("ReadingLessonRunner child-switch resume isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not write A's mid-lesson state under B when childId flips", () => {
    const targetS = buildLessonTarget("s", 1);
    const targetA = buildLessonTarget("a", 1);

    let aState = createLessonState(targetS);
    aState = advanceLessonStep(aState, { correct: true, attempts: 1 });
    aState = advanceLessonStep(aState, { correct: true, attempts: 1 });
    aState = advanceLessonStep(aState, { correct: true, attempts: 1 });
    saveLessonResume(CHILD_A, aState);

    let bState = createLessonState(targetA);
    bState = advanceLessonStep(bState, { correct: true, attempts: 1 });
    bState = advanceLessonStep(bState, { correct: true, attempts: 1 });
    bState = advanceLessonStep(bState, { correct: true, attempts: 1 });
    bState = advanceLessonStep(bState, { correct: true, attempts: 1 });
    bState = advanceLessonStep(bState, { correct: true, attempts: 1 });
    saveLessonResume(CHILD_B, bState);

    expect(loadLessonResume(CHILD_B)?.stepIndex).toBe(5);
    expect(loadLessonResume(CHILD_B)?.grapheme).toBe("a");

    const onComplete = () => {};
    const { rerender, unmount } = render(
      <ReadingLessonRunner
        grapheme="s"
        letterGroupIndex={1}
        childId={CHILD_A}
        childName="Ava"
        onComplete={onComplete}
      />,
    );

    // Sibling chip → B while this runner is still mounted (pre-parent teardown).
    act(() => {
      rerender(
        <ReadingLessonRunner
          grapheme="s"
          letterGroupIndex={1}
          childId={CHILD_B}
          childName="Ben"
          onComplete={onComplete}
        />,
      );
    });

    const bAfter = loadLessonResume(CHILD_B);
    expect(bAfter?.grapheme).toBe("a");
    expect(bAfter?.stepIndex).toBe(5);
    expect(loadLessonResume(CHILD_A)?.stepIndex).toBe(3);

    unmount();
  });

  it("PhonicsV2 resets child-scoped session in useLayoutEffect before persist", () => {
    const src = readFileSync(resolve(__dirname, "../PhonicsV2.tsx"), "utf8");
    expect(src).toMatch(/useLayoutEffect\(\(\)\s*=>\s*\{/);
    expect(src).toMatch(/setDailySession\(null\)/);
    expect(src).toMatch(
      /\/\/ useLayoutEffect so dailySession\/sessionActive clear before child runners/,
    );
  });

  it("ReadingLessonRunner guards persist against mountedForChildIdRef mismatch", () => {
    const src = readFileSync(resolve(__dirname, "./ReadingLessonRunner.tsx"), "utf8");
    expect(src).toMatch(/mountedForChildIdRef/);
    expect(src).toMatch(
      /if \(childId !== mountedForChildIdRef\.current\) return;/,
    );
  });
});
