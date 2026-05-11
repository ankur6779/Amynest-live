import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildEnvironmentalContext,
  classifyAqi,
  classifyUv,
  classifyWeather,
  classifySeason,
} from "../risk.js";
import { buildExplanations } from "../explainability.js";
import { mapToWeatherOutdoor } from "../weatherMapper.js";
import { mapAgeGroupToEnvAgeGroup } from "../ageMapper.js";
import type { AtmosphericSnapshot } from "../types.js";

const baseSnapshot = (overrides: Partial<AtmosphericSnapshot> = {}): AtmosphericSnapshot => ({
  observedAt: "2026-05-11T08:00:00Z",
  source: "test",
  temperatureC: 24,
  apparentC: 24,
  humidityPct: 55,
  precipitationMm: 0,
  precipitationProbability: 10,
  cloudCoverPct: 30,
  windKph: 8,
  uvIndexMax: 4,
  aqiUs: 40,
  daylightMinutes: 720,
  ...overrides,
});

describe("classifiers", () => {
  it("classifies AQI buckets", () => {
    assert.equal(classifyAqi(20), "excellent");
    assert.equal(classifyAqi(75), "moderate");
    assert.equal(classifyAqi(160), "unhealthy");
    assert.equal(classifyAqi(350), "hazardous");
  });
  it("classifies UV buckets", () => {
    assert.equal(classifyUv(1), "low");
    assert.equal(classifyUv(6), "high");
    assert.equal(classifyUv(11), "extreme");
  });
  it("classifies seasons (NH)", () => {
    assert.equal(classifySeason(7), "monsoon");
    assert.equal(classifySeason(4), "summer");
    assert.equal(classifySeason(1), "winter");
  });
  it("classifies weather conditions", () => {
    assert.equal(classifyWeather(baseSnapshot({ apparentC: 38 })), "heatwave");
    assert.equal(classifyWeather(baseSnapshot({ humidityPct: 88, apparentC: 30 })), "humid");
    assert.equal(classifyWeather(baseSnapshot({ apparentC: 4 })), "cold");
    assert.equal(classifyWeather(baseSnapshot({ precipitationProbability: 80, precipitationMm: 4 })), "rainy");
  });
});

describe("buildEnvironmentalContext", () => {
  const loc = { latitude: 28.6, longitude: 77.2, label: "Delhi" };

  it("produces low-risk context for benign weather", () => {
    const ctx = buildEnvironmentalContext({
      snapshot: baseSnapshot(),
      ageGroup: "early_school_5_10",
      location: loc,
    });
    assert.equal(ctx.outdoorSuitability, "yes");
    assert.ok(ctx.environmentalRiskScore < 30);
    assert.equal(ctx.aqiBucket, "good");
    assert.equal(ctx.weatherCondition, "sunny");
  });

  it("escalates risk for infants under heatwave + bad AQI", () => {
    const ctx = buildEnvironmentalContext({
      snapshot: baseSnapshot({ apparentC: 40, aqiUs: 220, uvIndexMax: 10 }),
      ageGroup: "infant_0_1",
      location: loc,
    });
    assert.notEqual(ctx.outdoorSuitability, "yes");
    assert.ok(ctx.environmentalRiskScore >= 50);
    assert.equal(ctx.aqiBucket, "very_unhealthy");
    assert.ok(["very_high", "extreme"].includes(ctx.uvBucket));
  });

  it("infant risk > preteen risk for the same conditions (age weighting)", () => {
    const harsh = baseSnapshot({ apparentC: 38, aqiUs: 180, uvIndexMax: 9 });
    const infant = buildEnvironmentalContext({ snapshot: harsh, ageGroup: "infant_0_1", location: loc });
    const preteen = buildEnvironmentalContext({ snapshot: harsh, ageGroup: "preteen_10_15", location: loc });
    assert.ok(infant.environmentalRiskScore > preteen.environmentalRiskScore);
  });

  it("flags degraded when snapshot source is fallback", () => {
    const ctx = buildEnvironmentalContext({
      snapshot: { observedAt: "x", source: "fallback" },
      ageGroup: "preschool_3_5",
      location: loc,
    });
    assert.equal(ctx.degraded, true);
  });
});

describe("buildExplanations", () => {
  it("emits at least one explanation for a constrained day", () => {
    const ctx = buildEnvironmentalContext({
      snapshot: baseSnapshot({ aqiUs: 175, uvIndexMax: 9, apparentC: 38 }),
      ageGroup: "preschool_3_5",
      location: { latitude: 28.6, longitude: 77.2 },
    });
    ctx.explanations = buildExplanations(ctx);
    assert.ok(ctx.explanations.length > 0);
    assert.ok(ctx.explanations.some((e) => e.toLowerCase().includes("air quality") || e.toLowerCase().includes("uv") || e.toLowerCase().includes("heat")));
  });
});

describe("mapToWeatherOutdoor", () => {
  it("never overrules a more cautious parent", () => {
    const ctx = buildEnvironmentalContext({
      snapshot: baseSnapshot(),
      ageGroup: "early_school_5_10",
      location: { latitude: 28.6, longitude: 77.2 },
    });
    assert.equal(ctx.outdoorSuitability, "yes");
    assert.equal(mapToWeatherOutdoor(ctx, "no"), "no");
    assert.equal(mapToWeatherOutdoor(ctx, "limited"), "limited");
    assert.equal(mapToWeatherOutdoor(ctx, "yes"), "yes");
  });
  it("escalates when env is more cautious than the parent", () => {
    const ctx = buildEnvironmentalContext({
      snapshot: baseSnapshot({ aqiUs: 320, apparentC: 42 }),
      ageGroup: "infant_0_1",
      location: { latitude: 28.6, longitude: 77.2 },
    });
    assert.equal(ctx.outdoorSuitability, "no");
    assert.equal(mapToWeatherOutdoor(ctx, "yes"), "no");
  });
});

describe("mapAgeGroupToEnvAgeGroup", () => {
  it("maps each AmyNest age group", () => {
    assert.equal(mapAgeGroupToEnvAgeGroup("infant"), "infant_0_1");
    assert.equal(mapAgeGroupToEnvAgeGroup("toddler"), "toddler_1_3");
    assert.equal(mapAgeGroupToEnvAgeGroup("preschool"), "preschool_3_5");
    assert.equal(mapAgeGroupToEnvAgeGroup("early_school"), "early_school_5_10");
    assert.equal(mapAgeGroupToEnvAgeGroup("pre_teen"), "preteen_10_15");
  });
});
