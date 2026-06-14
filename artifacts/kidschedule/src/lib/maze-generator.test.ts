import { describe, expect, it } from "vitest";
import {
  generateValidatedMaze,
  isMazeSolvable,
  passesQualityGate,
  solveMaze,
} from "@/lib/maze-generator";

describe("maze-generator", () => {
  it("generates solvable mazes for each difficulty", () => {
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      const size = difficulty === "easy" ? 5 : difficulty === "hard" ? 10 : 7;
      const { maze, analysis } = generateValidatedMaze(size, difficulty);
      expect(isMazeSolvable(maze)).toBe(true);
      expect(analysis.pathLength).toBeGreaterThan(0);
      expect(passesQualityGate(analysis, size, difficulty)).toBe(true);
    }
  });

  it("hard mazes include meaningful dead ends and branches", () => {
    for (let i = 0; i < 3; i++) {
      const { maze, analysis } = generateValidatedMaze(10, "hard");
      expect(solveMaze(maze).pathLength).toBe(analysis.pathLength);
      expect(analysis.deadEnds).toBeGreaterThanOrEqual(6);
      expect(analysis.branches).toBeGreaterThanOrEqual(3);
      expect(analysis.pathLength).toBeGreaterThanOrEqual(10);
    }
  });

  it("easy mazes are smaller but not trivial corridors", () => {
    const { analysis } = generateValidatedMaze(5, "easy");
    expect(analysis.deadEnds).toBeGreaterThanOrEqual(2);
    expect(analysis.pathLength).toBeGreaterThanOrEqual(4);
  });
});
