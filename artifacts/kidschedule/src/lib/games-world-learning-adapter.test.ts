import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetGamesWorldLearningAdapterForTests,
  adaptGameQueueFromRuntime,
  guidanceFromGameDecision,
  mapRuntimeDifficultyToGameUi,
  sectionKeyForGameCategory,
  skillsForGameCategory,
} from "./games-world-learning-adapter";
import type { LearningDecision } from "@workspace/learning-runtime";

function fakeDecision(partial: Partial<LearningDecision>): LearningDecision {
  return {
    schemaVersion: 1,
    id: "d1",
    childId: "1",
    timestamp: new Date().toISOString(),
    nextActivity: {
      kind: "game",
      entityId: "game:pattern-match",
      href: "/games",
      label: "next",
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
    ruleId: "game.level_completed_route",
    contributingRuleIds: ["game.level_completed_route"],
    confidence: 80,
    ...partial,
  };
}

describe("games-world-learning-adapter", () => {
  beforeEach(() => {
    __resetGamesWorldLearningAdapterForTests();
  });

  it("maps categories to progress sections without inventing a games SectionKey", () => {
    expect(sectionKeyForGameCategory("memory")).toBe("memory");
    expect(sectionKeyForGameCategory("math")).toBe("math");
    expect(sectionKeyForGameCategory("brain")).toBe("puzzles");
    expect(sectionKeyForGameCategory("creativity")).toBe("creativity");
  });

  it("maps runtime difficulty onto Easy/Normal/Hard presentation", () => {
    expect(mapRuntimeDifficultyToGameUi("easier", "normal")).toBe("easy");
    expect(mapRuntimeDifficultyToGameUi("harder", "normal")).toBe("hard");
    expect(mapRuntimeDifficultyToGameUi("same", "normal")).toBe("normal");
  });

  it("builds guidance from runtime decision", () => {
    const g = guidanceFromGameDecision(
      1,
      fakeDecision({
        difficulty: "easier",
        hints: "light",
        celebrationLevel: 2,
        rewardPriority: "high",
        reviewQueue: [
          {
            conceptId: "game:card-flip",
            entityId: "card-flip",
            priority: 80,
            reason: "review",
          },
        ],
      }),
    );
    expect(g.difficulty).toBe("easier");
    expect(g.hints).toBe("light");
    expect(g.rewardPriority).toBe("high");
    expect(g.preferredGameIds).toContain("pattern-match");
    expect(g.preferredGameIds).toContain("card-flip");
    expect(g.ruleId).toBe("game.level_completed_route");
    expect(skillsForGameCategory("memory")).toContain("working-memory");
  });

  it("reorders catalog by runtime preferred ids only", () => {
    const catalog = [
      { id: "a" },
      { id: "pattern-match" },
      { id: "card-flip" },
    ];
    const ordered = adaptGameQueueFromRuntime(
      catalog,
      guidanceFromGameDecision(
        1,
        fakeDecision({
          nextActivity: {
            kind: "game",
            entityId: "card-flip",
            href: "/games",
            label: "pref",
          },
          reviewQueue: [
            {
              conceptId: "game:pattern-match",
              entityId: "pattern-match",
              priority: 50,
              reason: "r",
            },
          ],
        }),
      ),
    );
    expect(ordered.map((g) => g.id)).toEqual([
      "card-flip",
      "pattern-match",
      "a",
    ]);
  });
});
