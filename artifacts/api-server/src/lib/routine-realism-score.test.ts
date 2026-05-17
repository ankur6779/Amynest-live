import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateAdaptiveInfantDayRoutine,
  generateValidatedInfantRoutine,
} from "./infant-adaptive-routine.js";
import {
  buildRoutineContext,
  rewriteForRealism,
  scoreInfantRoutine,
} from "./routine-realism-score.js";

const SCENARIO_7MO = {
  ageMonths: 7,
  wakeTime: "06:45",
  sleepTime: "19:15",
  nightWakings: { count: 2, severity: "moderate" as const },
  feedingType: "mixed" as const,
  aqi: 220,
  specialEvents: [{ label: "Doctor visit", time: "11:30" }],
  constraints: ["poor sleep previous night"],
  location: "Delhi",
  weather: "Hazy",
};

function countFeeds(blocks: { kind: string; activity: string }[]): number {
  return blocks.filter(
    (b) =>
      b.kind === "feed" ||
      /\b(breast|formula|milk feed|feeding)\b/i.test(b.activity),
  ).length;
}

describe("scoreInfantRoutine", () => {
  it("scores raw generated routine low (strict)", () => {
    const raw = generateAdaptiveInfantDayRoutine(SCENARIO_7MO);
    const ctx = buildRoutineContext(SCENARIO_7MO, {
      min: raw.wakeWindowMin,
      max: raw.wakeWindowMax,
    });
    const score = scoreInfantRoutine(raw.blocks, ctx);
    assert.ok(
      score.total < 50,
      `expected low realism before rewrite, got ${score.total}`,
    );
    assert.ok(score.issues.some((i) => /fragment|feed|precise|buffer/i.test(i)));
  });

  it("scores rewritten routine ≥80", () => {
    const raw = generateAdaptiveInfantDayRoutine(SCENARIO_7MO);
    const ctx = buildRoutineContext(SCENARIO_7MO, {
      min: raw.wakeWindowMin,
      max: raw.wakeWindowMax,
    });
    const rewritten = rewriteForRealism(raw.blocks, ctx);
    const score = scoreInfantRoutine(rewritten, ctx);
    assert.ok(
      score.total >= 80,
      `expected ≥80 after rewrite, got ${score.total}: ${score.issues.join("; ")}`,
    );
    assert.ok(rewritten.length <= 14);
    assert.ok(countFeeds(rewritten) <= 6);
  });
});

describe("generateValidatedInfantRoutine realism layer", () => {
  it("7mo scenario: audit pass, realism ≥80, ≤14 blocks, ≤7 feeds", () => {
    const out = generateValidatedInfantRoutine(SCENARIO_7MO);

    assert.equal(out.finalAudit.allPassed, true);
    assert.ok(out.realismRewriteApplied);
    assert.ok(out.realismScoreBeforeRewrite);
    assert.ok(out.realismScoreBeforeRewrite!.total < 50);
    assert.ok(out.realismScore.total >= 80);
    assert.ok(out.result.blocks.length <= 14);
    assert.ok(countFeeds(out.result.blocks) <= 7);

    const notes = out.result.blocks.map((b) => b.notes ?? "").join(" ");
    assert.ok(
      /late|short|cranky|fussy|long|rough/i.test(notes),
      "expected at least one imperfect note",
    );
    assert.equal(
      out.result.blocks.some((b) => b.kind === "outdoor"),
      false,
    );
  });
});
