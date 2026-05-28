import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  buildRoutineProductionDiagnostics,
  runAdaptiveCompletionPass,
} from "./routine-adaptive-completion.js";
import {
  buildPersonalizationMemory,
  InMemoryPersonalizationMemoryStore,
  recordRoutineGenerationMemory,
  setPersonalizationMemoryStore,
} from "./routine-personalization-memory.js";
import { getCountryLabelPack } from "./routine-country-profile.js";
import { applyDeterministicActivityFreshness } from "./routine-activity-freshness.js";
import { applyMultiDayContinuity } from "./routine-continuity.js";
import { applyAutonomyDevelopment } from "./routine-autonomy-development.js";
import { pickDeterministicFreshLabel } from "./routine-activity-metadata.js";
import { normalizeActivityKey } from "./routine-activity-metadata.js";

const WAKE = 7 * 60 + 30;
const SLEEP = 21 * 60 + 30;

describe("pickDeterministicFreshLabel", () => {
  it("returns alternate catalog label deterministically", () => {
    const a = pickDeterministicFreshLabel("Outdoor play", 1, new Set());
    const b = pickDeterministicFreshLabel("Outdoor play", 1, new Set());
    assert.equal(a, b);
    assert.notEqual(normalizeActivityKey(a ?? ""), normalizeActivityKey("Outdoor play"));
  });
});

describe("personalization memory", () => {
  beforeEach(() => {
    setPersonalizationMemoryStore(new InMemoryPersonalizationMemoryStore());
  });

  it("records and recalls generation snapshots", () => {
    recordRoutineGenerationMemory({
      childId: "child-1",
      routineDate: "2026-05-27",
      activities: ["Outdoor play", "Homework"],
    });
    const memory = buildPersonalizationMemory({ childId: "child-1" });
    assert.equal(memory.snapshotCount, 1);
    assert.ok(memory.recentDayKeys[0]?.includes(normalizeActivityKey("Outdoor play")));
  });
});

describe("applyMultiDayContinuity", () => {
  beforeEach(() => {
    setPersonalizationMemoryStore(new InMemoryPersonalizationMemoryStore());
  });

  it("rotates activity repeated from yesterday", () => {
    recordRoutineGenerationMemory({
      childId: "c1",
      routineDate: "2026-05-27",
      activities: ["Indoor creative play"],
    });
    const memory = buildPersonalizationMemory({ childId: "c1" });
    const { adjustments } = applyMultiDayContinuity(
      [
        {
          time: "15:00",
          activity: "Indoor creative play",
          duration: 30,
          category: "creative",
          status: "pending",
        },
      ],
      { memory, seed: 5 },
    );
    assert.ok(adjustments.length > 0);
  });
});

describe("applyDeterministicActivityFreshness", () => {
  it("rotates duplicate labels within the same day", () => {
    const memory = buildPersonalizationMemory({});
    const { items, adjustments } = applyDeterministicActivityFreshness(
      [
        { time: "10:00", activity: "Outdoor play", duration: 30, category: "outdoor", status: "pending" },
        { time: "14:00", activity: "Outdoor play", duration: 30, category: "outdoor", status: "pending" },
      ],
      { memory, seed: 9, repeatThreshold: 2 },
    );
    assert.ok(adjustments.length > 0);
    const keys = items.map((i) => normalizeActivityKey(i.activity));
    assert.notEqual(keys[0], keys[1]);
  });
});

describe("applyAutonomyDevelopment", () => {
  it("inserts independence blocks for pre_teen when required", () => {
    const { items, adjustments } = applyAutonomyDevelopment(
      [
        { time: "08:00", activity: "Breakfast", duration: 30, category: "meal", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      {
        ageGroup: "pre_teen",
        requireIndependenceTasks: true,
        independenceMorningLabel: "Get ready on your own",
        independenceEveningLabel: "Pack backpack for tomorrow",
        wakeMins: WAKE,
        sleepMins: SLEEP,
      },
    );
    assert.ok(adjustments.length >= 1);
    assert.ok(items.some((i) => /get ready|pack backpack/i.test(i.activity)));
  });
});

describe("buildRoutineProductionDiagnostics", () => {
  it("scores production-ready valid routines highly", () => {
    const diag = buildRoutineProductionDiagnostics({
      itemCount: 14,
      validated: true,
      reverted: false,
      confidence: "high",
      adjustmentCount: 3,
      warningCount: 0,
      country: "US",
      dayType: "active",
    });
    assert.equal(diag.readinessTier, "production");
    assert.ok(diag.readinessScore >= 85);
    assert.equal(diag.signals.timelineValid, true);
  });
});

describe("runAdaptiveCompletionPass", () => {
  beforeEach(() => {
    setPersonalizationMemoryStore(new InMemoryPersonalizationMemoryStore());
  });

  it("runs all completion layers without crashing", () => {
    const { items, summary } = runAdaptiveCompletionPass(
      [
        { time: "08:00", activity: "Outdoor play", duration: 40, category: "outdoor", status: "pending" },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      {
        routineDate: "2026-05-28",
        wakeMins: WAKE,
        sleepMins: SLEEP,
        ageGroup: "pre_teen",
        state: {
          requireIndependenceTasks: true,
          labels: getCountryLabelPack("US"),
          country: "US",
        },
        seed: 42,
      },
    );
    assert.ok(items.length >= 3);
    assert.ok(summary.memory);
  });
});
