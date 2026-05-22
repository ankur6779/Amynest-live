import { describe, expect, it, beforeEach } from "vitest";
import {
  getAmyVoiceCohortAdjustments,
  getAmyVoiceCohortSnapshot,
  recordAmyVoiceCohortSpeak,
  resetAmyVoiceCohortSession,
} from "./amy-voice-cohorts";

describe("amy-voice-cohorts", () => {
  beforeEach(() => {
    resetAmyVoiceCohortSession();
  });

  it("assigns high-support cohort for struggling high-replay learners", () => {
    recordAmyVoiceCohortSpeak({ replayCount: 3, difficulty: "struggling", durationMs: 8000 });
    const cohort = getAmyVoiceCohortAdjustments({
      replayCount: 3,
      difficulty: "struggling",
      durationMs: 8000,
    });
    expect(cohort.cohortId).toContain("high");
    expect(cohort.cohortId).toContain("struggling");
    expect(cohort.supportLevel).toBe("high");
    expect(cohort.guidanceTier).toBe("full");
    expect(cohort.encouragementMultiplier).toBeGreaterThan(1);
  });

  it("assigns low-support cohort for confident fast learners", () => {
    recordAmyVoiceCohortSpeak({ replayCount: 0, difficulty: "confident", durationMs: 1500 });
    recordAmyVoiceCohortSpeak({ replayCount: 1, difficulty: "confident", durationMs: 1800 });
    const cohort = getAmyVoiceCohortAdjustments({
      replayCount: 0,
      difficulty: "confident",
      durationMs: 1500,
    });
    expect(cohort.supportLevel).toBe("low");
    expect(cohort.guidanceTier).toBe("minimal");
    expect(cohort.encouragementMultiplier).toBeLessThan(1);
    expect(getAmyVoiceCohortSnapshot().sessionSpeakCount).toBe(2);
  });
});
