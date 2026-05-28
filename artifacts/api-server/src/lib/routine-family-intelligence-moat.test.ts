import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  buildFamilyIntelligenceProfile,
  finalizeFamilyIntelligenceMoat,
  prepareFamilyIntelligenceInput,
  FAMILY_INTELLIGENCE_MOAT_VERSION,
} from "./routine-family-intelligence-moat.js";
import {
  calculateDevelopmentalTrajectory,
} from "./routine-developmental-trajectory.js";
import { generateFamilyInsights } from "./routine-family-insights.js";
import {
  buildPersonalizationMemory,
  InMemoryPersonalizationMemoryStore,
  recordRoutineGenerationMemory,
  setPersonalizationMemoryStore,
} from "./routine-personalization-memory.js";
import {
  InMemoryFamilyIntelligenceStore,
  setFamilyIntelligenceStore,
} from "./routine-family-intelligence-store.js";
import { buildRoutineContext } from "./routine-context-builder.js";
import { getRoutineOutcomeStore, logRoutineOutcome } from "./routine-outcome-log.js";

describe("calculateDevelopmentalTrajectory", () => {
  it("flags needs_support when completion is low and skips are high", () => {
    const memory = buildPersonalizationMemory({
      childId: "c1",
      history: {
        entries: [],
        previousDayContext: { sleepQuality: "poor", moodScore: "cranky" },
      },
    });
    const trajectory = calculateDevelopmentalTrajectory({
      childId: "c1",
      memory: {
        ...memory,
        completionRate: 0.35,
        skippedActivityKeys: ["homework", "outdoor play", "creative play"],
        completedActivityKeys: ["breakfast"],
      },
      history: {
        entries: [],
        previousDayContext: { sleepQuality: "poor", moodScore: "cranky" },
      },
    });
    assert.equal(trajectory.regulationTrend, "needs_support");
    assert.equal(trajectory.energyStability, "needs_support");
  });
});

describe("generateFamilyInsights", () => {
  it("never emits diagnostic language", () => {
    const memory = buildPersonalizationMemory({});
    const trajectory = calculateDevelopmentalTrajectory({ memory });
    const insights = generateFamilyInsights({
      trajectory,
      hints: {
        suggestLowEnergy: true,
        suggestReduceStudy: true,
        suggestCalmEvening: true,
        suggestConnectionFocus: true,
        confidence: "medium",
        rationale: [],
      },
      memory,
    });
    assert.ok(insights.length > 0);
    for (const i of insights) {
      assert.ok(!/diagnos|adhd|autism|delayed/i.test(i.message));
    }
  });
});

describe("prepareFamilyIntelligenceInput", () => {
  beforeEach(() => {
    setPersonalizationMemoryStore(new InMemoryPersonalizationMemoryStore());
    setFamilyIntelligenceStore(new InMemoryFamilyIntelligenceStore());
    getRoutineOutcomeStore().clear();
  });

  it("enriches previous-day context when child id present", () => {
    logRoutineOutcome("Homework", false, true, {
      childId: "child-a",
      category: "study",
    });
    const builtContext = buildRoutineContext({
      country: "US",
      weatherOutdoor: "yes",
    });
    const result = prepareFamilyIntelligenceInput({
      childId: "child-a",
      routineDate: "2026-05-28",
      builtContext,
    });
    assert.equal(result.applied, true);
    assert.ok(result.profile);
    assert.equal(result.profile!.moatVersion, FAMILY_INTELLIGENCE_MOAT_VERSION);
    assert.ok(result.enrichedContext.previousDayContext);
  });

  it("returns unchanged context without child id", () => {
    const builtContext = buildRoutineContext({ country: "IN" });
    const result = prepareFamilyIntelligenceInput({
      routineDate: "2026-05-28",
      builtContext,
    });
    assert.equal(result.applied, false);
    assert.equal(result.profile, null);
  });
});

describe("finalizeFamilyIntelligenceMoat", () => {
  beforeEach(() => {
    setPersonalizationMemoryStore(new InMemoryPersonalizationMemoryStore());
    setFamilyIntelligenceStore(new InMemoryFamilyIntelligenceStore());
  });

  it("persists trajectory and returns insights", () => {
    recordRoutineGenerationMemory({
      childId: "child-b",
      routineDate: "2026-05-27",
      activities: ["Outdoor play", "Homework"],
    });
    const profile = buildFamilyIntelligenceProfile({
      childId: "child-b",
      routineDate: "2026-05-28",
      builtContext: buildRoutineContext({ country: "US" }),
    });
    assert.ok(profile);

    const finalized = finalizeFamilyIntelligenceMoat({
      childId: "child-b",
      routineDate: "2026-05-28",
      profile: profile!,
      items: [
        { time: "08:00", activity: "Breakfast", duration: 30, category: "meal", status: "pending" },
      ],
    });
    assert.equal(finalized.platformReadiness, "family_intelligence_active");
    assert.ok(finalized.insights.length > 0);
    assert.ok(finalized.profile.trustScore >= 0);
  });
});
