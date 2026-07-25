import type { EphemerisPort } from "./ephemeris-port";
import { createPythonEphemerisAdapter } from "./python-ephemeris-adapter.js";

let bound: EphemerisPort | null = null;

export function getEphemerisPort(): EphemerisPort {
  if (!bound) {
    bound = createPythonEphemerisAdapter();
  }
  return bound;
}

export function __setEphemerisPortForTests(port: EphemerisPort | null): void {
  bound = port;
}
