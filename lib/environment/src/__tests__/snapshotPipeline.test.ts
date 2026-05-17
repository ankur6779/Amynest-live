import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateAQI,
  estimateAQIByCountry,
  normalizeSnapshot,
  finalizeSnapshot,
  deriveExposureMode,
  fallbackAtmosphericSnapshot,
  confidenceFromSource,
} from "../snapshotPipeline.js";
import { buildEnvironmentalContext } from "../risk.js";
import type { AtmosphericSnapshot } from "../types.js";

describe("validateAQI", () => {
  it("rejects out-of-range values", () => {
    assert.equal(validateAQI(-1), null);
    assert.equal(validateAQI(600), null);
    assert.equal(validateAQI(null), null);
  });

  it("repairs PM2.5 vs AQI mismatch", () => {
    assert.equal(validateAQI(80, 200), 180);
    assert.equal(validateAQI(120, 50), 120);
  });

  it("accepts valid AQI", () => {
    assert.equal(validateAQI(42), 42);
  });
});

describe("estimateAQIByCountry", () => {
  it("maps ISO and country names", () => {
    assert.equal(estimateAQIByCountry("IN"), 180);
    assert.equal(estimateAQIByCountry("India"), 180);
    assert.equal(estimateAQIByCountry("US"), 60);
    assert.equal(estimateAQIByCountry("unknown"), 100);
  });
});

describe("finalizeSnapshot", () => {
  it("fills missing AQI from country with medium confidence when repaired", () => {
    const snap: AtmosphericSnapshot = {
      observedAt: "2026-05-11T08:00:00Z",
      source: "open-meteo",
      temperatureC: 22,
    };
    const { snapshot, confidence, aqiRepaired } = finalizeSnapshot(snap, "IN");
    assert.equal(snapshot.aqiUs, 180);
    assert.equal(aqiRepaired, true);
    assert.equal(confidence, "medium");
  });

  it("keeps high confidence for valid API snapshot", () => {
    const snap: AtmosphericSnapshot = {
      observedAt: "2026-05-11T08:00:00Z",
      source: "open-meteo",
      temperatureC: 22,
      aqiUs: 55,
    };
    const { confidence, aqiRepaired } = finalizeSnapshot(snap, "US");
    assert.equal(confidence, "high");
    assert.equal(aqiRepaired, false);
  });
});

describe("confidenceFromSource", () => {
  it("maps source to confidence tier", () => {
    assert.equal(confidenceFromSource("open-meteo"), "high");
    assert.equal(confidenceFromSource("cache"), "medium");
    assert.equal(confidenceFromSource("fallback"), "low");
  });
});

describe("deriveExposureMode", () => {
  it("escalates with AQI bands", () => {
    assert.equal(deriveExposureMode(50, 25, "sunny"), "normal");
    assert.equal(deriveExposureMode(120, 25, "sunny"), "reduced");
    assert.equal(deriveExposureMode(170, 25, "sunny"), "limited");
    assert.equal(deriveExposureMode(220, 25, "sunny"), "controlled");
    assert.equal(deriveExposureMode(320, 25, "sunny"), "indoor_only");
  });
});

describe("fallbackAtmosphericSnapshot", () => {
  it("always includes temperature and AQI", () => {
    const snap = fallbackAtmosphericSnapshot("AE");
    assert.equal(snap.source, "fallback");
    assert.equal(snap.aqiUs, 150);
    assert.equal(snap.temperatureC, 25);
  });
});

describe("enriched context", () => {
  it("never leaves AQI undefined after build", () => {
    const ctx = buildEnvironmentalContext({
      snapshot: { observedAt: "x", source: "fallback" },
      ageGroup: "preschool_3_5",
      location: { latitude: 28.6, longitude: 77.2 },
      country: "IN",
      confidence: "low",
    });
    assert.equal(typeof ctx.AQI, "number");
    assert.ok(ctx.AQI > 0);
    assert.equal(ctx.confidence, "low");
    assert.equal(ctx.degraded, true);
    assert.equal(ctx.exposureMode, "limited");
  });
});
