import { afterEach, describe, expect, it } from "vitest";
import {
  advanceDailySession,
  buildSessionPlan,
  clearDailySession,
  defaultDailySessionState,
  isSessionCompleteToday,
  isSessionInProgress,
  localDateKey,
  primarySessionCta,
  saveDailySession,
  startDailySession,
} from "./daily-session";

describe("daily session engine", () => {
  const childId = 9090;

  afterEach(() => {
    clearDailySession(childId);
  });

  it("starts with Start Today and resumes with Continue Today's Adventure", () => {
    const fresh = defaultDailySessionState(childId, {
      grapheme: "s",
      letterGroupIndex: 1,
      focusWord: "sat",
      practiceWords: ["sat", "sit", "pat"],
    });
    expect(primarySessionCta(fresh).label).toBe("Start Today");
    expect(isSessionInProgress(fresh)).toBe(false);

    const started = startDailySession(fresh);
    expect(started.phase).toBe("lesson");
    expect(started.active).toBe(true);
    saveDailySession(childId, { ...started, active: false });
    expect(primarySessionCta({ ...started, active: false }).label).toBe(
      "Continue Today's Adventure",
    );
  });

  it("guides lesson → words → coach → story → complete", () => {
    let state = startDailySession(
      defaultDailySessionState(childId, {
        grapheme: "a",
        letterGroupIndex: 1,
        focusWord: "sat",
        practiceWords: ["sat", "pat", "tap"],
      }),
    );
    expect(state.phase).toBe("lesson");
    state = advanceDailySession(state, { lessonCompleted: true, soundsLearned: 1 });
    expect(state.phase).toBe("words");
    state = advanceDailySession(state, {
      wordsCompleted: ["sat", "pat", "tap"],
    });
    expect(state.phase).toBe("coach");
    state = advanceDailySession(state, { coachCompleted: true });
    expect(state.phase).toBe("story");
    state = advanceDailySession(state, { storyCompleted: true });
    expect(state.phase).toBe("complete");
    expect(isSessionCompleteToday(state)).toBe(true);
    expect(primarySessionCta(state).label).toBe("Done for today");
  });

  it("builds today's plan checklist", () => {
    const state = startDailySession(
      defaultDailySessionState(childId, {
        grapheme: "t",
        letterGroupIndex: 1,
        focusWord: "tap",
        practiceWords: ["tap", "pat", "sat"],
      }),
    );
    const plan = buildSessionPlan(state);
    expect(plan).toHaveLength(4);
    expect(plan[0]?.label).toContain("sound");
    expect(plan.every((p) => typeof p.done === "boolean")).toBe(true);
  });

  it("resets on a new calendar day", () => {
    const yesterday = defaultDailySessionState(childId, {
      grapheme: "s",
      letterGroupIndex: 1,
      focusWord: "sat",
      practiceWords: ["sat"],
      dateKey: "2020-01-01",
    });
    const advanced = advanceDailySession(startDailySession(yesterday), {
      lessonCompleted: true,
    });
    expect(advanced.dateKey).toBe("2020-01-01");
    expect(advanced.dateKey === localDateKey()).toBe(false);
    expect(isSessionCompleteToday(advanced)).toBe(false);
  });
});
