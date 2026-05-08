/**
 * Adaptive Family Intelligence — Phase 2 analytics pure-function tests.
 *
 * Exercises the deterministic helpers in intelligenceAnalytics.ts that don't
 * touch the database:
 *   - applyEnergyCurveToItems
 *   - detectRiskWindowsFromBehaviors
 *   - correlateBehaviorsWithItems
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyEnergyCurveToItems,
  detectRiskWindowsFromBehaviors,
  correlateBehaviorsWithItems,
  type AnalyticsRoutineItem,
} from "./intelligenceAnalytics.js";
import type { EnergyProfile } from "./childIntelligenceService.js";

const PROFILE: EnergyProfile = {
  peakFocusStart: "09:00",
  peakFocusEnd: "11:00",
  lowEnergyStart: "13:00",
  lowEnergyEnd: "15:00",
  calmWindowStart: "19:00",
  calmWindowEnd: "20:00",
  sampleCount: 5,
  lastComputedAt: "2026-05-08T00:00:00.000Z",
};

describe("applyEnergyCurveToItems", () => {
  it("is a no-op when sampleCount < 3", () => {
    const items: AnalyticsRoutineItem[] = [
      { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
      { time: "10:00", activity: "Free play", duration: 60, category: "play" },
      { time: "14:00", activity: "Math worksheet", duration: 45, category: "learning" },
    ];
    const out = applyEnergyCurveToItems(items, { ...PROFILE, sampleCount: 1 });
    assert.deepEqual(
      out.items.map((i) => i.time),
      ["08:00", "10:00", "14:00"],
    );
    assert.equal(out.adaptations.length, 0);
  });

  it("swaps a learning item out of low-energy into peak-focus window", () => {
    const items: AnalyticsRoutineItem[] = [
      { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
      { time: "10:00", activity: "Free play", duration: 60, category: "play" },
      { time: "14:00", activity: "Math worksheet", duration: 45, category: "learning" },
      { time: "19:30", activity: "Wind down", duration: 30, category: "rest" },
    ];
    const out = applyEnergyCurveToItems(items, PROFILE);
    const math = out.items.find((i) => i.activity === "Math worksheet");
    const play = out.items.find((i) => i.activity === "Free play");
    assert.equal(math?.time, "10:00", "learning should land in peak window");
    assert.equal(play?.time, "14:00", "displaced item should take learning's old slot");
    assert.ok(out.adaptations.some((s) => s.startsWith("energy:peak_focus")));
  });

  it("does not swap when learning item is already inside peak window", () => {
    const items: AnalyticsRoutineItem[] = [
      { time: "09:30", activity: "Reading", duration: 30, category: "learning" },
      { time: "12:00", activity: "Lunch", duration: 30, category: "meal" },
    ];
    const out = applyEnergyCurveToItems(items, PROFILE);
    assert.equal(out.adaptations.length, 0);
    assert.equal(out.items[0].time, "09:30");
  });

  it("returns items sorted by time after swap", () => {
    const items: AnalyticsRoutineItem[] = [
      { time: "07:00", activity: "Wake", duration: 15, category: "wake" },
      { time: "09:30", activity: "Drawing", duration: 60, category: "play" },
      { time: "13:30", activity: "Reading", duration: 45, category: "learning" },
    ];
    const out = applyEnergyCurveToItems(items, PROFILE);
    const times = out.items.map((i) => i.time);
    const sorted = [...times].sort();
    assert.deepEqual(times, sorted);
  });
});

describe("detectRiskWindowsFromBehaviors", () => {
  it("returns empty when no negative behaviors", () => {
    const r = detectRiskWindowsFromBehaviors([
      { type: "positive", createdAt: new Date("2026-05-01T15:00:00") },
      { type: "positive", createdAt: new Date("2026-05-02T15:30:00") },
    ]);
    assert.deepEqual(r, []);
  });

  it("flags an hour with ≥2 negatives spanning ≥2 days", () => {
    const r = detectRiskWindowsFromBehaviors([
      { type: "negative", createdAt: new Date("2026-05-01T16:10:00") },
      { type: "negative", createdAt: new Date("2026-05-02T16:40:00") },
      { type: "negative", createdAt: new Date("2026-05-03T16:05:00") },
    ]);
    assert.equal(r.length, 1);
    assert.equal(r[0].startHour, 16);
    assert.equal(r[0].negativeCount, 3);
    assert.equal(r[0].daysObserved, 3);
    assert.ok(r[0].suggestion.startsWith("risk:"));
  });

  it("ignores single-day clusters even if count is high", () => {
    const r = detectRiskWindowsFromBehaviors([
      { type: "negative", createdAt: new Date("2026-05-01T10:00:00") },
      { type: "negative", createdAt: new Date("2026-05-01T10:20:00") },
      { type: "negative", createdAt: new Date("2026-05-01T10:40:00") },
    ]);
    assert.deepEqual(r, []);
  });

  it("returns at most 3 windows, sorted by negativeCount desc", () => {
    const events: { type: string; createdAt: Date }[] = [];
    // 4 windows, one with 5 events, three with 2 events
    for (let h of [9, 12, 16, 20]) {
      const n = h === 9 ? 5 : 2;
      for (let i = 0; i < n; i++) {
        events.push({
          type: "negative",
          createdAt: new Date(2026, 4, 1 + i, h, 5),
        });
      }
    }
    const r = detectRiskWindowsFromBehaviors(events);
    assert.equal(r.length, 3);
    assert.equal(r[0].startHour, 9);
  });
});

describe("correlateBehaviorsWithItems", () => {
  it("ranks categories that precede positive vs negative behaviors", () => {
    const routinesByDate = new Map<string, AnalyticsRoutineItem[]>([
      [
        "2026-05-01",
        [
          { time: "09:00", activity: "Reading", duration: 30, category: "learning" },
          { time: "11:00", activity: "Outdoor play", duration: 60, category: "play" },
        ],
      ],
      [
        "2026-05-02",
        [
          { time: "09:00", activity: "Reading", duration: 30, category: "learning" },
          { time: "11:00", activity: "Outdoor play", duration: 60, category: "play" },
        ],
      ],
    ]);
    const behaviors = [
      // positive at 12:00 → preceded by play (within 2h) and learning (>2h before, skipped)
      { type: "positive", date: "2026-05-01", createdAt: new Date("2026-05-01T12:00:00") },
      { type: "positive", date: "2026-05-02", createdAt: new Date("2026-05-02T12:00:00") },
      // negative at 09:30 → preceded by learning (within 30m)
      { type: "negative", date: "2026-05-01", createdAt: new Date("2026-05-01T09:30:00") },
    ];
    const out = correlateBehaviorsWithItems(behaviors, routinesByDate);
    const play = out.find((c) => c.category === "play");
    const learning = out.find((c) => c.category === "learning");
    assert.ok(play, "play category present");
    assert.equal(play!.positive, 2);
    assert.equal(play!.negative, 0);
    assert.equal(play!.net, 2);
    assert.ok(learning, "learning category present");
    assert.equal(learning!.negative, 1);
  });

  it("skips behaviors with no routine for that date", () => {
    const out = correlateBehaviorsWithItems(
      [{ type: "positive", date: "2026-05-01", createdAt: new Date("2026-05-01T12:00:00") }],
      new Map(),
    );
    assert.deepEqual(out, []);
  });

  it("ignores neutral behaviors", () => {
    const routinesByDate = new Map<string, AnalyticsRoutineItem[]>([
      ["2026-05-01", [{ time: "10:00", activity: "X", duration: 30, category: "learning" }]],
    ]);
    const out = correlateBehaviorsWithItems(
      [{ type: "neutral", date: "2026-05-01", createdAt: new Date("2026-05-01T11:00:00") }],
      routinesByDate,
    );
    assert.deepEqual(out, []);
  });
});
