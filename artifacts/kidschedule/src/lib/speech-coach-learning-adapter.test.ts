import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetSpeechCoachLearningAdapterForTests,
  guidanceFromDecision,
  mapRuntimeDifficultyToPrompt,
} from "./speech-coach-learning-adapter";
import type { LearningDecision } from "@workspace/learning-runtime";

function fakeDecision(partial: Partial<LearningDecision>): LearningDecision {
  return {
    schemaVersion: 1,
    id: "d1",
    childId: "1",
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
    ruleId: "speech.completed_route",
    contributingRuleIds: ["speech.completed_route"],
    confidence: 80,
    ...partial,
  };
}

describe("speech-coach-learning-adapter", () => {
  beforeEach(() => {
    __resetSpeechCoachLearningAdapterForTests();
  });

  it("maps runtime difficulty deltas to catalog bands", () => {
    expect(mapRuntimeDifficultyToPrompt("easier", "medium")).toBe("easy");
    expect(mapRuntimeDifficultyToPrompt("harder", "medium")).toBe("advanced");
    expect(mapRuntimeDifficultyToPrompt("same", "medium")).toBe("medium");
  });

  it("builds guidance from runtime decision without inventing mastery", () => {
    const g = guidanceFromDecision(
      1,
      fakeDecision({
        difficulty: "easier",
        hints: "guided",
        celebrationLevel: 1,
        narrationLength: "short",
        reviewQueue: [
          { conceptId: "phoneme:l", priority: 80, reason: "weak" },
        ],
        recommendation: {
          id: "r1",
          title: "Practice L",
          reason: "KG",
          conceptId: "phoneme:l",
          priority: "high",
        },
      }),
      "medium",
    );
    expect(g.difficulty).toBe("easy");
    expect(g.hints).toBe("guided");
    expect(g.targetPhonemes).toContain("l");
    expect(g.ruleId).toBe("speech.completed_route");
  });
});
