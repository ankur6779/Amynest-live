import { describe, it, expect } from "vitest";
import {
  buildCoachGraduationViewModel,
  shouldSuggestGoalReactivation,
} from "@workspace/coach-journey";

describe("buildCoachGraduationViewModel", () => {
  it("builds travel reflection from onboarding context", () => {
    const vm = buildCoachGraduationViewModel({
      goalId: "travel-with-kids",
      goalTitle: "Travel With Kids",
      answers: {
        severity: "Moderate – frequent",
        common_frequency: "Weekly",
        distance: "Long",
        child_behavior: "Restless",
      },
      feedbacks: [
        { win: 1, feedback: "yes", at: "2026-05-01T10:00:00Z" },
        { win: 2, feedback: "yes", at: "2026-05-02T10:00:00Z" },
      ],
      relatedGoalCatalog: [
        { id: "hospital-doctor-visit", title: "Hospital Visit", categoryId: "special-situations" },
        { id: "daycare-school-transition", title: "School Transition", categoryId: "special-situations" },
      ],
    });

    expect(vm.headline).toBe("You've Come A Long Way");
    expect(vm.whenStarted.some((b) => b.toLowerCase().includes("travel"))).toBe(true);
    expect(vm.today.length).toBe(3);
    expect(vm.amyStrengths.length).toBeGreaterThan(0);
    expect(vm.strengthenOption?.title).toBe("Travel With Confidence");
  });

  it("avoids course-completion language", () => {
    const vm = buildCoachGraduationViewModel({
      goalId: "manage-tantrums",
      goalTitle: "Manage Tantrums",
      answers: {},
      feedbacks: [],
    });
    const combined = JSON.stringify(vm).toLowerCase();
    expect(combined).not.toContain("course");
    expect(combined).not.toContain("training complete");
    expect(combined).not.toContain("all wins completed");
  });
});

describe("shouldSuggestGoalReactivation", () => {
  it("suggests refresher after regression in maintenance", () => {
    expect(
      shouldSuggestGoalReactivation({
        maintenanceMode: true,
        graduatedAt: "2026-04-01T00:00:00Z",
        recentFeedbacks: [{ feedback: "no" }, { feedback: "no" }],
      }),
    ).toBe(true);
  });
});
