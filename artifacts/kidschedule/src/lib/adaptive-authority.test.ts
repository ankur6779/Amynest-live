import { describe, it, expect, beforeEach } from "vitest";
import type { LearningDecision } from "@workspace/learning-runtime";
import {
  publishLearningDecision,
  clearLearningDecisionBus,
} from "@/lib/learning-decision-bus";
import {
  __resetAdaptiveAuthorityForTests,
  getCanonicalLearningDecision,
  hubRecommendationsFromRuntime,
  preferredGameIdsFromRuntime,
  uiBandFromRuntimeDifficulty,
} from "@/lib/adaptive-authority";
import { __resetGamesWorldLearningAdapterForTests } from "@/lib/games-world-learning-adapter";
import { buildAdaptiveReadingPlan } from "@/lib/phonics-v3/reading-adaptive-path";
import { prepareGameSession } from "@/lib/game-adaptive-progression";
import { getGameDifficulty, setGameDifficulty } from "@/lib/game-difficulty";

function fakeDecision(partial: Partial<LearningDecision>): LearningDecision {
  return {
    schemaVersion: 1,
    id: "dec_test",
    childId: "42",
    timestamp: new Date().toISOString(),
    nextActivity: null,
    difficulty: "same",
    hints: "none",
    celebrationLevel: 1,
    narrationLength: "medium",
    reviewQueue: [],
    recommendation: null,
    breakSuggestion: false,
    rewardPriority: "normal",
    reason: "test",
    evidence: [],
    ruleId: "test.rule",
    contributingRuleIds: ["test.rule"],
    confidence: 0.9,
    ...partial,
  };
}

describe("adaptive authority (Runtime canonical)", () => {
  beforeEach(() => {
    clearLearningDecisionBus();
    __resetAdaptiveAuthorityForTests();
    __resetGamesWorldLearningAdapterForTests();
  });

  it("projects hub recommendations only from Runtime decisions", () => {
    expect(hubRecommendationsFromRuntime(42)).toEqual([]);

    publishLearningDecision(
      fakeDecision({
        recommendation: {
          id: "rec_speech",
          title: "Practice /s/",
          reason: "Weak phoneme needs review",
          href: "/speech-coach",
          priority: "high",
          skillId: "speech-s",
        },
        nextActivity: {
          kind: "game",
          entityId: "game:pattern-match",
          href: "/games",
          label: "Pattern Match",
        },
      }),
    );

    const recs = hubRecommendationsFromRuntime(42);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]?.title).toBe("Practice /s/");
    expect(recs.some((r) => r.href.includes("games"))).toBe(true);
    expect(getCanonicalLearningDecision(42)?.ruleId).toBe("test.rule");
  });

  it("maps Runtime difficulty to UI bands without inventing adaptivity", () => {
    expect(uiBandFromRuntimeDifficulty("easier", "medium")).toBe("easy");
    expect(uiBandFromRuntimeDifficulty("harder", "medium")).toBe("hard");
    expect(uiBandFromRuntimeDifficulty("same", "hard")).toBe("hard");
  });

  it("surfaces preferred game ids from Runtime nextActivity", () => {
    // Install bus subscription before publishing.
    expect(getCanonicalLearningDecision(42)).toBeNull();
    publishLearningDecision(
      fakeDecision({
        nextActivity: {
          kind: "game",
          entityId: "game:number-match",
          href: "/games",
        },
      }),
    );
    expect(preferredGameIdsFromRuntime(42)).toContain("number-match");
  });

  it("prepareGameSession respects Runtime difficulty over mastery micro", () => {
    setGameDifficulty("normal");
    prepareGameSession("number-match", 72, { runtimeDifficulty: "easier" });
    expect(getGameDifficulty()).toBe("easy");
  });

  it("reading plan prefers Runtime book ids that pass SATPIN unlocks", () => {
    const plan = buildAdaptiveReadingPlan({
      letterGroupIndex: 1,
      completedBookIds: [],
      recentComprehensionScores: [],
      avgAccuracy: 80,
      avgWpm: 30,
      weakVocabCount: 0,
      preferredBookIds: ["book-tip-tap", "book-sam-sat"],
      runtimeDifficulty: "easier",
      runtimeReason: "Review short pages",
    });
    expect(plan.recommendedBookIds[0]).toBe("book-tip-tap");
    expect(plan.recommendedBookIds).not.toContain("book-sam-sat");
    expect(plan.comprehensionDifficulty).toBe("easy");
    expect(plan.rationale).toContain("Runtime:");
  });
});
