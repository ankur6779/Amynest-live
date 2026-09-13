import { describe, expect, it } from "vitest";
import {
  childHasTodayRoutine,
  isExactChildDateRoutine,
  isExecutableTodayRoutine,
  persistedRoutineLocalDate,
  shouldAutoBuildTodayPlan,
} from "./today-plan";

describe("today plan date contract", () => {
  const today = "2026-09-13";
  const stale = { id: 70, childId: 1, date: "2026-08-09", items: [{ activity: "old" }] };
  const exact = { id: 91, childId: 1, date: today, items: [{ activity: "now" }] };
  const sibling = { id: 92, childId: 2, date: today, items: [{ activity: "sib" }] };

  it("rejects a stale API routine as not today", () => {
    expect(isExactChildDateRoutine(stale, 1, today)).toBe(false);
    expect(isExecutableTodayRoutine(stale, 1, today)).toBe(false);
    expect(childHasTodayRoutine([stale], 1, today)).toBe(false);
  });

  it("accepts the exact local date for the requested child", () => {
    expect(isExactChildDateRoutine(exact, 1, today)).toBe(true);
    expect(isExecutableTodayRoutine(exact, 1, today)).toBe(true);
    expect(childHasTodayRoutine([exact], 1, today)).toBe(true);
  });

  it("rejects the right date on the wrong child", () => {
    expect(isExactChildDateRoutine(sibling, 1, today)).toBe(false);
    expect(childHasTodayRoutine([sibling], 1, today)).toBe(false);
    expect(childHasTodayRoutine([sibling], 2, today)).toBe(true);
  });

  it("does not treat a sibling today plan as this child's plan", () => {
    expect(childHasTodayRoutine([exact, sibling], 2, today)).toBe(true);
    expect(childHasTodayRoutine([exact, sibling], 1, today)).toBe(true);
    expect(childHasTodayRoutine([{ id: 2, childId: 11, date: "2026-09-12" }], 11, today)).toBe(
      false,
    );
  });

  it("treats any today plan as enough when no child is selected", () => {
    expect(childHasTodayRoutine([exact], null, today)).toBe(true);
  });

  it("never treats a null-childId historical row as this child's today plan", () => {
    expect(
      childHasTodayRoutine([{ id: 3, childId: undefined, date: today }], 1, today),
    ).toBe(false);
  });

  it("reads YYYY-MM-DD from persisted date, not a rewritten label", () => {
    expect(persistedRoutineLocalDate({ date: "2026-08-09T00:00:00.000Z" })).toBe("2026-08-09");
    expect(persistedRoutineLocalDate({ routineDate: "2026-09-13" })).toBe("2026-09-13");
  });
});

describe("shouldAutoBuildTodayPlan", () => {
  it("builds when this child has no plan and generate is not locked", () => {
    expect(
      shouldAutoBuildTodayPlan({
        hasTodayRoutine: false,
        generateLocked: false,
        bypassPaywall: false,
        forced: false,
      }),
    ).toBe(true);
  });

  it("skips locked returning users unless retry is forced", () => {
    expect(
      shouldAutoBuildTodayPlan({
        hasTodayRoutine: false,
        generateLocked: true,
        bypassPaywall: false,
        forced: false,
      }),
    ).toBe(false);
    expect(
      shouldAutoBuildTodayPlan({
        hasTodayRoutine: false,
        generateLocked: true,
        bypassPaywall: false,
        forced: true,
      }),
    ).toBe(true);
  });

  it("never builds when today's plan is already present", () => {
    expect(
      shouldAutoBuildTodayPlan({
        hasTodayRoutine: true,
        generateLocked: false,
        bypassPaywall: true,
        forced: true,
      }),
    ).toBe(false);
  });
});
