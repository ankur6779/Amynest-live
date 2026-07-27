import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EphemerisUnavailableError,
  type EphemerisComputeInput,
  type EphemerisComputeResult,
  type EphemerisPort,
} from "./ephemeris-port.js";
import { createResilientEphemerisPort } from "./resilient-ephemeris-port.js";

const sampleInput: EphemerisComputeInput = {
  birthDate: "2018-06-15",
  birthTime: "10:30",
  timePrecision: "exact",
  lat: 12.97,
  lon: 77.59,
  timezoneOffsetMinutes: 330,
};

function stubPort(
  label: string,
  impl: (input: EphemerisComputeInput) => Promise<EphemerisComputeResult>,
): EphemerisPort {
  return {
    engineVersion: label,
    isTemporaryAdapter: label.includes("lite"),
    buildCacheKey: () => `${label}-key`,
    compute: impl,
  };
}

describe("createResilientEphemerisPort", () => {
  it("uses primary when healthy", async () => {
    let calls = 0;
    const port = createResilientEphemerisPort({
      retryDelayMs: 0,
      primary: stubPort("skyfield-jpl/1.0.0", async () => {
        calls += 1;
        return {
          mode: "full",
          engineVersion: "skyfield-jpl/1.0.0",
          astronomy: {
            bodies: [],
            sunSign: "Gemini",
            moonSign: "Cancer",
            moonPhase: "full",
            moonPhaseLabel: "Full Moon",
            risingSign: "Leo",
            houses: null,
            precision: { timePrecision: "exact", placeProvided: true },
          },
        };
      }),
      fallback: stubPort("amynest-astro-lite/1.0.0", async () => {
        throw new Error("fallback should not run");
      }),
    });

    const result = await port.compute(sampleInput);
    assert.equal(result.engineVersion, "skyfield-jpl/1.0.0");
    assert.equal(calls, 1);
  });

  it("retries once then falls back to lite for brand-new first-run", async () => {
    let primaryCalls = 0;
    let fallbackCalls = 0;
    const port = createResilientEphemerisPort({
      retryDelayMs: 0,
      primary: stubPort("skyfield-jpl/1.0.0", async () => {
        primaryCalls += 1;
        throw new EphemerisUnavailableError("daemon down");
      }),
      fallback: stubPort("amynest-astro-lite/1.0.0", async () => {
        fallbackCalls += 1;
        return {
          mode: "full",
          engineVersion: "amynest-astro-lite/1.0.0",
          astronomy: {
            bodies: [
              { id: "sun", eclipticLongitudeDeg: 80, sign: "Gemini" },
              { id: "moon", eclipticLongitudeDeg: 100, sign: "Cancer" },
            ],
            sunSign: "Gemini",
            moonSign: "Cancer",
            moonPhase: "waxing_crescent",
            moonPhaseLabel: "Waxing Crescent",
            risingSign: null,
            houses: null,
            precision: { timePrecision: "exact", placeProvided: true },
          },
        };
      }),
    });

    const result = await port.compute(sampleInput);
    assert.equal(primaryCalls, 2);
    assert.equal(fallbackCalls, 1);
    assert.equal(result.engineVersion, "amynest-astro-lite/1.0.0");
    assert.equal(result.astronomy.sunSign, "Gemini");
    assert.equal(result.astronomy.metadata?.fallbackUsed, true);
  });

  it("day-sky (guest-style unknown time) works via lite fallback", async () => {
    const port = createResilientEphemerisPort({
      retryDelayMs: 0,
      primary: stubPort("skyfield-jpl/1.0.0", async () => {
        throw new EphemerisUnavailableError("unavailable");
      }),
      // Real lite adapter path exercised via fallback stub that mirrors day_sky
      fallback: stubPort("amynest-astro-lite/1.0.0", async (input) => ({
        mode: input.timePrecision === "unknown" ? "day_sky" : "full",
        engineVersion: "amynest-astro-lite/1.0.0",
        astronomy: {
          bodies: [],
          sunSign: "Aries",
          moonSign: "Taurus",
          moonPhase: "new",
          moonPhaseLabel: "New Moon",
          risingSign: null,
          houses: null,
          precision: {
            timePrecision: input.timePrecision,
            placeProvided: false,
          },
        },
      })),
    });

    const result = await port.compute({
      birthDate: "2020-03-20",
      birthTime: null,
      timePrecision: "unknown",
      lat: null,
      lon: null,
    });
    assert.equal(result.mode, "day_sky");
    assert.ok(result.astronomy.sunSign);
  });
});
