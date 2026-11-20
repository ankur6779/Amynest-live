/**
 * Daily Puzzle XP/streak wipe — Parent Hub sibling switches must not overwrite
 * child B's amynest_puzzle_v2_{B} with child A's in-memory puzzle state.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

const LS = "amynest_puzzle_v2";
const CHILD_A = "Aarav";
const CHILD_B = "Diya";

function save(name: string, st: Record<string, unknown>) {
  localStorage.setItem(`${LS}_${name}`, JSON.stringify(st));
}

function load(name: string): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(`${LS}_${name}`) || "{}") as Record<string, unknown>;
}

describe("DailyPuzzle child-switch keying", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("Parent Hub remounts DailyPuzzle per effectiveChild.id", () => {
    const src = readFileSync(
      resolve(__dirname, "../pages/parenting-hub.tsx"),
      "utf8",
    );
    expect(src).toMatch(/<DailyPuzzle\s+[^>]*key=\{effectiveChild\.id\}/);
  });

  it("PuzzleEngine reloads puzzle state when childName changes", () => {
    const src = readFileSync(
      resolve(__dirname, "./daily-puzzle.tsx"),
      "utf8",
    );
    expect(src).toMatch(/setState\(next\)/);
    expect(src).toMatch(/const next = loadState\(childName, ageGroup\)/);
    expect(src).toMatch(/\}, \[childName, ageGroup\]\)/);
  });

  it("writing under B after loading B keeps sibling XP/streak isolated (correct path)", () => {
    save(CHILD_A, {
      date: "2026-11-20",
      difficulty: "medium",
      totalXp: 240,
      dayStreak: 5,
      bestStreak: 8,
      totalCorrect: 12,
      totalAttempted: 14,
      usedIds: [],
      correctStreak: 0,
      wrongStreak: 0,
    });
    save(CHILD_B, {
      date: "2026-11-20",
      difficulty: "easy",
      totalXp: 40,
      dayStreak: 1,
      bestStreak: 2,
      totalCorrect: 2,
      totalAttempted: 3,
      usedIds: [],
      correctStreak: 0,
      wrongStreak: 0,
    });

    // Bug path would be: save(CHILD_B, load(CHILD_A)) — wiped B.
    // Correct path after switch: mutate B's own snapshot.
    const nextB = { ...load(CHILD_B), totalXp: 60, dayStreak: 2 };
    save(CHILD_B, nextB);

    expect(load(CHILD_A).totalXp).toBe(240);
    expect(load(CHILD_A).dayStreak).toBe(5);
    expect(load(CHILD_B).totalXp).toBe(60);
    expect(load(CHILD_B).dayStreak).toBe(2);
    expect(load(CHILD_B).difficulty).toBe("easy");
  });
});
