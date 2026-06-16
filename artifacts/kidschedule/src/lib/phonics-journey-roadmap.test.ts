import { describe, expect, it } from "vitest";
import {
  PHONICS_JOURNEY_STAGES,
  buildGuidedMissionGoals,
  computeJourneyCompletionPct,
  estimateJourneyEta,
  journeyStageForCurriculumLevel,
  readingAgeBand,
  readingConfidence,
  resolveActiveJourneyStage,
  resolvePrimaryCta,
  stageStatus,
} from "./phonics-journey-roadmap";

describe("phonics-journey-roadmap", () => {
  it("exposes six journey stages with milestone names", () => {
    expect(PHONICS_JOURNEY_STAGES).toHaveLength(6);
    expect(PHONICS_JOURNEY_STAGES[0]?.milestoneName).toBe("Sound Explorer");
    expect(PHONICS_JOURNEY_STAGES[5]?.milestoneName).toBe("Story Master");
  });

  it("maps curriculum level 2 to Word Builder stage", () => {
    const stage = journeyStageForCurriculumLevel(2);
    expect(stage.id).toBe("blending");
    expect(stage.milestoneName).toBe("Word Builder");
  });

  it("maps curriculum level 1 to Letter Detective for older toddlers", () => {
    const stage = journeyStageForCurriculumLevel(1, 30);
    expect(stage.id).toBe("basic_phonics");
  });

  it("computes overall completion from level and mastery", () => {
    expect(computeJourneyCompletionPct(3, 50)).toBe(36);
    expect(computeJourneyCompletionPct(7, 100)).toBe(100);
  });

  it("marks prior stages completed and future locked", () => {
    const active = resolveActiveJourneyStage(3, 48);
    expect(stageStatus(PHONICS_JOURNEY_STAGES[0]!, active)).toBe("completed");
    expect(stageStatus(PHONICS_JOURNEY_STAGES[3]!, active)).toBe("current");
    expect(stageStatus(PHONICS_JOURNEY_STAGES[5]!, active)).toBe("locked");
  });

  it("derives reading age band and confidence", () => {
    expect(readingAgeBand(54)).toBe("4–5 Years");
    expect(readingConfidence(80, 90)).toBe("Confident");
    expect(readingConfidence(10, 10)).toBe("Developing");
  });

  it("estimates ETA toward Story Master", () => {
    const active = PHONICS_JOURNEY_STAGES[2]!;
    const eta = estimateJourneyEta(active, 40, 3);
    expect(eta).toMatch(/week|session|milestone/i);
  });

  it("builds guided mission goals from curriculum plan", () => {
    const goals = buildGuidedMissionGoals(
      {
        practice: [
          { id: "p1", kind: "letter_sound", label: "A", completed: true },
          { id: "p2", kind: "blend_word", label: "cat", completed: false },
        ],
        revision: [],
        test: { id: "t1", kind: "daily_test", label: "Quiz", completed: false },
      },
      { practiced: {}, mastered: {} },
      [],
    );
    expect(goals).toHaveLength(3);
    expect(goals[0]?.emoji).toBe("🎯");
  });

  it("resolves primary CTA states", () => {
    expect(resolvePrimaryCta({ missionStarted: false, missionComplete: false, dailyQuizComplete: false }).label).toBe(
      "Start Today's Mission",
    );
    expect(resolvePrimaryCta({ missionStarted: true, missionComplete: true, dailyQuizComplete: false }).label).toBe(
      "Start Quick Check",
    );
    expect(resolvePrimaryCta({ missionStarted: true, missionComplete: true, dailyQuizComplete: true }).label).toBe(
      "View Today's Progress",
    );
  });
});
