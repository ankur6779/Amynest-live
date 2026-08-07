import { describe, expect, it } from "vitest";
import type { FirstExperienceContinuity } from "@/lib/first-experience/continuity";
import { resolveTodayNrt } from "./resolve-today-nrt";

const continuity = {
  version: 1 as const,
  childName: "Aria",
  ageBand: "2-4" as const,
  todayContext: "home" as const,
  nextThing: {
    id: "fe-nrt",
    title: "One short calm game with Aria",
    detail: "Five minutes, no screens.",
    minutes: 5,
    basedOn: ["It’s Monday.", "Aria is in the 2-4 stage."],
  },
  completedAt: null,
  valueEarned: true,
  completionKind: null,
  emotionalContext: "Today feels unhurried.",
  source: "first-experience" as const,
  savedAt: new Date().toISOString(),
} satisfies FirstExperienceContinuity;

describe("resolveTodayNrt", () => {
  it("prefers the next incomplete routine item (execution truth)", () => {
    const decision = resolveTodayNrt({
      child: { id: 1, name: "Aria", age: 3 },
      todayRoutineItems: [
        {
          time: "9:00 AM",
          activity: "Breakfast together",
          status: "completed",
          duration: 20,
          routineId: 9,
        },
        {
          time: "10:00 AM",
          activity: "Outdoor sensory play",
          status: "pending",
          duration: 15,
          routineId: 9,
        },
      ],
      continuity,
    });
    expect(decision.source).toBe("routine_next");
    expect(decision.title).toBe("Outdoor sensory play");
    expect(decision.cta.kind).toBe("begin_routine");
    expect(decision.cta.label).toBe("Begin");
    expect(decision.cta.routineId).toBe(9);
    expect(decision.lawPassed).toBe(true);
  });

  it("uses continuity when no routine items exist", () => {
    const decision = resolveTodayNrt({
      child: { id: 1, name: "Aria", age: 3 },
      todayRoutineItems: [],
      continuity,
    });
    expect(decision.source).toBe("continuity");
    expect(decision.title).toContain("Aria");
    expect(decision.why).toMatch(/unhurried|Monday|2-4/i);
    expect(decision.cta.kind).toBe("generate");
    expect(decision.lawPassed).toBe(true);
  });

  it("marks day complete without asking the parent to choose", () => {
    const decision = resolveTodayNrt({
      child: { id: 1, name: "Aria", age: 3 },
      todayRoutineItems: [
        {
          time: "8:00 AM",
          activity: "Wake",
          status: "completed",
          routineId: 2,
        },
      ],
      continuity: null,
    });
    expect(decision.source).toBe("day_complete");
    expect(decision.cta.kind).toBe("rest");
    expect(decision.lawPassed).toBe(true);
  });

  it("falls back to decide-next preview without continuity", () => {
    const decision = resolveTodayNrt({
      child: { id: 2, name: "Leo", age: 6, educationStage: "school" },
      todayRoutineItems: [],
      continuity: null,
      now: new Date("2026-08-07T09:00:00"),
    });
    expect(decision.source).toBe("decide_next");
    expect(decision.title.length).toBeGreaterThan(3);
    expect(decision.cta.label).toBe("Begin");
    expect(decision.lawPassed).toBe(true);
  });
});
