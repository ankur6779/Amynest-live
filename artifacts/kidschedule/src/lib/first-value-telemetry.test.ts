import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

vi.mock("@/lib/growth-analytics", () => ({
  trackGrowthEvent: vi.fn(),
}));

vi.mock("@/lib/activation-gate", () => ({
  hasFirstRoutineActivationProgress: vi.fn(() => false),
}));

import { track } from "@/lib/analytics";
import { trackGrowthEvent } from "@/lib/growth-analytics";
import {
  resetFirstValueTelemetryForTests,
  trackDashboardView,
  trackRoutineCtaClicked,
  trackRoutineGenerationCompleted,
  trackFirstValueAchieved,
} from "./first-value-telemetry";

describe("first-value-telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFirstValueTelemetryForTests();
  });

  it("dedupes dashboard_view per session", () => {
    trackDashboardView({ userState: "no_routine", routineCount: 0 });
    trackDashboardView({ userState: "no_routine", routineCount: 0 });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(
      "dashboard_view",
      expect.objectContaining({ user_state: "no_routine" }),
    );
  });

  it("tracks routine_cta_clicked with source", () => {
    trackRoutineCtaClicked({ source: "first_value_hero", childId: 3 });
    expect(track).toHaveBeenCalledWith(
      "routine_cta_clicked",
      expect.objectContaining({ source: "first_value_hero", child_id: 3 }),
    );
  });

  it("fires completion, saved, and first_value_achieved for first routine", () => {
    trackRoutineGenerationCompleted({
      routineId: 42,
      childId: 1,
      mode: "ai",
      itemCount: 8,
      source: "first_value_hero",
      routineCountBefore: 0,
    });
    expect(track).toHaveBeenCalledWith(
      "routine_generation_completed",
      expect.objectContaining({ is_first_routine: true }),
    );
    expect(track).toHaveBeenCalledWith(
      "routine_saved",
      expect.objectContaining({ routine_id: 42 }),
    );
    expect(track).toHaveBeenCalledWith(
      "first_value_achieved",
      expect.objectContaining({ routine_id: 42 }),
    );
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      "first_routine_generated",
      expect.objectContaining({ routineId: 42 }),
    );
  });

  it("dedupes first_value_achieved", () => {
    trackFirstValueAchieved({ routineId: 9, source: "test" });
    trackFirstValueAchieved({ routineId: 9, source: "test" });
    const achieved = vi.mocked(track).mock.calls.filter((c) => c[0] === "first_value_achieved");
    expect(achieved).toHaveLength(1);
  });
});
