import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatParentRoutineExplanation,
  isInternalAdaptationToken,
} from "./routine-parent-explanation.js";

describe("formatParentRoutineExplanation", () => {
  it("strips internal debug tokens", () => {
    const out = formatParentRoutineExplanation(
      [
        "behavior:focusSpan=short",
        "schedule:meal-day: duplicate lunch",
        "learning:boost:meal",
        "decision:priority:shift",
        "Weekend mode — relaxed timings and extra family bonding.",
      ],
      { isWeekendDay: true },
    );
    assert.equal(out.bullets.length, 1);
    assert.match(out.bullets[0]!, /Weekend mode/i);
    assert.ok(!out.bullets.some((b) => /behavior:|schedule:|learning:|decision:/i.test(b)));
  });

  it("humanizes meal variety warnings", () => {
    const out = formatParentRoutineExplanation([
      'meal-variety: duplicate rice base across "After-school refuel" and "Dinner"',
    ]);
    assert.equal(out.bullets.length, 1);
    assert.match(out.bullets[0]!, /variety/i);
    assert.ok(!out.bullets[0]!.includes("duplicate rice"));
  });

  it("deduplicates similar lines", () => {
    const out = formatParentRoutineExplanation([
      "Weekend mode — relaxed timings and extra family bonding.",
      "Weekend mode — relaxed timings and extra family bonding.",
    ]);
    assert.equal(out.bullets.length, 1);
  });

  it("limits to six bullets", () => {
    const out = formatParentRoutineExplanation(
      Array.from({ length: 12 }, (_, i) => `Goal line ${i} — parent goal ${i}.`),
    );
    assert.ok(out.bullets.length <= 6);
  });

  it("includes summary line", () => {
    const out = formatParentRoutineExplanation(["School day — activities planned around your child's school hours."]);
    assert.match(out.summary, /Here's how Amy adapted/i);
  });

  it("drops invalid meal-day issues that were fixed", () => {
    const out = formatParentRoutineExplanation([
      "meal-day: after-school refuel must not appear on non-school day",
    ]);
    assert.equal(out.bullets.length, 0);
  });
});

describe("isInternalAdaptationToken", () => {
  it("flags debug prefixes", () => {
    assert.ok(isInternalAdaptationToken("behavior:energy=high"));
    assert.ok(!isInternalAdaptationToken("Outdoor time shortened — air quality is elevated."));
  });
});
