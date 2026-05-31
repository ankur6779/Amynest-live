import { describe, it, expect } from "vitest";
import { buildCoachWinRationale } from "./coach-win-rationale";

describe("buildCoachWinRationale", () => {
  it("personalizes first win from onboarding answers", () => {
    const text = buildCoachWinRationale({
      goalId: "travel-with-kids",
      goalTitle: "Travel With Kids",
      win: { win: 1, title: "Pause and name what you see", objective: "Calm travel moments" },
      winDeckIndex: 0,
      answers: {
        ageGroup: "5–7 years",
        severity: "Moderate – frequent",
        common_frequency: "Weekly",
        distance: "Long",
        child_behavior: "Restless",
      },
      feedbackByWin: {},
      progressPct: 0,
      isFirstCoachingWin: true,
    });

    expect(text.toLowerCase()).toContain("amy");
    expect(text.toLowerCase()).not.toContain("algorithm");
    expect(text.toLowerCase()).not.toContain("score");
    expect(text.length).toBeLessThan(320);
  });

  it("adapts after not-yet feedback", () => {
    const text = buildCoachWinRationale({
      goalId: "manage-tantrums",
      goalTitle: "Manage Tantrums",
      win: { win: 13, title: "Try a shorter reset", objective: "Reduce intensity" },
      winDeckIndex: 2,
      answers: { severity: "Severe – daily struggle" },
      feedbackByWin: { 1: "no", 2: "no" },
      progressPct: 8,
      isFirstCoachingWin: false,
    });

    expect(text.toLowerCase()).toMatch(/different|shifting|adjusting|simpler/);
  });
});
