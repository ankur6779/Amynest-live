import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildParentIntelligenceAdaptations,
  deriveIntelligenceTier,
  toParentScheduleReason,
} from "./routine-parent-intelligence.js";
import {
  getRoutineOutcomeStore,
  logRoutineOutcome,
  setRoutineOutcomeStore,
  InMemoryRoutineOutcomeStore,
} from "./routine-outcome-log.js";
import {
  getPersonalizationMemoryStore,
  recordRoutineGenerationMemory,
  setPersonalizationMemoryStore,
  InMemoryPersonalizationMemoryStore,
} from "./routine-personalization-memory.js";

describe("routine-parent-intelligence", () => {
  it("toParentScheduleReason strips engine prefixes", () => {
    assert.equal(
      toParentScheduleReason("Emotion: softened activity for co-regulation"),
      "Softened activity for co-regulation.",
    );
    assert.equal(
      toParentScheduleReason("Continuity: swapped repeat from yesterday"),
      "Swapped repeat from yesterday.",
    );
  });

  it("deriveIntelligenceTier reflects revert and memory depth", () => {
    assert.equal(
      deriveIntelligenceTier({ reverted: true, snapshotCount: 5 }),
      "simplified",
    );
    assert.equal(
      deriveIntelligenceTier({
        reverted: false,
        childId: "1",
        snapshotCount: 0,
      }),
      "baseline",
    );
    assert.equal(
      deriveIntelligenceTier({
        reverted: false,
        childId: "1",
        snapshotCount: 3,
      }),
      "full",
    );
  });

  it("buildParentIntelligenceAdaptations surfaces memory when snapshots exist", () => {
    const lines = buildParentIntelligenceAdaptations({
      reverted: false,
      childId: "42",
      intelligenceTier: "full",
      familyIntelligence: {
        profile: {
          moatVersion: "test",
          childId: "42",
          routineDate: "2026-05-28",
          trajectory: {} as never,
          memory: {
            childId: "42",
            recentDayKeys: [[], []],
            skippedActivityKeys: [],
            completedActivityKeys: [],
            completionRate: 0.7,
            preferredCategories: ["play"],
            snapshotCount: 3,
          },
          predictiveHints: {} as never,
          trustScore: 80,
        },
        insights: [
          {
            id: "rhythm-improving",
            category: "rhythm",
            message: "Daily rhythm looks steadier.",
            priority: 80,
          },
        ],
        platformReadiness: "family_intelligence_active",
      },
    });
    assert.ok(lines.some((l) => /building on 3 recent/i.test(l)));
    assert.ok(lines.some((l) => /steadier/i.test(l)));
  });
});

describe("routine outcome + personalization bounds", () => {
  it("caps outcomes per child and dedupes by deterministic id", () => {
    setRoutineOutcomeStore(new InMemoryRoutineOutcomeStore());
    const store = getRoutineOutcomeStore();
    store.clear();

    for (let i = 0; i < 250; i++) {
      logRoutineOutcome(`Activity ${i}`, true, false, {
        childId: "c1",
        routineDate: "2026-05-28",
        category: "play",
      });
    }
    const listed = store.list({ childId: "c1" });
    assert.ok(listed.length <= 200);

    const dup = logRoutineOutcome("Same", true, false, {
      childId: "c1",
      routineDate: "2026-05-29",
      category: "play",
    });
    const dup2 = logRoutineOutcome("Same", true, false, {
      childId: "c1",
      routineDate: "2026-05-29",
      category: "play",
    });
    assert.equal(dup.id, dup2.id);
  });

  it("caps personalization snapshots per child", () => {
    setPersonalizationMemoryStore(new InMemoryPersonalizationMemoryStore());
    const mem = getPersonalizationMemoryStore();
    mem.clear();

    for (let d = 1; d <= 20; d++) {
      recordRoutineGenerationMemory({
        childId: "c2",
        routineDate: `2026-05-${String(d).padStart(2, "0")}`,
        activities: [`Act ${d}`],
      });
    }
    assert.equal(mem.listSnapshots("c2", 20).length, 14);
  });
});
