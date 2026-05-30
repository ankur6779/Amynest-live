import { describe, expect, it } from "vitest";
import {
  resolveHeroEncouragement,
  resolveNextBestAction,
  resolveStreakMotivation,
  sessionsUntilNextMilestone,
} from "./phonics-journey-engagement";
import { PHONICS_JOURNEY_STAGES, resolvePrimaryCta } from "./phonics-journey-roadmap";

describe("phonics-journey-engagement", () => {
  it("returns streak-based hero encouragement", () => {
    const msg = resolveHeroEncouragement({
      childName: "Mia",
      journeyCompletionPct: 40,
      streak: 3,
      sessionsUntilMilestone: 6,
      activeStage: PHONICS_JOURNEY_STAGES[2]!,
      nextStage: PHONICS_JOURNEY_STAGES[3]!,
      missionComplete: false,
      masteryScore: 50,
    });
    expect(msg).toContain("3 days in a row");
  });

  it("suggests quick check after mission complete", () => {
    const cta = resolvePrimaryCta({
      missionStarted: true,
      missionComplete: true,
      dailyQuizComplete: false,
    });
    const next = resolveNextBestAction({
      missionStarted: true,
      missionComplete: true,
      dailyQuizComplete: false,
      hasReviewItems: false,
      primaryCta: cta,
    });
    expect(next.action).toBe("Start Quick Check");
    expect(next.detail).toContain("2 minutes");
  });

  it("computes sessions until milestone", () => {
    expect(sessionsUntilNextMilestone(50)).toBe(4);
  });

  it("motivates streak toward badge", () => {
    const s = resolveStreakMotivation(2);
    expect(s.nextReward).toContain("1 more day");
  });
});
