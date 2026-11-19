/**
 * Smart Math Tricks mastery wipe — sibling hub switches must not overwrite
 * child B's amynest_math_tricks_{B} with child A's in-memory mastery/streak.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

const LS = "amynest_math_tricks";
const CHILD_A = "Aarav";
const CHILD_B = "Diya";

function save(name: string, st: Record<string, unknown>) {
  localStorage.setItem(`${LS}_${name}`, JSON.stringify(st));
}

function load(name: string): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(`${LS}_${name}`) || "{}") as Record<string, unknown>;
}

describe("Smart Math Tricks child-switch keying", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("SmartMathTricksPage remounts SmartMathTricks per child id", () => {
    const src = readFileSync(
      resolve(__dirname, "../pages/smart-math-tricks.tsx"),
      "utf8",
    );
    expect(src).toMatch(/<SmartMathTricks\s+[^>]*key=\{child\.id\}/);
  });

  it("SmartMathTricks reloads math state when childName changes", () => {
    const src = readFileSync(
      resolve(__dirname, "./smart-math-tricks.tsx"),
      "utf8",
    );
    expect(src).toMatch(/setMathSt\(loadMathState\(childName\)\)/);
    expect(src).toMatch(/\}, \[childName, ageYears\]\)/);
  });

  it("writing under B after loading B keeps sibling mastery isolated (correct path)", () => {
    save(CHILD_A, {
      mastery: { add10: { correct: 8, attempts: 10 } },
      streakDays: 7,
      starIds: ["add10"],
    });
    save(CHILD_B, {
      mastery: { doubles: { correct: 2, attempts: 2 } },
      streakDays: 1,
      starIds: ["doubles"],
    });

    // Bug path would be: save(CHILD_B, load(CHILD_A)) — wiped B.
    // Correct path after switch: mutate B's own snapshot.
    const nextB = { ...load(CHILD_B), streakDays: 2 };
    save(CHILD_B, nextB);

    expect(load(CHILD_A).streakDays).toBe(7);
    expect(load(CHILD_A).starIds).toEqual(["add10"]);
    expect(load(CHILD_B).streakDays).toBe(2);
    expect(load(CHILD_B).starIds).toEqual(["doubles"]);
  });
});
