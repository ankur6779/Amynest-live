import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyHydrationGuidance,
  buildOutdoorAdjacentHydrationBlocks,
  MAX_STANDALONE_HYDRATION_BLOCKS,
  HYDRATION_ACTIVITY_HINT,
  type EnrichableItemWithHydration,
} from "../hydrationEnrichment.js";
import type { EnvironmentalContext } from "../types.js";

function baseCtx(overrides: Partial<EnvironmentalContext> = {}): EnvironmentalContext {
  return {
    ageGroup: "early_school_5_10",
    location: { latitude: 28.6, longitude: 77.2 },
    snapshot: { observedAt: "x", source: "test", temperatureC: 32, aqiUs: 100 },
    environmentalRiskScore: 40,
    outdoorSuitability: "limited",
    hydrationNeedLevel: "high",
    cognitiveComfortLevel: "moderate",
    sensoryStressLevel: "low",
    environmentalFatigueRisk: "low",
    circadianLightProfile: "normal",
    aqiBucket: "moderate",
    uvBucket: "moderate",
    weatherCondition: "sunny",
    season: "summer",
    explanations: [],
    tags: [],
    degraded: false,
    AQI: 100,
    temperatureC: 32,
    confidence: "high",
    exposureMode: "reduced",
    outdoorAllowed: true,
    outdoorMaxDuration: 30,
    airQualityRisk: "low",
    hydrationNeeded: true,
    ...overrides,
  };
}

const day: EnrichableItemWithHydration[] = [
  { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine" },
  { time: "15:00", activity: "Park play", duration: 45, category: "outdoor" },
  { time: "16:00", activity: "Study", duration: 40, category: "study" },
  { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
];

describe("applyHydrationGuidance", () => {
  it("does not insert recurring Water Break blocks", () => {
    const r = applyHydrationGuidance(day, baseCtx());
    const waterBlocks = r.items.filter((i) => i.activity === "Water Break");
    assert.equal(waterBlocks.length, 0);
  });

  it("limits standalone blocks to outdoor-adjacent max 2", () => {
    const blocks = buildOutdoorAdjacentHydrationBlocks(day, baseCtx({ temperatureC: 28 }));
    assert.ok(blocks.length <= MAX_STANDALONE_HYDRATION_BLOCKS);
  });

  it("skips standalone blocks when temperature > 35°C", () => {
    const blocks = buildOutdoorAdjacentHydrationBlocks(day, baseCtx({ temperatureC: 38 }));
    assert.equal(blocks.length, 0);
  });

  it("attaches hydration hint to outdoor on hot day", () => {
    const r = applyHydrationGuidance(day, baseCtx({ temperatureC: 38 }));
    const outdoor = r.items.find((i) => i.category === "outdoor");
    assert.equal(outdoor?.hydration, HYDRATION_ACTIVITY_HINT);
    assert.ok(r.hydrationSummary?.includes("heat"));
  });

  it("attaches hints to study when hot", () => {
    const r = applyHydrationGuidance(day, baseCtx({ temperatureC: 36 }));
    const study = r.items.find((i) => i.category === "study");
    assert.equal(study?.hydration, HYDRATION_ACTIVITY_HINT);
  });
});
