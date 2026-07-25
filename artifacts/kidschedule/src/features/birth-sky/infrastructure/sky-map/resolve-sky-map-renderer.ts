/**
 * Binds the active SkyMapRenderer. Swap visual implementation here only.
 */

import type { SkyMapRenderer } from "../../domain/ports/sky-map-renderer-port";
import { createInstrumentSvgSkyMapRenderer } from "./instrument-svg-renderer";

let bound: SkyMapRenderer | null = null;

export function getSkyMapRenderer(): SkyMapRenderer {
  if (!bound) {
    bound = createInstrumentSvgSkyMapRenderer();
  }
  return bound;
}

export function __setSkyMapRendererForTests(renderer: SkyMapRenderer | null): void {
  bound = renderer;
}
