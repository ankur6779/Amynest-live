import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetReadingWorldLearningAdapterForTests,
  adaptReadingOrderFromRuntime,
  guidanceFromReadingDecision,
  mapRuntimeDifficultyToReadingBand,
} from "./reading-world-learning-adapter";
import type { LearningDecision } from "@workspace/learning-runtime";

function fakeDecision(partial: Partial<LearningDecision>): LearningDecision {
  return {
    schemaVersion: 1,
    id: "d1",
    childId: "1",
    timestamp: new Date().toISOString(),
    nextActivity: {
      kind: "reading",
      entityId: "reading:s",
      href: "/phonics",
      label: "practice",
    },
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
    ruleId: "reading.page_completed_route",
    contributingRuleIds: ["reading.page_completed_route"],
    confidence: 80,
    ...partial,
  };
}

describe("reading-world-learning-adapter", () => {
  beforeEach(() => {
    __resetReadingWorldLearningAdapterForTests();
  });

  it("maps runtime difficulty to presentation bands without local mastery", () => {
    expect(mapRuntimeDifficultyToReadingBand("easier", "medium")).toBe("easy");
    expect(mapRuntimeDifficultyToReadingBand("harder", "medium")).toBe("hard");
    expect(mapRuntimeDifficultyToReadingBand("same", "medium")).toBe("medium");
  });

  it("builds guidance from runtime decision", () => {
    const g = guidanceFromReadingDecision(
      1,
      fakeDecision({
        difficulty: "easier",
        hints: "guided",
        narrationLength: "short",
        celebrationLevel: 2,
        reviewQueue: [
          {
            conceptId: "phoneme:m",
            entityId: "m",
            priority: 90,
            reason: "review",
          },
          {
            conceptId: "word:sat",
            entityId: "sat",
            priority: 70,
            reason: "vocab",
          },
        ],
        recommendation: {
          id: "r1",
          title: "Practice S",
          reason: "KG",
          conceptId: "reading:s",
          priority: "high",
          href: "/phonics",
        },
      }),
    );
    expect(g.difficulty).toBe("easier");
    expect(g.hintLevel).toBe("guided");
    expect(g.hints).toBe("guided");
    expect(g.narrationLength).toBe("short");
    expect(g.preferredGraphemes).toContain("s");
    expect(g.recommendedLetters).toContain("s");
    expect(g.recommendedPhonemes).toContain("m");
    expect(g.recommendedWords).toContain("sat");
    expect(g.recommendedVocabulary).toContain("sat");
    expect(g.ruleId).toBe("reading.page_completed_route");
  });

  it("reorders reading catalog by runtime preferred graphemes only", () => {
    const catalog = [
      { id: "a", title: "A" },
      { id: "s", title: "S" },
      { id: "t", title: "T" },
    ];
    const ordered = adaptReadingOrderFromRuntime(
      catalog,
      guidanceFromReadingDecision(
        1,
        fakeDecision({
          nextActivity: {
            kind: "reading",
            entityId: "s",
            href: "/phonics",
            label: "pref",
          },
          reviewQueue: [
            { conceptId: "reading:t", entityId: "t", priority: 50, reason: "r" },
          ],
        }),
      ),
    );
    expect(ordered.map((s) => s.id)).toEqual(["s", "t", "a"]);
  });
});
