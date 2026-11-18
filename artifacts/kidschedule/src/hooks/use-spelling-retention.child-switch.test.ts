/**
 * Spelling retention wrong-child keying — sibling hub switches must not
 * overwrite child B's local retention with child A's in-memory state.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  loadRetentionState,
  useSpellingRetention,
  type SpellingRetentionState,
} from "@/hooks/use-spelling-retention";

const CHILD_A = 10;
const CHILD_B = 11;

function seededState(overrides: Partial<SpellingRetentionState> = {}): SpellingRetentionState {
  return {
    dailyDate: "2026-11-18",
    dailyWords: 3,
    dailyGoalDone: false,
    bonusStars: 4,
    streak: 5,
    lastActiveDate: "2026-11-18",
    streakMilestones: [3],
    collection: {
      learning: [],
      practicing: [],
      mastered: [{ id: "cat", word: "cat", updatedAt: "2026-11-18T00:00:00.000Z" }],
    },
    achievements: { first_word: "2026-11-18T00:00:00.000Z" },
    phonicsMisses: {},
    phonicsHits: { at: 2 },
    weekly: [],
    lastLevelSeen: 2,
    competitionWins: 1,
    ...overrides,
  };
}

describe("Spelling retention child-switch keying", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("SpellingPage remounts SpellingMastery per child id", () => {
    const src = readFileSync(
      resolve(__dirname, "../pages/spelling.tsx"),
      "utf8",
    );
    expect(src).toMatch(/<SpellingMastery\s+[^>]*key=\{child\.id\}/);
  });

  it("hook reloads retention for the newly selected child before mutate", () => {
    localStorage.setItem(
      `amynest:spelling:retention:${CHILD_A}`,
      JSON.stringify(seededState({ streak: 9, competitionWins: 3 })),
    );
    localStorage.setItem(
      `amynest:spelling:retention:${CHILD_B}`,
      JSON.stringify(
        seededState({
          streak: 1,
          competitionWins: 0,
          collection: {
            learning: [],
            practicing: [],
            mastered: [{ id: "dog", word: "dog", updatedAt: "2026-11-17T00:00:00.000Z" }],
          },
        }),
      ),
    );

    const { result, rerender } = renderHook(
      ({ childId }) => useSpellingRetention(childId),
      { initialProps: { childId: CHILD_A } },
    );

    expect(result.current.streak).toBe(9);
    expect(result.current.collection.mastered.map((e) => e.id)).toEqual(["cat"]);

    rerender({ childId: CHILD_B });

    expect(result.current.streak).toBe(1);
    expect(result.current.collection.mastered.map((e) => e.id)).toEqual(["dog"]);

    act(() => {
      result.current.recordCompetitionWin();
    });

    const storedB = loadRetentionState(CHILD_B);
    const storedA = JSON.parse(
      localStorage.getItem(`amynest:spelling:retention:${CHILD_A}`)!,
    ) as SpellingRetentionState;

    expect(storedB.competitionWins).toBe(1);
    expect(storedB.collection.mastered.map((e) => e.id)).toEqual(["dog"]);
    expect(storedA.streak).toBe(9);
    expect(storedA.collection.mastered.map((e) => e.id)).toEqual(["cat"]);
  });
});
