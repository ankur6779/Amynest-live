import { describe, expect, it } from "vitest";
import { toSkyMapRenderModel } from "../../domain/ports/sky-map-renderer-port";
import { buildSkySegmentVM } from "../../application/view-models/dashboard-vm";
import type { SkySnapshot } from "../../domain/models/birth-profile";
import { getSkyMapRenderer } from "./resolve-sky-map-renderer";

const snapshot: SkySnapshot = {
  snapshotId: "s1",
  profileId: "p1",
  cacheKey: "k",
  snapshotVersion: "ss_1",
  engineVersion: "amynest-astro-lite/1.0.0",
  computedAt: "2020-01-01T00:00:00.000Z",
  mode: "full",
  astronomy: {
    bodies: [
      { id: "sun", eclipticLongitudeDeg: 100, sign: "Cancer" },
      { id: "moon", eclipticLongitudeDeg: 200, sign: "Libra" },
    ],
    sunSign: "Cancer",
    moonSign: "Libra",
    moonPhase: "full",
    moonPhaseLabel: "Full Moon",
    risingSign: "Virgo",
    houses: null,
    precision: { timePrecision: "exact", placeProvided: true },
  },
};

describe("SkyMapRendererPort", () => {
  it("binds a renderer without coupling to snapshot persistence", () => {
    const renderer = getSkyMapRenderer();
    expect(renderer.rendererId).toBe("instrument_svg_v1");
    expect(renderer.isTemporaryRenderer).toBe(true);
    expect(typeof renderer.Component).toBe("function");
  });

  it("derives a render model from SkySegmentVM only", () => {
    const vm = buildSkySegmentVM(snapshot);
    const model = toSkyMapRenderModel(vm);
    expect(model.markers).toBe(vm.markers);
    expect(model.mapAriaLabel).toBe(vm.mapAriaLabel);
    // No snapshot identity leaked into render contract
    expect(model).not.toHaveProperty("snapshotVersion");
    expect(model).not.toHaveProperty("engineVersion");
  });
});
