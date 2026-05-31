import { describe, it, expect } from "vitest";
import {
  resolveCoachCheckIn,
  buildCoachMemoryLine,
  coachCheckInNotificationCopy,
  applyCoachIntelligenceEvent,
  createEmptyCoachIntelligence,
} from "@workspace/coach-journey";
import type { CoachProgressViewModel } from "@workspace/coach-journey";

function baseSession(overrides: Partial<CoachProgressViewModel> = {}): CoachProgressViewModel {
  return {
    sessionId: "sess-1",
    goalId: "travel-with-kids",
    goalLabel: "Travel With Kids",
    planTitle: "Travel With Kids",
    planSummary: "",
    progressPct: 40,
    goalDenominator: 12,
    coachingWinsCompleted: 5,
    recentOutcomes: [],
    currentFocus: { title: "Pause before reacting", summary: "Calmer trips", reason: "test" },
    progressTrend: "building_consistency",
    nextMilestonePct: 50,
    milestoneHints: [],
    coachInsight: "",
    coachingStreakDays: 0,
    suggestReassess: false,
    milestoneCelebration: null,
    lastUpdated: new Date().toISOString(),
    canResume: true,
    ...overrides,
  };
}

describe("resolveCoachCheckIn", () => {
  it("returns 24h check-in after one day inactive", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const checkIn = resolveCoachCheckIn({
      session: baseSession(),
      lastActivityAt: "2026-05-30T12:00:00Z",
      lastCheckInAt: null,
      snoozedUntil: null,
      checkInHistory: [],
      now,
    });
    expect(checkIn?.kind).toBe("daily_24h");
    expect(checkIn?.options).toHaveLength(3);
  });

  it("returns 3-day inactivity check-in", () => {
    const now = new Date("2026-06-05T12:00:00Z");
    const checkIn = resolveCoachCheckIn({
      session: baseSession(),
      lastActivityAt: "2026-06-01T12:00:00Z",
      lastCheckInAt: null,
      snoozedUntil: null,
      checkInHistory: [],
      now,
    });
    expect(checkIn?.kind).toBe("inactivity_3d");
    expect(checkIn?.prompt.toLowerCase()).toContain("few days");
  });

  it("uses human notification copy", () => {
    const copy = coachCheckInNotificationCopy({ kind: "daily_24h", goalTitle: "Travel" });
    expect(copy.title.toLowerCase()).not.toContain("lesson");
    expect(copy.title.toLowerCase()).not.toContain("course");
  });
});

describe("buildCoachMemoryLine", () => {
  it("references prior positive check-in", () => {
    const line = buildCoachMemoryLine(
      [
        {
          sessionId: "sess-1",
          goalId: "fix-bedtime-resistance",
          kind: "micro",
          optionId: "yes",
          optionLabel: "Yes",
          at: "2026-05-20T00:00:00Z",
        },
      ],
      baseSession({ goalId: "fix-bedtime-resistance", goalLabel: "Bedtime" }),
    );
    expect(line?.toLowerCase()).toContain("bedtime");
  });

  it("uses family intelligence memory when available", () => {
    let intel = createEmptyCoachIntelligence();
    intel = applyCoachIntelligenceEvent(intel, {
      type: "win_feedback",
      sessionId: "sess-1",
      goalId: "travel-with-kids",
      goalTitle: "Travel",
      winNumber: 1,
      winTitle: "Name emotions during travel",
      winObjective: "Validate feelings before fixing",
      feedback: "yes",
      at: "2026-05-01T00:00:00Z",
    });
    const line = buildCoachMemoryLine([], baseSession(), intel);
    expect(line?.toLowerCase()).toMatch(/amy|success|building/);
  });
});
