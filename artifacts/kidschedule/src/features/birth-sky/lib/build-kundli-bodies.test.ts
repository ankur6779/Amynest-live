import { describe, expect, it } from "vitest";
import {
  buildKundliBodies,
  canRenderKundliFromAstronomy,
} from "./build-kundli-bodies";
import type { AstronomyData } from "../domain/models/birth-profile";

function baseAstronomy(overrides: Partial<AstronomyData> = {}): AstronomyData {
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
  return {
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
    houses: {
      system: "whole_sign",
      cusps: signs.map((sign, i) => ({
        house: i + 1,
        sign,
        startLongitudeDeg: (120 + i * 30) % 360,
        endLongitudeDeg: (150 + i * 30) % 360,
      })),
    },
    planetHouseMap: {
      sun: 2,
      moon: 12,
      mars: 3,
      mercury: 1,
      jupiter: 5,
      venus: 4,
      saturn: 6,
      rahu: 8,
      ketu: 2,
    },
    precision: { timePrecision: "exact", placeProvided: true },
    sun: { eclipticLongitudeDeg: 155, sign: "Virgo" },
    moon: { eclipticLongitudeDeg: 100, sign: "Cancer" },
    mars: { eclipticLongitudeDeg: 185, sign: "Libra" },
    mercury: { eclipticLongitudeDeg: 140, sign: "Leo" },
    jupiter: { eclipticLongitudeDeg: 245, sign: "Sagittarius" },
    venus: { eclipticLongitudeDeg: 210, sign: "Scorpio" },
    saturn: { eclipticLongitudeDeg: 280, sign: "Capricorn" },
    rahu: { eclipticLongitudeDeg: 20, sign: "Aries", retrograde: true },
    ketu: { eclipticLongitudeDeg: 200, sign: "Libra", retrograde: true },
    chartCompleteness: {
      status: "complete",
      canRenderKundli: true,
      canExportPdf: true,
      reasons: [],
      fallbackUsed: false,
      houseCount: 12,
      grahaHouseCount: 9,
    },
    ...overrides,
  };
}

describe("buildKundliBodies", () => {
  it("places all nine grahas in planetHouseMap houses", () => {
    const bodies = buildKundliBodies(baseAstronomy());
    expect(bodies).toHaveLength(9);
    expect(bodies.find((b) => b.key === "sun")?.house).toBe(2);
    expect(bodies.find((b) => b.key === "moon")?.house).toBe(12);
    expect(bodies.find((b) => b.key === "mercury")?.house).toBe(1);
    expect(bodies.every((b) => typeof b.house === "number")).toBe(true);
  });

  it("disables kundli for day sky", () => {
    const gate = canRenderKundliFromAstronomy(
      baseAstronomy({
        risingSign: null,
        precision: { timePrecision: "unknown", placeProvided: true },
        chartCompleteness: {
          status: "day_sky",
          canRenderKundli: false,
          canExportPdf: false,
          reasons: ["birth_time_unavailable"],
          fallbackUsed: false,
          houseCount: 0,
          grahaHouseCount: 0,
        },
      }),
    );
    expect(gate.canRender).toBe(false);
    expect(gate.reason).toMatch(/birth time/i);
  });

  it("refuses invented houses on lite fallback", () => {
    const gate = canRenderKundliFromAstronomy(
      baseAstronomy({
        houses: null,
        planetHouseMap: null,
        metadata: { fallbackUsed: true },
        chartCompleteness: {
          status: "incomplete_fallback",
          canRenderKundli: false,
          canExportPdf: false,
          reasons: ["lite_fallback_used"],
          fallbackUsed: true,
          houseCount: 0,
          grahaHouseCount: 0,
        },
      }),
    );
    expect(gate.canRender).toBe(false);
    expect(gate.reason).toMatch(/fallback|invent/i);
  });
});
