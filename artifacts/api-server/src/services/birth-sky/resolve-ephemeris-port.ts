import type { EphemerisPort } from "./ephemeris-port";
import { createAstroLiteEphemerisAdapter } from "./astro-lite-adapter";

let bound: EphemerisPort | null = null;

export function getEphemerisPort(): EphemerisPort {
  if (!bound) {
    // TEMPORARY — Swiss Ephemeris adapter binds here later.
    bound = createAstroLiteEphemerisAdapter();
  }
  return bound;
}

export function __setEphemerisPortForTests(port: EphemerisPort | null): void {
  bound = port;
}
