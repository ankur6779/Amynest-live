import { describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ??=
  "postgresql://localhost:5432/amynest_test?connect_timeout=1";

const {
  COACH_INITIAL_WINS,
  COACH_TOTAL_WINS,
  mergeCoachPlan,
  validatePartialPlan,
  validatePlan,
  validateWin,
} = await import("./coachWinGenerationService.js");

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
    assert.equal(validatePartialPlan(plan), true);
    assert.equal(validatePlan(plan), false);
  });

  it("mergeCoachPlan produces 12 numbered wins", () => {
    const initial = [sampleWin(1), sampleWin(2)];
    const remaining = Array.from({ length: 10 }, (_, i) => sampleWin(i + 3));
    const merged = mergeCoachPlan(
      { title: "T", root_cause: "R", summary: "S" },
      initial,
      remaining,
    );
    assert.equal(merged.wins.length, COACH_TOTAL_WINS);
    assert.equal(merged.wins.every(validateWin), true);
    assert.deepEqual(
      merged.wins.map((w) => w.win),
      Array.from({ length: COACH_TOTAL_WINS }, (_, i) => i + 1),
    );
    assert.equal(merged.wins[0]!.win, 1);
    assert.equal(merged.wins[COACH_INITIAL_WINS]!.win, COACH_INITIAL_WINS + 1);
  });
});
