import { describe, expect, it } from "vitest";
import { childHasTodayRoutine, shouldAutoBuildTodayPlan } from "./today-plan";

describe("childHasTodayRoutine", () => {
  const today = "2026-09-13";
  const rows = [
    { id: 1, childId: 10, date: today },
    { id: 2, childId: 11, date: "2026-09-12" },
  ];

  it("does not treat a sibling's today plan as this child's plan", () => {
    expect(childHasTodayRoutine(rows, 11, today)).toBe(false);
    expect(childHasTodayRoutine(rows, 10, today)).toBe(true);
  });

  it("treats any today plan as enough when no child is selected", () => {
    expect(childHasTodayRoutine(rows, null, today)).toBe(true);
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
