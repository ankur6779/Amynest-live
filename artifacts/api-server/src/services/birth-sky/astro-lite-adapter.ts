/**
 * amynest-astro-lite EphemerisPort — deterministic Node fallback when the
 * Python/Skyfield daemon is unavailable. Snapshots remain forward-readable.
 */

import type {
  AstronomyData,
  EphemerisComputeInput,
  EphemerisPort,
} from "./ephemeris-port";
import {
  buildCacheKey,
  computeAstronomyData,
  ENGINE_VERSION,
} from "./astronomy-lite.js";

export function createAstroLiteEphemerisAdapter(): EphemerisPort {
  return {
    engineVersion: ENGINE_VERSION,
    isTemporaryAdapter: true,
    async compute(input: EphemerisComputeInput) {
      const { mode, astronomy } = computeAstronomyData(input);
      return {
        mode,
        astronomy: astronomy as AstronomyData,
        engineVersion: ENGINE_VERSION,
      };
    },
    buildCacheKey(input: EphemerisComputeInput) {
      return buildCacheKey({
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        timePrecision: input.timePrecision,
        lat: input.lat,
        lon: input.lon,
        engineVersion: ENGINE_VERSION,
      });
    },
  };
}
