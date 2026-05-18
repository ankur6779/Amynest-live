import { describe, expect, it } from "vitest";
import {
  COACH_INITIAL_WINS,
  COACH_TOTAL_WINS,
  mergeCoachPlan,
  validatePartialPlan,
  validatePlan,
  validateWin,
} from "./coachWinGenerationService.js";

const sampleWin = (n: number) => ({
  win: n,
  title: `Win ${n}`,
  objective: "objective",
  deep_explanation: "line one\nline two\nline three\nline four\nline five",
  actions: ["a", "b", "c"],
  example: "Example story with names.",
  mistake_to_avoid: "mistake",
  micro_task: "task",
  duration: "3 days",
  science_reference: "Piaget",
});

describe("coachWinGenerationService", () => {
  it("validatePartialPlan accepts exactly 2 wins", () => {
    const plan = {
      title: "Plan",
      root_cause: "cause",
      summary: "summary",
      wins: [sampleWin(1), sampleWin(2)],
    };
    expect(validatePartialPlan(plan)).toBe(true);
    expect(validatePlan(plan)).toBe(false);
  });

  it("mergeCoachPlan produces 12 numbered wins", () => {
    const initial = [sampleWin(1), sampleWin(2)];
    const remaining = Array.from({ length: 10 }, (_, i) => sampleWin(i + 3));
    const merged = mergeCoachPlan(
      { title: "T", root_cause: "R", summary: "S" },
      initial,
      remaining,
    );
    expect(merged.wins).toHaveLength(COACH_TOTAL_WINS);
    expect(merged.wins.every(validateWin)).toBe(true);
    expect(merged.wins.map((w) => w.win)).toEqual(
      Array.from({ length: COACH_TOTAL_WINS }, (_, i) => i + 1),
    );
    expect(merged.wins[0]!.win).toBe(1);
    expect(merged.wins[COACH_INITIAL_WINS]!.win).toBe(COACH_INITIAL_WINS + 1);
  });
});
