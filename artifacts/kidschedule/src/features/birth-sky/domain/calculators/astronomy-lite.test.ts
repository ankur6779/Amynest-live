import { describe, expect, it } from "vitest";
import { computeAstronomyData, ENGINE_VERSION } from "./astronomy-lite";

describe("astronomy-lite (temporary calculator internals)", () => {
  it("produces day_sky mode for unknown time", () => {
    const { mode, astronomy } = computeAstronomyData({
      birthDate: "2020-06-21",
      birthTime: null,
      timePrecision: "unknown",
      lat: null,
      lon: null,
    });
    expect(mode).toBe("day_sky");
    expect(astronomy.risingSign).toBeNull();
    expect(astronomy.sunSign).toBeTruthy();
    expect(astronomy.moonPhaseLabel).toBeTruthy();
    expect(ENGINE_VERSION).toMatch(/^amynest-astro-lite\//);
  });

  it("may compute rising for full sky with time+place", () => {
    const { mode, astronomy } = computeAstronomyData({
      birthDate: "2020-06-21",
      birthTime: "08:30",
      timePrecision: "exact",
      lat: 28.6,
      lon: 77.2,
      timezoneOffsetMinutes: 330,
    });
    expect(mode).toBe("full");
    expect(astronomy.precision.placeProvided).toBe(true);
    expect(astronomy.risingSign === null || typeof astronomy.risingSign === "string").toBe(
      true,
    );
  });
});
