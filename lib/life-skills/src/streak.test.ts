import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeLifeSkillStreak,
  buildLifeSkillWeeklyBar,
  formatLifeSkillDate,
} from "./index";

function daysAgo(today: Date, n: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return formatLifeSkillDate(d);
}

describe("computeLifeSkillStreak", () => {
  const today = new Date("2026-05-03T12:00:00Z");

  it("returns 0/0 for empty input", () => {
    assert.deepEqual(computeLifeSkillStreak([], today), { current: 0, best: 0 });
  });

  it("counts a single day today as a 1-day streak", () => {
    assert.deepEqual(
      computeLifeSkillStreak([daysAgo(today, 0)], today),
      { current: 1, best: 1 },
    );
  });

  it("counts consecutive days ending today", () => {
    const dates = [0, 1, 2, 3].map((n) => daysAgo(today, n));
    assert.deepEqual(computeLifeSkillStreak(dates, today), { current: 4, best: 4 });
  });

  it("counts consecutive days ending yesterday (no entry today yet)", () => {
    const dates = [1, 2, 3].map((n) => daysAgo(today, n));
    assert.deepEqual(computeLifeSkillStreak(dates, today), { current: 3, best: 3 });
  });

  it("resets current streak when most recent entry is older than yesterday", () => {
    const dates = [3, 4, 5].map((n) => daysAgo(today, n));
    const r = computeLifeSkillStreak(dates, today);
    assert.equal(r.current, 0);
    assert.equal(r.best, 3);
  });

  it("breaks current streak on a gap but tracks best across history", () => {
    const dates = [
      ...[0, 1].map((n) => daysAgo(today, n)),
      ...[5, 6, 7, 8].map((n) => daysAgo(today, n)),
    ];
    const r = computeLifeSkillStreak(dates, today);
    assert.equal(r.current, 2);
    assert.equal(r.best, 4);
  });

  it("dedupes duplicate date strings", () => {
    const t = daysAgo(today, 0);
    assert.deepEqual(
      computeLifeSkillStreak([t, t, t], today),
      { current: 1, best: 1 },
    );
  });

  it("tolerates ISO strings with time suffix", () => {
    const dates = [
      daysAgo(today, 0) + "T08:00:00Z",
      daysAgo(today, 1) + "T22:30:00Z",
    ];
    assert.deepEqual(computeLifeSkillStreak(dates, today), { current: 2, best: 2 });
  });
});

describe("buildLifeSkillWeeklyBar", () => {
  const today = new Date("2026-05-03T12:00:00Z");

  it("always returns 7 entries oldest-first ending today", () => {
    const bar = buildLifeSkillWeeklyBar([], today);
    assert.equal(bar.length, 7);
    assert.equal(bar[6]!.date, formatLifeSkillDate(today));
    assert.equal(bar[0]!.date, daysAgo(today, 6));
    assert.ok(bar.every((d) => d.completed === false));
  });

  it("flags only days present in the input set", () => {
    const dates = [daysAgo(today, 0), daysAgo(today, 2)];
    const bar = buildLifeSkillWeeklyBar(dates, today);
    assert.equal(bar[6]!.completed, true);
    assert.equal(bar[4]!.completed, true);
    assert.equal(bar[5]!.completed, false);
    assert.equal(bar[0]!.completed, false);
  });
});
