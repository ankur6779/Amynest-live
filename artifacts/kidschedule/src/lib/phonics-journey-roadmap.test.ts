import { describe, expect, it } from "vitest";
import {
  PHONICS_JOURNEY_STAGES,
  buildGuidedMissionGoals,
  computeJourneyCompletionPct,
  estimateJourneyEta,
  journeyStageForCurriculumLevel,
  parentStageStatus,
  readingAgeBand,
  readingConfidence,
  resolveActiveJourneyStage,
  resolveParentJourneyTarget,
  resolvePrimaryCta,
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
    expect(computeJourneyCompletionPct(3, 50, { practiced: { a: 1 }, mastered: {} }, 10)).toBe(36);
    expect(computeJourneyCompletionPct(7, 100, { practiced: { a: 1 }, mastered: {} }, 10)).toBe(100);
    expect(computeJourneyCompletionPct(5, 0)).toBe(0);
  });

  it("marks prior stages reviewable — not auto-completed for age-seeded users", () => {
    const input = {
      curriculumLevel: 4 as const,
      masteryScore: 0,
      totalAgeMonths: 84,
    };
    const target = resolveParentJourneyTarget(input);
    expect(target.id).toBe("fluency");
    expect(parentStageStatus(PHONICS_JOURNEY_STAGES[0]!, input)).toBe("available_for_review");
    expect(parentStageStatus(PHONICS_JOURNEY_STAGES[3]!, input)).toBe("available_for_review");
    expect(parentStageStatus(PHONICS_JOURNEY_STAGES[4]!, input)).toBe("current_target");
    expect(parentStageStatus(PHONICS_JOURNEY_STAGES[5]!, input)).toBe("locked");
  });

  it("marks earned prior stages mastered after curriculum progression", () => {
    const input = {
      curriculumLevel: 4 as const,
      masteryScore: 40,
      totalAgeMonths: 84,
      hasTestHistory: true,
    };
    expect(parentStageStatus(PHONICS_JOURNEY_STAGES[2]!, input)).toBe("mastered");
    expect(parentStageStatus(PHONICS_JOURNEY_STAGES[3]!, input)).toBe("current_target");
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
    const start = resolvePrimaryCta({
      missionStarted: false,
      missionComplete: false,
      dailyQuizComplete: false,
    });
    expect(start.label).toBe("Start Today's Lesson");
    expect(start.scrollTarget).toBe("phonics-start-here");

    const cont = resolvePrimaryCta({
      missionStarted: true,
      missionComplete: false,
      dailyQuizComplete: false,
    });
    expect(cont.label).toBe("Continue Lesson");
    expect(cont.scrollTarget).toBe("phonics-reading-lesson");

    expect(resolvePrimaryCta({ missionStarted: true, missionComplete: true, dailyQuizComplete: false }).label).toBe(
      "Start Quick Check",
    );
    expect(resolvePrimaryCta({ missionStarted: true, missionComplete: true, dailyQuizComplete: true }).label).toBe(
      "View Today's Progress",
    );
  });
});
