import { describe, it, expect } from "vitest";
import { buildAmyUnderstandingView } from "./coach-understanding";

describe("buildAmyUnderstandingView", () => {
  it("translates travel answers into natural coaching language", () => {
    const view = buildAmyUnderstandingView({
      goalId: "travel-with-kids",
      goalTitle: "Travel With Kids",
      questions: [
        { id: "ageGroup", prompt: "Age", type: "single", options: [] },
        { id: "severity", prompt: "Severity", type: "single", options: [] },
        { id: "common_frequency", prompt: "Freq", type: "single", options: [] },
        { id: "distance", prompt: "Distance", type: "single", options: [] },
        { id: "child_behavior", prompt: "Behavior", type: "single", options: [] },
      ],
      answers: {
        ageGroup: "5–7 years",
        severity: "Moderate – frequent",
        common_frequency: "Weekly",
        distance: "Long",
        child_behavior: "Restless",
      },
    });

    expect(view.bullets.some((b) => b.includes("5–7"))).toBe(true);
    expect(view.bullets.some((b) => b.includes("Long trips"))).toBe(true);
    expect(view.bullets.some((b) => b.includes("Restlessness"))).toBe(true);
    expect(view.bullets.join(" ")).not.toMatch(/\bWeekly\b/);
    expect(view.bullets.join(" ")).not.toMatch(/\bLong\b(?!\s+trips)/);
    expect(view.focusAreas.length).toBeGreaterThan(0);
  });
});
