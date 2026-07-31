import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetStoryWorldLearningAdapterForTests,
  adaptStoryQueueFromRuntime,
  extractStoryVocabulary,
  guidanceFromStoryDecision,
} from "./story-world-learning-adapter";
import type { LearningDecision } from "@workspace/learning-runtime";

function fakeDecision(partial: Partial<LearningDecision>): LearningDecision {
  return {
    schemaVersion: 1,
    id: "d1",
    childId: "1",
    timestamp: new Date().toISOString(),
    nextActivity: {
      kind: "story",
      entityId: "story:42",
      href: "/parenting-hub#stories",
      label: "review",
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
    ruleId: "story.chapter_completed_route",
    contributingRuleIds: ["story.chapter_completed_route"],
    confidence: 80,
    ...partial,
  };
}

describe("story-world-learning-adapter", () => {
  beforeEach(() => {
    __resetStoryWorldLearningAdapterForTests();
  });

  it("extracts vocabulary tokens from titles without inventing mastery", () => {
    expect(extractStoryVocabulary("The Brave Little Star")).toEqual([
      "brave",
      "little",
      "star",
    ]);
  });

  it("builds guidance from runtime decision (no local difficulty engine)", () => {
    const g = guidanceFromStoryDecision(
      1,
      fakeDecision({
        difficulty: "easier",
        hints: "guided",
        narrationLength: "short",
        celebrationLevel: 2,
        reviewQueue: [
          { conceptId: "story:7", entityId: "7", priority: 90, reason: "review" },
        ],
        recommendation: {
          id: "r1",
          title: "Revisit Kind Lion",
          reason: "KG",
          conceptId: "story:7",
          priority: "high",
          href: "/parenting-hub#stories",
        },
      }),
    );
    expect(g.difficulty).toBe("easier");
    expect(g.hints).toBe("guided");
    expect(g.narrationLength).toBe("short");
    expect(g.celebrationLevel).toBe(2);
    expect(g.preferredStoryIds).toContain("42");
    expect(g.preferredStoryIds).toContain("7");
    expect(g.ruleId).toBe("story.chapter_completed_route");
  });

  it("reorders catalog by runtime preferred ids only", () => {
    const catalog = [
      { id: 1, title: "A" },
      { id: 2, title: "B" },
      { id: 3, title: "C" },
    ];
    const ordered = adaptStoryQueueFromRuntime(
      catalog,
      guidanceFromStoryDecision(
        1,
        fakeDecision({
          nextActivity: {
            kind: "story",
            entityId: "3",
            href: "/stories",
            label: "pref",
          },
          reviewQueue: [
            { conceptId: "story:1", entityId: "1", priority: 50, reason: "r" },
          ],
        }),
      ),
    );
    expect(ordered.map((s) => s.id)).toEqual([3, 1, 2]);
  });
});
