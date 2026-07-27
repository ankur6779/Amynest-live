import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAstroLiteEphemerisAdapter } from "./astro-lite-adapter.js";

describe("createAstroLiteEphemerisAdapter", () => {
  it("computes a readable full-sky astronomy payload", async () => {
    const port = createAstroLiteEphemerisAdapter();
    const result = await port.compute({
      birthDate: "2018-06-15",
      birthTime: "10:30",
      timePrecision: "exact",
      lat: 12.97,
      lon: 77.59,
      timezoneOffsetMinutes: 330,
    });
    assert.equal(result.engineVersion, "amynest-astro-lite/1.0.0");
    assert.equal(result.mode, "full");
    assert.ok(result.astronomy.sunSign);
    assert.ok(result.astronomy.moonSign);
    assert.ok(result.astronomy.moonPhaseLabel);
    assert.ok(Array.isArray(result.astronomy.bodies));
    assert.ok(result.astronomy.precision);
  });

  it("computes day_sky when time is unknown", async () => {
    const port = createAstroLiteEphemerisAdapter();
    const result = await port.compute({
      birthDate: "2020-01-01",
      birthTime: null,
      timePrecision: "unknown",
      lat: null,
      lon: null,
    });
    assert.equal(result.mode, "day_sky");
    assert.equal(result.astronomy.risingSign, null);
  });
});
