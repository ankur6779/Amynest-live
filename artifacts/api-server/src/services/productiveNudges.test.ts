/**
 * Phase 4 — productive nudges pure ranker.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeProductiveNudges,
  renderNudgeBodyForPush,
  type ProductiveNudgesInput,
} from "./productiveNudges.js";
import type { WeeklyReport, RiskWindow } from "./intelligenceAnalytics.js";
import type { LearningWeights } from "./learningWeights.js";

const baseWeekly: WeeklyReport = {
  childId: 1,
  rangeStart: "2025-01-01",
  rangeEnd: "2025-01-07",
  signalDays: 5,
  streakDays: 3,
  averages: {
    mood: 3,
    focusScore: 3,
    sleepQuality: 3,
    completionPct: 60,
    screenMinutes: 30,
    tantrumsPerDay: 1,
  },
  deltas: {
    mood: 0,
    focusScore: 0,
    sleepQuality: 0,
    completionPct: 0,
    tantrumsPerDay: 0,
  },
  goalProgress: [],
};

const emptyInput: ProductiveNudgesInput = {
  weekly: baseWeekly,
  risks: [],
  learning: null,
};

describe("computeProductiveNudges", () => {
  it("returns no nudges when there is no signal of any kind", () => {
    assert.deepEqual(computeProductiveNudges(emptyInput), []);
  });

  it("emits a risk_window nudge with the upstream suggestion code", () => {
    const risks: RiskWindow[] = [
      {
        startHour: 17,
        endHour: 18,
        negativeCount: 4,
        daysObserved: 3,
        suggestion: "risk:afternoon:swap_demanding_for_outdoor",
      },
    ];
    const out = computeProductiveNudges({ ...emptyInput, risks });
    assert.equal(out.length, 1);
    assert.equal(out[0].kind, "risk_window");
    assert.equal(out[0].suggestionCode, "risk:afternoon:swap_demanding_for_outdoor");
    assert.equal(out[0].hour, 17);
    assert.ok(out[0].priority >= 90);
  });

  it("ranks risk windows above goal slipping above demotes above boosts", () => {
    const learning: LearningWeights = {
      childId: 1,
      categoryWeights: [
        { category: "outdoor", weight: 0.6, positive: 6, negative: 0 },
        { category: "screens", weight: -0.5, positive: 0, negative: 4 },
      ],
      slotSuccess: [],
      lastComputedAt: new Date().toISOString(),
      sample: 20,
    };
    const weekly: WeeklyReport = {
      ...baseWeekly,
      goalProgress: [
        { goal: "improve_sleep", direction: "down", note: "goal:improve_sleep:down:-0.4" },
      ],
    };
    const risks: RiskWindow[] = [
      {
        startHour: 9,
        endHour: 10,
        negativeCount: 2,
        daysObserved: 2,
        suggestion: "risk:morning:add_calm_block",
      },
    ];
    const out = computeProductiveNudges({ weekly, risks, learning });
    const kinds = out.map((n) => n.kind);
    assert.equal(kinds[0], "risk_window");
    assert.equal(kinds[1], "goal_slipping");
    assert.equal(kinds[2], "demote");
    assert.ok(kinds.includes("boost"));
    // verify boost comes after demote
    assert.ok(kinds.indexOf("demote") < kinds.indexOf("boost"));
  });

  it("ignores learning weights when sample is below the evidence threshold", () => {
    const learning: LearningWeights = {
      childId: 1,
      categoryWeights: [{ category: "outdoor", weight: 0.9, positive: 9, negative: 0 }],
      slotSuccess: [{ hour: 9, completionRate: 10, sample: 5 }],
      lastComputedAt: new Date().toISOString(),
      sample: 3,
    };
    const out = computeProductiveNudges({ ...emptyInput, learning });
    assert.deepEqual(out, []);
  });

  it("emits a streak nudge only at 7+ consecutive days", () => {
    const six = computeProductiveNudges({
      ...emptyInput,
      weekly: { ...baseWeekly, streakDays: 6 },
    });
    assert.equal(six.find((n) => n.kind === "streak"), undefined);
    const seven = computeProductiveNudges({
      ...emptyInput,
      weekly: { ...baseWeekly, streakDays: 7 },
    });
    const streak = seven.find((n) => n.kind === "streak");
    assert.ok(streak);
    assert.equal(streak!.value, 7);
  });

  it("caps output at 5 nudges and is stable for ties", () => {
    const learning: LearningWeights = {
      childId: 1,
      categoryWeights: Array.from({ length: 8 }, (_, i) => ({
        category: `c${i}`,
        weight: -0.5,
        positive: 0,
        negative: 5,
      })),
      slotSuccess: [],
      lastComputedAt: new Date().toISOString(),
      sample: 50,
    };
    const out = computeProductiveNudges({ ...emptyInput, learning });
    assert.equal(out.length, 5);
    // tie-break by id ascending → c0..c4
    assert.deepEqual(
      out.map((n) => n.category),
      ["c0", "c1", "c2", "c3", "c4"],
    );
  });

  it("emits a weak_slot nudge only when sample >= 3 AND rate <= 40", () => {
    const learning: LearningWeights = {
      childId: 1,
      categoryWeights: [],
      slotSuccess: [
        { hour: 9, completionRate: 35, sample: 5 }, // qualifies
        { hour: 14, completionRate: 30, sample: 2 }, // sample too small
        { hour: 18, completionRate: 80, sample: 10 }, // rate too high
      ],
      lastComputedAt: new Date().toISOString(),
      sample: 17,
    };
    const out = computeProductiveNudges({ ...emptyInput, learning });
    const slots = out.filter((n) => n.kind === "weak_slot");
    assert.equal(slots.length, 1);
    assert.equal(slots[0].hour, 9);
  });
});

describe("computeProductiveNudges — dedup", () => {
  it("collapses duplicate ids and keeps the highest-priority entry", () => {
    // Craft inputs that legitimately produce the same id twice: a category
    // weight of -0.4 (demote @ 70) AND +0.4 (boost @ 50) under different ids,
    // plus a synthetic risk window that shares an hour with a weak slot.
    const learning: LearningWeights = {
      childId: 1,
      categoryWeights: [
        { category: "screens", weight: -0.5, positive: 1, negative: 6 },
      ],
      slotSuccess: [
        { hour: 17, completionRate: 30, sample: 5 },
      ],
      lastComputedAt: "2025-01-07T00:00:00.000Z",
      sample: 10,
    };
    const risks: RiskWindow[] = [
      { startHour: 17, endHour: 18, negativeCount: 3, suggestion: "risk:afternoon:swap_demanding_for_outdoor" },
      // Duplicate startHour — defensive: dedup by id "risk:17" should keep one.
      { startHour: 17, endHour: 18, negativeCount: 5, suggestion: "risk:afternoon:swap_demanding_for_outdoor" },
    ];
    const result = computeProductiveNudges({ weekly: baseWeekly, risks, learning });
    const riskNudges = result.filter((n) => n.id === "risk:17");
    assert.equal(riskNudges.length, 1, "risk:17 should be deduped to a single entry");
    // Higher-priority entry (negativeCount=5 → priority 95) wins over (count=3 → 93).
    assert.equal(riskNudges[0]!.priority, 95);
    // All ids are unique overall.
    const ids = result.map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length, "all nudge ids must be unique");
  });
});

describe("renderNudgeBodyForPush", () => {
  it("renders each nudge kind into a non-empty short string", () => {
    const kinds = [
      { id: "risk:17", kind: "risk_window", priority: 95, suggestionCode: "risk:afternoon:swap_demanding_for_outdoor", hour: 17 },
      { id: "goal_down:improve_sleep", kind: "goal_slipping", priority: 80, suggestionCode: "nudge:goal_down:improve_sleep", goal: "improve_sleep", direction: "down" as const },
      { id: "demote:screens", kind: "demote", priority: 70, suggestionCode: "nudge:demote:screens", category: "screens", value: -0.5 },
      { id: "weak_slot:9", kind: "weak_slot", priority: 60, suggestionCode: "nudge:weak_slot:9", hour: 9, value: 30 },
      { id: "boost:outdoor", kind: "boost", priority: 50, suggestionCode: "nudge:boost:outdoor", category: "outdoor", value: 0.6 },
      { id: "streak:7", kind: "streak", priority: 40, suggestionCode: "nudge:streak", value: 7 },
      { id: "goal_up:improve_focus", kind: "goal_up", priority: 30, suggestionCode: "nudge:goal_up:improve_focus", goal: "improve_focus", direction: "up" as const },
    ] as const;
    for (const n of kinds) {
      const body = renderNudgeBodyForPush(n, "Maya");
      assert.ok(body.length > 0);
      assert.ok(body.length <= 110, `body too long: ${body.length} chars: ${body}`);
    }
  });
});
