import { describe, expect, it, beforeEach } from "vitest";
import { recordAmyVoiceStrugglePhrase, resetAmyVoiceAnalytics } from "./amy-voice-analytics";
import {
  applyStruggleInsightActions,
  buildStruggleImprovementActions,
  buildWeeklyStruggleReview,
  categorizeStrugglePhrase,
  flushProductIterationPipeline,
  resetAmyVoiceStruggleInsightsSession,
} from "./amy-voice-struggle-insights";

describe("amy-voice-struggle-insights", () => {
  beforeEach(() => {
    resetAmyVoiceAnalytics();
    resetAmyVoiceStruggleInsightsSession();
  });

  it("categorizes phonics, clarity, and content struggles", () => {
    recordAmyVoiceStrugglePhrase("sh", "phonics", "phonics", {
      replayCount: 3,
      difficulty: "struggling",
    });
    recordAmyVoiceStrugglePhrase("listen carefully now", "speech_coach", "default", {
      fallback: true,
    });
    recordAmyVoiceStrugglePhrase(
      "step three of five then add twelve apples to the basket",
      "mixed",
      "default",
      { replayCount: 2 },
    );

    const review = buildWeeklyStruggleReview();
    expect(review.totalPhrases).toBe(3);
    expect(review.byCategory.phonics).toBe(1);
    expect(review.byCategory.clarity).toBe(1);
    expect(review.byCategory.content).toBe(1);
    expect(review.recommendedActions).toContain("static_generation");
  });

  it("maps categories to teaching and static actions", () => {
    recordAmyVoiceStrugglePhrase("b", "phonics", "phonics", {
      replayCount: 4,
      difficulty: "struggling",
      fallback: true,
    });
    const top = buildWeeklyStruggleReview().topPhrases[0]!;
    expect(categorizeStrugglePhrase(top)).toBe("phonics");
    expect(buildStruggleImprovementActions(top)).toEqual(
      expect.arrayContaining(["static_generation", "teaching_pacing"]),
    );
    expect(applyStruggleInsightActions(buildWeeklyStruggleReview())).toBeGreaterThan(0);
  });

  it("builds product iteration pipeline from struggle categories", () => {
    recordAmyVoiceStrugglePhrase("sh", "phonics", "phonics", {
      replayCount: 4,
      difficulty: "struggling",
      fallback: true,
    });
    recordAmyVoiceStrugglePhrase("listen carefully now", "speech_coach", "default", {
      fallback: true,
    });

    const review = buildWeeklyStruggleReview();
    expect(review.productPipeline.items.length).toBeGreaterThan(0);
    expect(review.productPipeline.byAction.improve_sound_mapping).toBeGreaterThan(0);
    expect(review.productPipeline.byAction.adjust_delivery).toBeGreaterThan(0);

    const piped = flushProductIterationPipeline(review.productPipeline);
    expect(piped.items.some((item) => item.pipelineStage === "queued")).toBe(true);
  });
});
