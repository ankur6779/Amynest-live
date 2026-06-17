import { describe, expect, it } from "vitest";
import {
  buildJourneyProgressionContext,
  buildJourneyStageViews,
  computeMasteryBasedJourneyPct,
  hasEarnedCurriculumProgress,
  resolveCurrentTargetStage,
  resolveJourneyStageStatus,
  showsRecommendedLevelBanner,
} from "./journey-progression";
import { PHONICS_V2_STAGES } from "./content/journey-stages";

describe("journey-progression", () => {
  const age7Months = 84;

  it("does not auto-complete prior stages for age-seeded new users", () => {
    const ctx = buildJourneyProgressionContext({
      curriculumLevel: 5,
      masteryScore: 0,
      totalAgeMonths: age7Months,
      masteredStages: [],
    });
    expect(hasEarnedCurriculumProgress(ctx)).toBe(false);
    expect(showsRecommendedLevelBanner(ctx)).toBe(true);

    const target = resolveCurrentTargetStage(ctx);
    expect(target.id).toBe("consonant_blends");

    const letter = PHONICS_V2_STAGES[0]!;
    const cvc = PHONICS_V2_STAGES[1]!;
    const digraphs = PHONICS_V2_STAGES[3]!;

    expect(resolveJourneyStageStatus(letter, ctx)).toBe("available_for_review");
    expect(resolveJourneyStageStatus(cvc, ctx)).toBe("available_for_review");
    expect(resolveJourneyStageStatus(digraphs, ctx)).toBe("available_for_review");
    expect(resolveJourneyStageStatus(target, ctx)).toBe("current_target");
  });

  it("marks earned stages mastered after curriculum level-up", () => {
    const ctx = buildJourneyProgressionContext({
      curriculumLevel: 4,
      masteryScore: 40,
      totalAgeMonths: age7Months,
      lastTestAt: "2026-01-01T00:00:00.000Z",
      masteredStages: [],
    });

    const views = buildJourneyStageViews(ctx);
    expect(views.find((v) => v.stage.id === "letter_sounds")?.status).toBe("mastered");
    expect(views.find((v) => v.stage.id === "cvc_decoding")?.status).toBe("mastered");
    expect(views.find((v) => v.stage.id === "word_families")?.status).toBe("mastered");
    expect(views.find((v) => v.stage.id === "digraphs")?.status).toBe("current_target");
    expect(views.find((v) => v.stage.id === "consonant_blends")?.status).toBe("locked");
  });

  it("never greys out reviewable prior stages in views", () => {
    const ctx = buildJourneyProgressionContext({
      curriculumLevel: 4,
      masteryScore: 0,
      totalAgeMonths: age7Months,
    });
    const views = buildJourneyStageViews(ctx);
    for (const v of views) {
      if (v.status === "available_for_review" || v.status === "mastered") {
        expect(v.selectable).toBe(true);
        expect(v.actionLabel).toBe("Review");
      }
      if (v.status === "current_target") {
        expect(v.actionLabel).toBe("Continue Learning");
      }
      if (v.status === "locked") {
        expect(v.actionLabel).toBe("Locked");
        expect(v.selectable).toBe(false);
      }
    }
  });

  it("computes completion from mastery not age", () => {
    const fresh = buildJourneyProgressionContext({
      curriculumLevel: 5,
      masteryScore: 0,
      totalAgeMonths: age7Months,
    });
    expect(computeMasteryBasedJourneyPct(fresh)).toBe(0);

    const earned = buildJourneyProgressionContext({
      curriculumLevel: 3,
      masteryScore: 50,
      totalAgeMonths: 48,
      lastTestAt: "2026-01-01",
    });
    expect(computeMasteryBasedJourneyPct(earned)).toBeGreaterThan(20);
  });
});
