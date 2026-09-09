import { afterEach, describe, expect, it } from "vitest";
import {
  clearFirstExperienceState,
  hasGuestPlanBlocks,
  loadFirstExperienceState,
  saveFirstExperienceState,
} from "./storage";
import { decideFirstExperienceNextThing } from "./decide-next";

describe("guest plan persistence", () => {
  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    clearFirstExperienceState();
  });

  it("keeps a 4–6 block plan after sessionStorage is cleared", () => {
    const nextThing = decideFirstExperienceNextThing({
      childName: "Noah",
      ageBand: "5-7",
      todayContext: "school",
      now: new Date("2026-08-06T07:15:00"),
    });
    saveFirstExperienceState({
      version: 1,
      step: "plan-home",
      childName: "Noah",
      ageBand: "5-7",
      todayContext: "school",
      nextThing,
      completedAt: null,
      valueEarned: true,
      completionKind: "later",
      startedAt: new Date().toISOString(),
      activeBlockIndex: 0,
    });
    sessionStorage.clear();
    const restored = loadFirstExperienceState();
    expect(restored.childName).toBe("Noah");
    expect(restored.nextThing?.title.toLowerCase()).toContain("noah");
    expect(restored.nextThing?.blocks.length).toBeGreaterThanOrEqual(4);
    expect(hasGuestPlanBlocks()).toBe(true);
  });
});
