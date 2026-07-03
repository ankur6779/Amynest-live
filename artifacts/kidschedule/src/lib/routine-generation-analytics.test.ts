import { describe, it, expect, vi, beforeEach } from "vitest";
import * as analytics from "./analytics";
import {
  beginRoutineGenerationSession,
  endRoutineGenerationSession,
  trackRoutineGeneratedOnce,
  trackRoutineGenerationFailed,
  trackRoutineGenerationStarted,
} from "./routine-generation-analytics";
import { resetAnalyticsServiceForTests } from "./analytics/analytics-service";

describe("routine-generation-analytics session dedupe", () => {
  beforeEach(() => {
    resetAnalyticsServiceForTests();
    endRoutineGenerationSession();
    vi.restoreAllMocks();
  });

  it("emits started only once per session", () => {
    const track = vi.spyOn(analytics, "track");
    beginRoutineGenerationSession({ childId: 1, mode: "ai" });
    trackRoutineGenerationStarted({ childId: 1, mode: "ai" });
    trackRoutineGenerationStarted({ childId: 1, mode: "ai" });
    expect(track.mock.calls.filter((c) => c[0] === "routine_generation_started")).toHaveLength(1);
  });

  it("does not emit failed after generated", () => {
    const track = vi.spyOn(analytics, "track");
    beginRoutineGenerationSession({ childId: 1, mode: "standard" });
    trackRoutineGeneratedOnce({ childId: 1, mode: "rule", itemCount: 5 });
    trackRoutineGenerationFailed(new Error("late"), { childId: 1, mode: "standard" });
    expect(track.mock.calls.filter((c) => c[0] === "routine_generation_failed")).toHaveLength(0);
  });
});
