import { describe, expect, it } from "vitest";
import { createAstroLiteEphemerisAdapter } from "./astro-lite-adapter";
import { getEphemerisPort } from "./resolve-ephemeris-port";

describe("EphemerisPort binding", () => {
  it("exposes temporary lite adapter behind the permanent port", () => {
    const port = createAstroLiteEphemerisAdapter();
    expect(port.isTemporaryAdapter).toBe(true);
    expect(port.engineVersion).toMatch(/^amynest-astro-lite\//);

    const result = port.compute({
      birthDate: "2020-06-21",
      birthTime: null,
      timePrecision: "unknown",
      lat: null,
      lon: null,
    });
    expect(result.engineVersion).toBe(port.engineVersion);
    expect(result.mode).toBe("day_sky");
    expect(result.astronomy.sunSign).toBeTruthy();
  });

  it("resolve-ephemeris-port returns a port (not raw calculator)", () => {
    const port = getEphemerisPort();
    expect(typeof port.compute).toBe("function");
    expect(port.isTemporaryAdapter).toBe(true);
  });
});
