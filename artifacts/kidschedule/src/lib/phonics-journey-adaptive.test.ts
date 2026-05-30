import { describe, expect, it } from "vitest";
import {
  buildAdaptiveMissionGoals,
  buildMilestoneActionPlan,
  buildPredictiveMilestones,
  buildWeakSoundsProfile,
  classifyReviewTier,
  computeReadingConfidenceScore,
  detectEngagementRisk,
  getMissedWords,
  phonemeDisplayName,
  resolveAdaptiveDifficulty,
  resolveCoachMessage,
  resolveLearningVelocity,
  sortItemsForSmartReview,
} from "./phonics-journey-adaptive";
import { PHONICS_JOURNEY_STAGES } from "./phonics-journey-roadmap";
import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";

const items: DisplayPhonicsItem[] = [
  { id: "sh1", symbol: "ship", sound: "ship", type: "word" },
  { id: "sh2", symbol: "shop", sound: "shop", type: "word" },
  { id: "cat", symbol: "cat", sound: "cat", type: "word" },
  { id: "th1", symbol: "this", sound: "this", type: "word" },
];

describe("phonics-journey-adaptive", () => {
  it("maps phonemes to parent-friendly labels", () => {
    expect(phonemeDisplayName("ʃ")).toBe("SH");
    expect(phonemeDisplayName("θ")).toBe("TH");
  });

  it("builds weak sounds profile from API and progress", () => {
    const progress: PhonicsProgressMap = {
      practiced: { sh1: 4, sh2: 5 },
      mastered: {},
    };
    const profile = buildWeakSoundsProfile(["ʃ"], progress, items);
    expect(profile.sounds).toContain("SH");
    expect(profile.focusMessage).toContain("SH");
  });

  it("generates adaptive mission goals", () => {
    const progress: PhonicsProgressMap = { practiced: { sh1: 4 }, mastered: {} };
    const profile = buildWeakSoundsProfile(["ʃ"], progress, items);
    const goals = buildAdaptiveMissionGoals(
      null,
      progress,
      items,
      profile,
      false,
      0,
      [],
    );
    expect(goals.some((g) => g.label.includes("SH"))).toBe(true);
    expect(goals.some((g) => g.id === "quiz")).toBe(true);
  });

  it("classifies review tiers from play counts", () => {
    const progress: PhonicsProgressMap = { practiced: { cat: 4 }, mastered: {} };
    expect(classifyReviewTier(items[2]!, progress)).toBe("needs_review");
    expect(classifyReviewTier(items[2]!, { practiced: { cat: 1 }, mastered: {} })).toBe(
      "almost_mastered",
    );
  });

  it("sorts items with weak sounds first in review mode", () => {
    const progress: PhonicsProgressMap = {
      practiced: { sh1: 4, cat: 1 },
      mastered: {},
    };
    const sorted = sortItemsForSmartReview(items, progress, ["SH"], "review");
    expect(sorted[0]?.symbol).toBe("ship");
  });

  it("computes reading confidence score 0-100", () => {
    const score = computeReadingConfidenceScore({
      masteryScore: 70,
      lastTestScore: 85,
      streak: 5,
      momentum: { practiceDays: 4, wordsReviewed: 20, wordsMastered: 8, accuracyPct: 80 },
      masteredCount: 8,
      practicedCount: 12,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("forecasts predictive milestones", () => {
    const forecasts = buildPredictiveMilestones({
      activeStage: PHONICS_JOURNEY_STAGES[2]!,
      nextStage: PHONICS_JOURNEY_STAGES[3]!,
      masteryScore: 50,
      practiceDaysPerWeek: 4,
    });
    expect(forecasts.length).toBeGreaterThan(0);
    expect(forecasts[0]?.forecast).toMatch(/session|day/i);
  });

  it("produces one-sentence coach messages", () => {
    const msg = resolveCoachMessage({
      childName: "Mia",
      weakProfile: buildWeakSoundsProfile(["ʃ"], { practiced: {}, mastered: {} }, items),
      missionComplete: false,
      quizComplete: false,
      masteredToday: 0,
      lastTestScore: null,
      priorTestScore: null,
      activeStage: PHONICS_JOURNEY_STAGES[2]!,
    });
    expect(msg.split(".").length).toBeLessThanOrEqual(2);
    expect(msg.length).toBeLessThan(120);
  });

  it("detects engagement risk supportively", () => {
    const risk = detectEngagementRisk({
      streak: 0,
      daysSinceActive: 3,
      momentum: { practiceDays: 1, wordsReviewed: 2, wordsMastered: 0, accuracyPct: 70 },
      weeklyBaseline: {
        weekKey: "2026-W1",
        practiceDays: 5,
        wordsReviewed: 30,
        wordsMastered: 10,
        accuracyPct: 85,
      },
      lastTestScore: 70,
      adaptiveState: {
        lastRecordedTestScore: 90,
        priorWeekKey: "2026-W1",
        priorWeekMastered: 5,
        priorWeekAccuracy: 80,
      },
    });
    expect(risk?.title).toBeTruthy();
    expect(risk?.message).not.toMatch(/fail|bad|wrong/i);
  });

  it("resolves adaptive difficulty modes", () => {
    expect(resolveAdaptiveDifficulty(80, 90)).toBe("challenge");
    expect(resolveAdaptiveDifficulty(30, 55)).toBe("review");
    expect(resolveAdaptiveDifficulty(60, 75)).toBe("balanced");
  });

  it("tracks learning velocity trends", () => {
    const velocity = resolveLearningVelocity(
      { practiceDays: 5, wordsReviewed: 30, wordsMastered: 10, accuracyPct: 90 },
      {
        weekKey: "2026-W1",
        practiceDays: 3,
        wordsReviewed: 15,
        wordsMastered: 4,
        accuracyPct: 80,
      },
      { priorWeekKey: "2026-W1", priorWeekMastered: 4, priorWeekAccuracy: 75, lastRecordedTestScore: 80 },
    );
    expect(velocity.label).toBe("Faster than last week");
  });

  it("builds milestone action plan checklist", () => {
    const plan = buildMilestoneActionPlan({
      nextStage: PHONICS_JOURNEY_STAGES[3]!,
      masteryScore: 60,
      masteredCount: 12,
      quizComplete: false,
      quickChecksThisWeek: 0,
    });
    expect(plan?.items.length).toBe(3);
  });

  it("finds missed words from progress", () => {
    const progress: PhonicsProgressMap = {
      practiced: { cat: 3 },
      mastered: {},
    };
    expect(getMissedWords(progress, items)).toHaveLength(1);
  });
});
