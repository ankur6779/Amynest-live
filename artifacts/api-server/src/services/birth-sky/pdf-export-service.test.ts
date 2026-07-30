import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateBirthSkyPdf } from "./pdf-export-service.js";
import { attachChartDetails } from "./chart-details.js";
import type { AstronomyData } from "./ephemeris-port.js";

function fullAstronomy(): AstronomyData {
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
  const cusps = signs.map((sign, i) => ({
    house: i + 1,
    sign,
    startLongitudeDeg: (120 + i * 30) % 360,
    endLongitudeDeg: (150 + i * 30) % 360,
  }));
  return attachChartDetails({
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
    ascendant: { sign: "Leo", eclipticLongitudeDeg: 135 },
    metadata: { fallbackUsed: false },
  });
}

describe("generateBirthSkyPdf", () => {
  it("produces a real PDF with %PDF header", async () => {
    const { bytes, fileName, chartDetailsVersion } = await generateBirthSkyPdf({
      childFirstName: "Aarav",
      birthDate: "2020-06-15",
      birthTime: "08:30",
      timePrecision: "exact",
      placeLabel: "New Delhi",
      snapshotId: "snap-1",
      snapshotVersion: "ss_1",
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full",
      astronomy: fullAstronomy(),
    });
    assert.ok(bytes.byteLength > 500);
    assert.equal(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]), "%PDF");
    assert.match(fileName, /AmyNest_BirthSky_Aarav/);
    assert.match(chartDetailsVersion, /birth_sky_chart_details/);
  });

  it("rejects day sky / incomplete charts", async () => {
    const a = fullAstronomy();
    a.precision = { timePrecision: "unknown", placeProvided: true };
    a.risingSign = null;
    a.houses = null;
    a.planetHouseMap = null;
    a.chartCompleteness = undefined;
    const enriched = attachChartDetails(a);
    await assert.rejects(
      () =>
        generateBirthSkyPdf({
          childFirstName: "Aarav",
          birthDate: "2020-06-15",
          birthTime: null,
          timePrecision: "unknown",
          placeLabel: "New Delhi",
          snapshotId: "snap-1",
          snapshotVersion: "ss_1",
          engineVersion: "skyfield-jpl/1.0.0",
          mode: "day_sky",
          astronomy: enriched,
        }),
      /pdf_chart_incomplete/,
    );
  });
});
