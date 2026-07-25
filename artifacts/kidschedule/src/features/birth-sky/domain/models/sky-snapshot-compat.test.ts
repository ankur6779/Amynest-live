import { describe, expect, it } from "vitest";
import {
  hydrateSkySnapshot,
  isSnapshotReadableWithoutEngine,
} from "./sky-snapshot-compat";
import type { SkySnapshot } from "./birth-profile";

const base: SkySnapshot = {
  snapshotId: "s1",
  profileId: "p1",
  cacheKey: "k",
  snapshotVersion: "ss_1",
  engineVersion: "amynest-astro-lite/1.0.0",
  computedAt: "2020-01-01T00:00:00.000Z",
  mode: "day_sky",
  astronomy: {
    bodies: [
      { id: "sun", eclipticLongitudeDeg: 280, sign: "Capricorn" },
      { id: "moon", eclipticLongitudeDeg: 10, sign: "Aries" },
    ],
    sunSign: "Capricorn",
    moonSign: "Aries",
    moonPhase: "waxing_crescent",
    moonPhaseLabel: "Waxing Crescent",
    risingSign: null,
    houses: null,
    precision: { timePrecision: "unknown", placeProvided: false },
  },
};

describe("sky snapshot forward compatibility", () => {
  it("reads snapshots produced by the temporary lite engine", () => {
    const r = hydrateSkySnapshot(base);
    expect(r.ok).toBe(true);
  });

  it("reads skyfield-jpl snapshots with additive planet fields", () => {
    const skyfieldTagged = {
      ...base,
      engineVersion: "skyfield-jpl/1.0.0",
      mode: "full" as const,
      astronomy: {
        ...base.astronomy,
        risingSign: "Libra",
        precision: { timePrecision: "exact" as const, placeProvided: true },
        mercury: { sign: "Capricorn", eclipticLongitudeDeg: 271.5, retrograde: false },
        planetDegrees: {
          sun: { sign: "Capricorn", eclipticLongitudeDeg: 280 },
          mercury: { sign: "Capricorn", eclipticLongitudeDeg: 271.5, retrograde: false },
        },
        retrograde: [] as string[],
        metadata: { bspKernel: "de440.bsp", julianDay: 2451545.0 },
      },
    };
    const r = hydrateSkySnapshot(skyfieldTagged);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.snapshot.engineVersion).toBe("skyfield-jpl/1.0.0");
      expect(r.snapshot.astronomy.mercury?.sign).toBe("Capricorn");
      expect(r.snapshot.astronomy.metadata?.bspKernel).toBe("de440.bsp");
    }
  });

  it("reads snapshots tagged with a future Swiss engine without recompute", () => {
    const swissTagged = {
      ...base,
      engineVersion: "swiss-ephemeris/2.10.3",
    };
    const r = hydrateSkySnapshot(swissTagged);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.snapshot.engineVersion).toBe("swiss-ephemeris/2.10.3");
      expect(r.snapshot.astronomy.sunSign).toBe("Capricorn");
    }
    expect(isSnapshotReadableWithoutEngine(swissTagged)).toBe(true);
  });

  it("rejects corrupt astronomy payloads", () => {
    const r = hydrateSkySnapshot({ ...base, astronomy: { sunSign: 1 } });
    expect(r.ok).toBe(false);
  });
});
