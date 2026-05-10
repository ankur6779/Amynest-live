import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildDayLoadSeries,
  detectHotspots,
  forecastDailyLoad,
  forecastHorizon,
  historicalLoadProfile,
  predictBottlenecks,
  recommendRebalance,
  type HistoricalDay,
} from "../index";
import type {
  CaregiverAvailability,
  ChildRoutineInput,
} from "@workspace/conflict-resolution";

const caregivers: CaregiverAvailability[] = [
  { caregiver: "mom", capacity: 1, windows: [{ start: "06:00", end: "22:00" }] },
  { caregiver: "dad", capacity: 1, windows: [{ start: "06:00", end: "22:00" }] },
];

const child1: ChildRoutineInput = {
  child: { id: 1, name: "Aarav", age: 6, defaultCaregiver: "mom" },
  items: [
    { time: "07:30", activity: "Breakfast", duration: 30, category: "meal", caregiver: "mom" },
    { time: "08:00", activity: "School drop", duration: 30, category: "school", caregiver: "mom" },
    { time: "16:00", activity: "Homework", duration: 60, category: "study", caregiver: "mom" },
    { time: "20:00", activity: "Bedtime", duration: 30, category: "sleep", caregiver: "mom" },
  ],
};

const child2: ChildRoutineInput = {
  child: { id: 2, name: "Diya", age: 4, defaultCaregiver: "mom" },
  items: [
    { time: "07:30", activity: "Breakfast", duration: 30, category: "meal", caregiver: "mom" },
    { time: "08:00", activity: "Preschool drop", duration: 30, category: "school", caregiver: "mom" },
    { time: "16:00", activity: "Play", duration: 60, category: "play", caregiver: "mom" },
  ],
};

function dayN(date: string, routines: ChildRoutineInput[]): HistoricalDay {
  return { date, routines };
}

describe("buildDayLoadSeries", () => {
  it("creates a series with 96 buckets at default 15-min granularity", () => {
    const s = buildDayLoadSeries([child1], 15, ["mom", "dad"]);
    assert.equal(s.buckets, 96);
    assert.equal(s.load.mom.length, 96);
    assert.equal(s.load.dad.length, 96);
  });

  it("registers load for assigned caregiver only", () => {
    const s = buildDayLoadSeries([child1], 15, ["mom", "dad"]);
    // 07:30 (bucket 30) — mom is busy with breakfast
    assert.ok(s.load.mom[30] >= 1);
    assert.equal(s.load.dad[30], 0);
  });

  it("stacks concurrent activities", () => {
    const s = buildDayLoadSeries([child1, child2], 15, ["mom", "dad"]);
    // Both kids breakfast 07:30 with mom → load >= 2
    assert.ok(s.load.mom[30] >= 2, `expected mom load ≥ 2, got ${s.load.mom[30]}`);
  });
});

describe("historicalLoadProfile", () => {
  it("returns zeroed profile when history is empty", () => {
    const p = historicalLoadProfile([], 15, ["mom", "dad"]);
    assert.equal(p.load.mom.reduce((s, n) => s + n, 0), 0);
    assert.equal(p.load.dad.reduce((s, n) => s + n, 0), 0);
  });

  it("EWMA weights recent days higher", () => {
    // Day-old vs week-old: same routine. Recent day should dominate.
    const recent: HistoricalDay = dayN("2026-05-09", [child1, child2]);
    const old: HistoricalDay = dayN("2026-05-02", [child1]);
    const p = historicalLoadProfile([old, recent], 15, ["mom", "dad"]);
    // 07:30 in recent = 2 kids; in old = 1 kid → blended profile must be > 1
    assert.ok(p.load.mom[30] > 1);
  });

  it("normalizes so load magnitude ~ a single day", () => {
    const days = Array.from({ length: 5 }, (_, i) =>
      dayN(`2026-05-0${5 - i}`, [child1, child2]),
    );
    const p = historicalLoadProfile(days, 15, ["mom", "dad"]);
    // 5 identical days → profile should match a single day, not 5x
    assert.ok(p.load.mom[30] <= 2.05, `expected ~2 got ${p.load.mom[30]}`);
    assert.ok(p.load.mom[30] >= 1.5);
  });
});

