import type { EphemerisPort } from "./ephemeris-port";
import { createResilientEphemerisPort } from "./resilient-ephemeris-port.js";

let bound: EphemerisPort | null = null;

/**
 * Bound EphemerisPort for Birth Sky creates/recomputes.
 * Production binding: Python daemon with one retry + amynest-astro-lite fallback.
 */
export function getEphemerisPort(): EphemerisPort {
  if (!bound) {
    bound = createResilientEphemerisPort();
  }
  return bound;
}

export function __setEphemerisPortForTests(port: EphemerisPort | null): void {
  bound = port;
}
