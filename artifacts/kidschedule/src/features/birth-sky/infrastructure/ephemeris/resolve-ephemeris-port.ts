/**
 * Client ephemeris binding — server-compute only.
 *
 * Charts are written by the API remote ephemeris daemon. Offline UI hydrates
 * snapshots and must never recompute in the browser.
 */

import { BIRTH_SKY_ENGINE_VERSION_WRITES } from "../../domain/models/birth-profile";
import type {
  EphemerisComputeInput,
  EphemerisPort,
} from "../../domain/ports/ephemeris-port";

function createServerComputeOnlyStub(): EphemerisPort {
  return {
    engineVersion: BIRTH_SKY_ENGINE_VERSION_WRITES,
    isTemporaryAdapter: false,
    buildCacheKey(input: EphemerisComputeInput): string {
      return [
        BIRTH_SKY_ENGINE_VERSION_WRITES,
        input.birthDate,
        input.birthTime ?? "",
        input.timePrecision,
        input.lat ?? "",
        input.lon ?? "",
      ].join("|");
    },
    async compute(): Promise<never> {
      throw new Error(
        "ephemeris_server_only: Birth Sky compute runs on the API ephemeris daemon. Hydrate the persisted snapshot instead.",
      );
    },
  };
}

let bound: EphemerisPort | null = null;

export function getEphemerisPort(): EphemerisPort {
  if (!bound) bound = createServerComputeOnlyStub();
  return bound;
}

export function __setEphemerisPortForTests(port: EphemerisPort | null): void {
  bound = port;
}