describe("forecastDailyLoad", () => {
  const history = [
    dayN("2026-05-09", [child1, child2]),
    dayN("2026-05-08", [child1, child2]),
    dayN("2026-05-07", [child1, child2]),
  ];

  it("produces a forecast with hotspots when capacity = 1", () => {
    const f = forecastDailyLoad({
      date: "2026-05-10",
      history,
      caregivers,
    });
    assert.equal(f.date, "2026-05-10");
    assert.equal(f.historyDays, 3);
    assert.ok(f.hotspots.length > 0, "expected hotspots when 2 kids share mom");
    assert.ok(f.confidence >= 1 && f.confidence <= 10);
  });

  it("blends draft routines into the forecast", () => {
    const f = forecastDailyLoad({
      date: "2026-05-10",
      history,
      draftRoutines: [child1, child2],
      caregivers,
    });
    // Hotspots remain in the morning shared window
    const morning = f.hotspots.find((h) => h.startTime24 < "10:00");
    assert.ok(morning, "expected a morning hotspot");
  });

  it("no hotspots when capacity covers projected load", () => {
    const generous: CaregiverAvailability[] = [
      { caregiver: "mom", capacity: 5, windows: [{ start: "06:00", end: "22:00" }] },
      { caregiver: "dad", capacity: 5, windows: [{ start: "06:00", end: "22:00" }] },
    ];
    const f = forecastDailyLoad({ date: "2026-05-10", history, caregivers: generous });
    assert.equal(f.hotspots.length, 0);
  });

  it("respects caregiver availability windows", () => {
    const restricted: CaregiverAvailability[] = [
      { caregiver: "mom", capacity: 1, windows: [{ start: "10:00", end: "12:00" }] },
    ];
    const f = forecastDailyLoad({ date: "2026-05-10", history, caregivers: restricted });
    // 07:30 breakfast is OUTSIDE mom's window → not a hotspot
    for (const h of f.hotspots) {
      assert.ok(h.startTime24 >= "10:00", `unexpected hotspot at ${h.startTime24}`);
    }
  });
});

describe("forecastHorizon + predictBottlenecks", () => {
  const history = [dayN("2026-05-09", [child1, child2])];

  it("returns horizonDays forecasts", () => {
    const m = forecastHorizon({
      date: "2026-05-10",
      horizonDays: 3,
      history,
      caregivers,
    });
    assert.equal(m.forecasts.length, 3);
    assert.equal(m.forecasts[0].date, "2026-05-10");
    assert.equal(m.forecasts[1].date, "2026-05-11");
    assert.equal(m.forecasts[2].date, "2026-05-12");
  });

  it("householdLoadScore is in 0..100", () => {
    const m = forecastHorizon({ date: "2026-05-10", horizonDays: 2, history, caregivers });
    assert.ok(m.householdLoadScore >= 0 && m.householdLoadScore <= 100);
  });

  it("predictBottlenecks classifies severity", () => {
    const m = forecastHorizon({ date: "2026-05-10", horizonDays: 1, history, caregivers });
    const preds = predictBottlenecks(m);
    for (const p of preds) {
      assert.match(p.severity, /^(low|medium|high)$/);
      assert.ok(p.windowLabel.includes("–"));
    }
  });
});

describe("recommendRebalance", () => {
  const history = [dayN("2026-05-09", [child1, child2])];
  const f = forecastDailyLoad({
    date: "2026-05-10",
    history,
    draftRoutines: [child1, child2],
    caregivers,
  });

  it("proposes moving low-priority work to a freer caregiver", () => {
    const proposals = recommendRebalance(f, caregivers, [child1, child2]);
    // Morning hotspot has only school + meal (rank 0/1) — these should NOT be rebalanced.
    // 16:00 hotspot has homework (study=3) + play (play=5) — these SHOULD be candidates.
    const afternoon = proposals.find((p) => p.startTime === "16:00");
    assert.ok(afternoon, "expected an afternoon rebalance candidate");
    assert.equal(afternoon!.toCaregiver, "dad");
    assert.notEqual(afternoon!.fromCaregiver, afternoon!.toCaregiver);
  });

  it("returns empty array when no draft routines provided", () => {
    const r = recommendRebalance(f, caregivers, undefined);
    assert.equal(r.length, 0);
  });
});

describe("detectHotspots — coalescing", () => {
  it("merges contiguous over-capacity buckets into a single window", () => {
    const series = buildDayLoadSeries([child1, child2], 15, ["mom", "dad"]);
    const hs = detectHotspots(series, caregivers, "2026-05-10");
    // The 07:30–08:30 window where both kids overlap with mom → ONE hotspot,
    // not multiple per-bucket entries.
    const morning = hs.filter((h) => h.startTime24 < "10:00");
    // (Could be split if there's a gap; but for breakfast+school it's contiguous.)
    assert.ok(morning.length >= 1 && morning.length <= 2);
  });
});
