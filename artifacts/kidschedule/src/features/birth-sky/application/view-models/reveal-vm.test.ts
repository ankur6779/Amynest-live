import { describe, expect, it } from "vitest";
import { buildRevealViewModel } from "./reveal-vm";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";

const profile: BirthProfile = {
  profileId: "p1",
  childId: 1,
  userId: "u1",
  birthDate: "2020-01-01",
  birthTime: null,
  timePrecision: "unknown",
  birthPlace: null,
  consent: {
    consentVersion: "v1",
    acceptedAt: "2020-01-01T00:00:00.000Z",
    scopes: ["astronomy_compute"],
    disclaimerAccepted: true,
    childId: 1,
  },
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-01-01T00:00:00.000Z",
};

const snapshot: SkySnapshot = {
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

describe("reveal VM", () => {
  it("builds Day Sky reveal without rising claims", () => {
    const vm = buildRevealViewModel(profile, snapshot, "Amy");
    expect(vm.mode).toBe("day_sky");
    expect(vm.daySkyBadge).toContain("Day Sky");
    expect(vm.essenceCard).toBeTruthy();
    expect(vm.essenceLine.split(/\s+/).length).toBeLessThanOrEqual(14);
  });
});
