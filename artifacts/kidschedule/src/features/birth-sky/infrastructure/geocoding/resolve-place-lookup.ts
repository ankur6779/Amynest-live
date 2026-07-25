/**
 * Binds the active PlaceLookupPort. Swap Nominatim for another provider here.
 */

import type { PlaceLookupPort } from "../../domain/ports/place-lookup-port";
import { createNominatimPlaceLookup } from "./nominatim-place-lookup";

let bound: PlaceLookupPort | null = null;

export function getPlaceLookupPort(): PlaceLookupPort {
  if (!bound) {
    // Temporary / dev provider — not a hard architecture dependency.
    bound = createNominatimPlaceLookup();
  }
  return bound;
}

export function __setPlaceLookupPortForTests(port: PlaceLookupPort | null): void {
  bound = port;
}
