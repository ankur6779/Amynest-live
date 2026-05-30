import { describe, expect, it } from "vitest";
import {
  buildDailyWins,
  buildSessionCompletion,
  commitmentLabel,
  isCommitmentAchieved,
  isComeback,
  resolveReadingIdentity,
  resolveStreakChainMessage,
} from "./phonics-journey-habit";
import { PHONICS_JOURNEY_STAGES } from "./phonics-journey-roadmap";

describe("phonics-journey-habit", () => {
  it("detects comeback after 3+ inactive days", () => {
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    expect(isComeback(fourDaysAgo.toISOString().slice(0, 10))).toBe(true);
    expect(isComeback(new Date().toISOString().slice(0, 10))).toBe(false);
  });

  it("resolves reading identity from stage", () => {
    expect(resolveReadingIdentity(PHONICS_JOURNEY_STAGES[0]!, 10)).toBe("Developing Reader");
    expect(resolveReadingIdentity(PHONICS_JOURNEY_STAGES[5]!, 90)).toBe("Story Reader");
  });

  it("achieves commitment by type", () => {
    expect(
      isCommitmentAchieved("1mission", {
        missionComplete: true,
        todayPlayCount: 0,
        todayUniqueSounds: 0,
      }),
    ).toBe(true);
    expect(
      isCommitmentAchieved("10sounds", {
        missionComplete: false,
        todayPlayCount: 10,
        todayUniqueSounds: 8,
      }),
    ).toBe(true);
  });

  it("builds daily wins with fallback positivity", () => {
    const wins = buildDailyWins({
      todayMastered: [],
      todayUniqueSounds: 0,
      todayPlayCount: 0,
      missionComplete: false,
      quizComplete: false,
      lastTestScore: null,
    });
    expect(wins.length).toBeGreaterThan(0);
  });

  it("uses encouraging streak protection copy", () => {
    expect(resolveStreakChainMessage(3, false, false)).toContain("protect");
    expect(resolveStreakChainMessage(3, true, true)).toContain("tomorrow");
  });

  it("builds session completion summary", () => {
    const s = buildSessionCompletion({
      todayPlayCount: 10,
      todayUniqueSounds: 8,
      todayMastered: ["ship"],
      quizComplete: true,
      nextStage: PHONICS_JOURNEY_STAGES[5]!,
    });
    expect(s.wins.length).toBeGreaterThan(0);
    expect(s.pointsEarned).toBe(25);
  });

  it("labels commitments", () => {
    expect(commitmentLabel("5min")).toBe("5 Minutes");
  });
});
