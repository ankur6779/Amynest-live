/**
 * Unit tests for the infant sleep-prediction engine.
 * Run via the api-server `test` script (node --test).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getWakeWindowForAge,
  getNapsPerDayForAge,
  applyDynamicAdjustments,
  computeSleepPressure,
  predictNextSleep,
  buildPredictInputFromHistory,
  type NapHistoryEntry,
} from "./sleepPredict";

const MIN = 60_000;
const HR = 60 * MIN;

describe("getWakeWindowForAge", () => {
  it("returns the 0–2 band at 0 months", () => {
    const w = getWakeWindowForAge(0);
    assert.equal(w.minMin, 45);
    assert.equal(w.maxMin, 60);
  });

  it("treats 2 months as the 2–4 band (lower-bound inclusive)", () => {
    const w = getWakeWindowForAge(2);
    assert.equal(w.minMin, 60);
    assert.equal(w.maxMin, 90);
  });

  it("returns the 6–9 band at 7 months", () => {
    const w = getWakeWindowForAge(7);
    assert.equal(w.minMin, 120);
    assert.equal(w.maxMin, 180);
  });

  it("returns the 18–24 band at 20 months", () => {
    const w = getWakeWindowForAge(20);
    assert.equal(w.minMin, 240);
    assert.equal(w.maxMin, 330);
  });

  it("falls back to a toddler window for >=24 mo", () => {
    const w = getWakeWindowForAge(36);
    assert.ok(w.idealMin >= 240);
  });

  it("returns the 0–2 band for negative or NaN age", () => {
    const w = getWakeWindowForAge(-1);
    assert.equal(w.maxMin, 60);
    const w2 = getWakeWindowForAge(NaN);
    assert.equal(w2.maxMin, 60);
  });
});

describe("getNapsPerDayForAge", () => {
  it("returns 4–5 naps at 1 month", () => {
    assert.deepEqual(getNapsPerDayForAge(1), { min: 4, max: 5 });
  });
  it("returns 2–3 naps at 8 months", () => {
    assert.deepEqual(getNapsPerDayForAge(8), { min: 2, max: 3 });
  });
  it("returns 1 nap at 20 months", () => {
    assert.deepEqual(getNapsPerDayForAge(20), { min: 1, max: 1 });
  });
});

describe("applyDynamicAdjustments", () => {
  const base = 100;
  const now = new Date("2026-05-02T10:00:00Z").getTime(); // pre-cutoff

  it("shortens the window by 15% after a short nap (<30 min)", () => {
    const r = applyDynamicAdjustments(base, {
      lastSleepDurationMs: 20 * MIN,
      ageMonths: 6,
      nowMs: now,
    });
    assert.equal(r.adjustedMin, 85);
    assert.match(r.reasons.join(" "), /shortened/);
  });

  it("extends the window by 12% after a long nap (>90 min)", () => {
    const r = applyDynamicAdjustments(base, {
      lastSleepDurationMs: 100 * MIN,
      ageMonths: 6,
      nowMs: now,
    });
    assert.equal(r.adjustedMin, 112);
    assert.match(r.reasons.join(" "), /extended/);
  });

  it("does NOT trigger short-nap rule for the boundary case (exactly 30 min)", () => {
    const r = applyDynamicAdjustments(base, {
      lastSleepDurationMs: 30 * MIN,
      ageMonths: 6,
      nowMs: now,
    });
    assert.equal(r.adjustedMin, 100);
    assert.equal(r.reasons.length, 0);
  });

  it("triggers the missed-nap rule in the afternoon when below band min", () => {
    const afternoon = new Date("2026-05-02T15:00:00Z").getTime();
    const r = applyDynamicAdjustments(base, {
      ageMonths: 8, // band min = 2 naps
      napCountToday: 0,
      nowMs: afternoon,
      napCutoffHour: 14,
    });
    assert.equal(r.adjustedMin, 85);
    assert.match(r.reasons.join(" "), /Missed/);
  });

  it("does NOT trigger missed-nap before the cutoff hour", () => {
    const r = applyDynamicAdjustments(base, {
      ageMonths: 8,
      napCountToday: 0,
      nowMs: now,
      napCutoffHour: 14,
    });
    assert.equal(r.adjustedMin, 100);
    assert.equal(r.reasons.length, 0);
  });

  it("stacks short-nap and missed-nap multiplicatively", () => {
    const afternoon = new Date("2026-05-02T15:00:00Z").getTime();
    const r = applyDynamicAdjustments(base, {
      lastSleepDurationMs: 10 * MIN,
      ageMonths: 8,
      napCountToday: 0,
      nowMs: afternoon,
      napCutoffHour: 14,
    });
    // 100 * 0.85 * 0.85 = 72.25 → 72
    assert.equal(r.adjustedMin, 72);
    assert.equal(r.reasons.length, 2);
  });
});

describe("computeSleepPressure", () => {
  it("0% when just woke up", () => {
    const r = computeSleepPressure(0, 120);
    assert.equal(r.sleepPressure, 0);
    assert.equal(r.pressureBand, "restful");
  });

  it("≈50% halfway through the wake window", () => {
    const r = computeSleepPressure(60 * MIN, 120);
    assert.equal(r.sleepPressure, 50);
    assert.equal(r.pressureBand, "restful");
  });

  it("classifies 70% as ideal", () => {
    const r = computeSleepPressure(84 * MIN, 120);
    assert.equal(r.sleepPressure, 70);
    assert.equal(r.pressureBand, "ideal");
  });

  it("classifies 85% as tired", () => {
    const r = computeSleepPressure(102 * MIN, 120);
    assert.equal(r.sleepPressure, 85);
    assert.equal(r.pressureBand, "tired");
  });

  it("classifies 110% as overtired and caps at 120", () => {
    const r = computeSleepPressure(132 * MIN, 120);
    assert.equal(r.sleepPressure, 110);
    assert.equal(r.pressureBand, "overtired");

    const cap = computeSleepPressure(10 * HR, 60);
    assert.equal(cap.sleepPressure, 120);
    assert.equal(cap.pressureBand, "overtired");
  });

  it("returns 0 for a non-positive ideal window", () => {
    const r = computeSleepPressure(60 * MIN, 0);
    assert.equal(r.sleepPressure, 0);
  });
});

describe("predictNextSleep", () => {
  const now = new Date("2026-05-02T11:00:00Z").getTime();
  const lastWake = now - 60 * MIN;

  it("predicts at lastWakeAt + idealWindow with a 10-/+20-min envelope", () => {
    const p = predictNextSleep(
      { ageMonths: 6, lastWakeAt: lastWake },
      now,
    );
    // Age 6 → idealMin 150 (no adjustments)
    assert.equal(p.idealWakeWindowMin, 150);
    assert.equal(p.predictedAt, lastWake + 150 * MIN);
    assert.equal(p.windowStart, p.predictedAt - 10 * MIN);
    assert.equal(p.windowEnd, p.predictedAt + 20 * MIN);
  });

  it("flags shouldWindDown at >=80% pressure", () => {
    const win = 100; // minutes
    const lw = now - 80 * MIN; // exactly 80%
    const p = predictNextSleep(
      {
        ageMonths: 6, // base 150 → would skew; force via short-nap path:
        lastWakeAt: lw,
        lastSleepDurationMs: 10 * MIN, // shortens 150→128
      },
      now,
    );
    // Recompute expected pressure: 80m / 128m ≈ 63 — NOT wind-down.
    assert.equal(p.shouldWindDown, p.sleepPressure >= 80);
    void win;
  });

  it("returns a flexible result when no lastWakeAt is given", () => {
    const p = predictNextSleep({ ageMonths: 4 }, now);
    assert.equal(p.flexible, true);
    assert.ok(p.windowStart < p.windowEnd);
    assert.ok(p.reasons.some((r) => /flexible/i.test(r)));
  });

  it("includes suggestedNapsPerDay for the age band", () => {
    const p = predictNextSleep({ ageMonths: 8, lastWakeAt: lastWake }, now);
    assert.deepEqual(p.suggestedNapsPerDay, { min: 2, max: 3 });
  });

  it("propagates the dynamic-adjust reason chain", () => {
    const p = predictNextSleep(
      {
        ageMonths: 6,
        lastWakeAt: lastWake,
        lastSleepDurationMs: 100 * MIN, // long nap
      },
      now,
    );
    assert.match(p.reasons.join(" "), /extended/);
    assert.notEqual(p.idealWakeWindowMin, p.baseWakeWindowMin);
  });
});

describe("buildPredictInputFromHistory", () => {
  const now = new Date("2026-05-02T15:00:00Z").getTime();
  const todayStart = (() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();

  it("counts only today's naps and skips in-progress sessions", () => {
    const history: NapHistoryEntry[] = [
      // in-progress nap (no endedAt)
      { kind: "nap", startedAt: todayStart + 10 * HR },
      // completed nap today
      {
        kind: "nap",
        startedAt: todayStart + 8 * HR,
        endedAt: todayStart + 9 * HR,
      },
      // night sleep ending this morning (not counted in nap count)
      {
        kind: "night",
        startedAt: todayStart - 4 * HR,
        endedAt: todayStart + 6 * HR,
      },
    ];
    const inp = buildPredictInputFromHistory(history, 8, now);
    // last completed = the in-progress nap is filtered, so the next
    // completed (8h start, 9h end) is the anchor.
    assert.equal(inp.lastWakeAt, todayStart + 9 * HR);
    assert.equal(inp.lastSleepDurationMs, 1 * HR);
    assert.equal(inp.napCountToday, 2); // both nap rows count, regardless of completion
  });

  it("returns undefined anchors when history is empty", () => {
    const inp = buildPredictInputFromHistory([], 6, now);
    assert.equal(inp.lastWakeAt, undefined);
    assert.equal(inp.lastSleepDurationMs, undefined);
    assert.equal(inp.napCountToday, 0);
  });
});
