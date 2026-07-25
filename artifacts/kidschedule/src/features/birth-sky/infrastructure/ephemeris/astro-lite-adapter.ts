/**
 * TEMPORARY ephemeris adapter — `amynest-astro-lite`.
 *
 * NOT the long-term production engine. Swiss Ephemeris (or approved successor)
 * must replace this adapter behind EphemerisPort without changing AstronomyData
 * consumer contracts. Existing snapshots stay readable via hydrateSkySnapshot.
 *
 * @temporary IM-1 / pre-Swiss — do not treat as permanent astronomy authority.
 */

import type {
  EphemerisComputeInput,
  EphemerisPort,
} from "../../domain/ports/ephemeris-port";
import {
  buildCacheKey as liteBuildCacheKey,
  computeAstronomyData,
  ENGINE_VERSION as LITE_ENGINE_VERSION,
} from "../../domain/calculators/astronomy-lite";

/** @temporary Explicit marker for ops / conformance reviews. */
export const ASTRO_LITE_TEMPORARY = true as const;

export const ASTRO_LITE_ENGINE_VERSION = LITE_ENGINE_VERSION;

export function createAstroLiteEphemerisAdapter(): EphemerisPort {
  return {
    engineVersion: ASTRO_LITE_ENGINE_VERSION,
    isTemporaryAdapter: true,
    compute(input: EphemerisComputeInput) {
      const { mode, astronomy } = computeAstronomyData(input);
      return {
        mode,
        astronomy,
        engineVersion: ASTRO_LITE_ENGINE_VERSION,
      };
    },
    buildCacheKey(input: EphemerisComputeInput) {
      return liteBuildCacheKey({
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        timePrecision: input.timePrecision,
        lat: input.lat,
        lon: input.lon,
        engineVersion: ASTRO_LITE_ENGINE_VERSION,
      });
    },
  };
}
