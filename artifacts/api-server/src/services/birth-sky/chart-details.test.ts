import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  attachChartDetails,
  buildChartDetails,
  evaluateChartCompleteness,
  isCombust,
  VEDIC_GRAHAS,
  type ChartCompleteness,
} from "./chart-details.js";
import type { AstronomyData } from "./ephemeris-port.js";

function cusp(house: number, sign: string, start: number) {
  return {
    house,
    sign,
    startLongitudeDeg: start,
    endLongitudeDeg: (start + 30) % 360 === 0 && start + 30 >= 360 ? start + 30 - 360 : start + 30,
  };
}

/** Leo rising whole-sign chart fixture — 12 houses, all grahas placed. */
function fullChartAstronomy(overrides: Partial<AstronomyData> = {}): AstronomyData {
  const signs = [
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
  ];
  const cusps = signs.map((sign, i) => cusp(i + 1, sign, (120 + i * 30) % 360));
  const planetHouseMap = {
    sun: 2,
    moon: 12,
    mars: 3,
    mercury: 1,
    jupiter: 5,
    venus: 4,
    saturn: 6,
    rahu: 8,
    ketu: 2,
  };
  const base: AstronomyData = {
    bodies: [
      { id: "sun", eclipticLongitudeDeg: 155, sign: "Virgo" },
      { id: "moon", eclipticLongitudeDeg: 100, sign: "Cancer" },
      { id: "mars", eclipticLongitudeDeg: 185, sign: "Libra" },
      { id: "mercury", eclipticLongitudeDeg: 140, sign: "Leo" },
      { id: "jupiter", eclipticLongitudeDeg: 245, sign: "Sagittarius" },
      { id: "venus", eclipticLongitudeDeg: 210, sign: "Scorpio" },
      { id: "saturn", eclipticLongitudeDeg: 280, sign: "Capricorn" },
      { id: "rahu", eclipticLongitudeDeg: 20, sign: "Aries" },
      { id: "ketu", eclipticLongitudeDeg: 200, sign: "Libra" },
    ],
    sunSign: "Virgo",
    moonSign: "Cancer",
    moonPhase: "waning_crescent",
    moonPhaseLabel: "Waning Crescent",
    risingSign: "Leo",
    houses: { system: "whole_sign", cusps },
    planetHouseMap,
    precision: { timePrecision: "exact", placeProvided: true },
    sun: { eclipticLongitudeDeg: 155, sign: "Virgo", degreeInSign: 5 },
    moon: { eclipticLongitudeDeg: 100, sign: "Cancer", degreeInSign: 10 },
    mars: { eclipticLongitudeDeg: 185, sign: "Libra", degreeInSign: 5 },
    mercury: { eclipticLongitudeDeg: 140, sign: "Leo", degreeInSign: 20 },
    jupiter: { eclipticLongitudeDeg: 245, sign: "Sagittarius", degreeInSign: 5 },
    venus: { eclipticLongitudeDeg: 210, sign: "Scorpio", degreeInSign: 0 },
    saturn: { eclipticLongitudeDeg: 280, sign: "Capricorn", degreeInSign: 10 },
    rahu: { eclipticLongitudeDeg: 20, sign: "Aries", degreeInSign: 20, retrograde: true },
    ketu: { eclipticLongitudeDeg: 200, sign: "Libra", degreeInSign: 20, retrograde: true },
    ascendant: { sign: "Leo", eclipticLongitudeDeg: 135, degreeInSign: 15 },
    planetNakshatra: {
      moon: {
        name: "Pushya",
        index: 7,
        pada: 2,
        lord: "Saturn",
        longitudeInNakshatraDeg: 5,
      },
    },
    metadata: { fallbackUsed: false },
  };
  return { ...base, ...overrides };
}

describe("chart-details combust", () => {
  it("flags mercury within 14° of sun", () => {
    const r = isCombust("mercury", 100, 110);
    assert.equal(r.combust, true);
  });
  it("does not flag sun or nodes", () => {
    assert.equal(isCombust("sun" as never, 0, 0).combust, false);
    assert.equal(isCombust("rahu", 10, 10).combust, false);
  });
});

describe("chart completeness", () => {
  it("marks day sky when time unknown", () => {
    const c = evaluateChartCompleteness(
      fullChartAstronomy({
        precision: { timePrecision: "unknown", placeProvided: true },
        risingSign: null,
        houses: null,
        planetHouseMap: null,
      }),
    );
    assert.equal(c.status, "day_sky");
    assert.equal(c.canRenderKundli, false);
    assert.equal(c.canExportPdf, false);
  });

  it("blocks PDF on lite fallback even if houses present", () => {
    const c = evaluateChartCompleteness(
      fullChartAstronomy({ metadata: { fallbackUsed: true } }),
    );
    assert.equal(c.status, "incomplete_fallback");
    assert.equal(c.canExportPdf, false);
  });

  it("accepts complete Vedic chart", () => {
    const c: ChartCompleteness = evaluateChartCompleteness(fullChartAstronomy());
    assert.equal(c.status, "complete");
    assert.equal(c.canRenderKundli, true);
    assert.equal(c.canExportPdf, true);
    assert.equal(c.houseCount, 12);
    assert.equal(c.grahaHouseCount, 9);
  });

  it("requires place for houses", () => {
    const c = evaluateChartCompleteness(
      fullChartAstronomy({
        precision: { timePrecision: "exact", placeProvided: false },
        houses: null,
        planetHouseMap: null,
      }),
    );
    assert.equal(c.status, "missing_place");
    assert.equal(c.canExportPdf, false);
  });
});

describe("buildChartDetails", () => {
  it("builds 12 houses and all grahas with lords", () => {
    const d = buildChartDetails(fullChartAstronomy());
    assert.equal(d.houseDetails.length, 12);
    assert.equal(d.planetDetails.length, VEDIC_GRAHAS.length);
    assert.equal(d.lagna.sign, "Leo");
    assert.equal(d.houseDetails[0]?.lord, "Sun");
    assert.ok(d.houseDetails[0]?.planets.includes("mercury"));
    const moon = d.planetDetails.find((p) => p.id === "moon");
    assert.equal(moon?.house, 12);
    assert.equal(moon?.nakshatra, "Pushya");
    assert.equal(moon?.pada, 2);
  });

  it("attachChartDetails is additive", () => {
    const a = attachChartDetails(fullChartAstronomy());
    assert.equal(a.sunSign, "Virgo");
    assert.ok(Array.isArray(a.houseDetails));
    assert.ok(Array.isArray(a.planetDetails));
    assert.equal(a.chartCompleteness?.canExportPdf, true);
  });
});
