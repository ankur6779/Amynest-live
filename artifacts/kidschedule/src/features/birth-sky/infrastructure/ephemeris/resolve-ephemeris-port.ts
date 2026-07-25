/**
 * Binds the active EphemerisPort implementation.
 * Swap adapter here when Swiss Ephemeris ships — do not change call sites.
 */

import type { EphemerisPort } from "../../domain/ports/ephemeris-port";
import { createAstroLiteEphemerisAdapter } from "./astro-lite-adapter";

let bound: EphemerisPort | null = null;

/**
 * Returns the process-bound EphemerisPort.
 * Today: temporary astro-lite. Future: Swiss (or other) without API changes.
 */
export function getEphemerisPort(): EphemerisPort {
  if (!bound) {
    // TEMPORARY binding — replace with Swiss adapter when certified.
    bound = createAstroLiteEphemerisAdapter();
  }
  return bound;
}

/** Test helper — inject a mock or future Swiss adapter. */
export function __setEphemerisPortForTests(port: EphemerisPort | null): void {
  bound = port;
}
