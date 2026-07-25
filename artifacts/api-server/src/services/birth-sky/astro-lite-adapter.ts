/**
 * TEMPORARY server ephemeris adapter — amynest-astro-lite.
 * Replace behind EphemerisPort with Swiss when certified.
 * Existing snapshots remain readable without this adapter.
 *
 * @temporary
 */

import type {
  EphemerisComputeInput,
  EphemerisPort,
} from "./ephemeris-port";
import {
  buildCacheKey,
  computeAstronomyData,
  ENGINE_VERSION,
} from "./astronomy-lite";

export function createAstroLiteEphemerisAdapter(): EphemerisPort {
  return {
    engineVersion: ENGINE_VERSION,
    isTemporaryAdapter: true,
    compute(input: EphemerisComputeInput) {
      const { mode, astronomy } = computeAstronomyData(input);
      return { mode, astronomy, engineVersion: ENGINE_VERSION };
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
