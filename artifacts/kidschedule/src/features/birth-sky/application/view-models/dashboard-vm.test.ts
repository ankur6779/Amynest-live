import { describe, expect, it } from "vitest";
import {
  buildAstronomySegmentVM,
  buildDashboardHeroVM,
  buildSkySegmentVM,
} from "./dashboard-vm";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";

const profile: BirthProfile = {
  profileId: "p1",
  childId: 1,
  userId: "u1",
  birthDate: "2020-06-15",
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
  computedAt: "2020-01-02T12:00:00.000Z",
  mode: "day_sky",
  astronomy: {
    bodies: [
      { id: "sun", eclipticLongitudeDeg: 85, sign: "Gemini" },
      { id: "moon", eclipticLongitudeDeg: 200, sign: "Libra" },
    ],
    sunSign: "Gemini",
    moonSign: "Libra",
    moonPhase: "full",
    moonPhaseLabel: "Full Moon",
    risingSign: null,
    houses: null,
    precision: { timePrecision: "unknown", placeProvided: false },
  },
};

describe("dashboard VMs", () => {
  it("hero includes versions and Day Sky chips", () => {
    const hero = buildDashboardHeroVM(profile, snapshot, "Amy");
    expect(hero.daySky).toBe(true);
    expect(hero.snapshotVersion).toBe("ss_1");
    expect(hero.engineVersion).toContain("amynest-astro-lite");
    expect(hero.chips.find((c) => c.id === "time")?.complete).toBe(false);
    expect(hero.essenceLine.split(/\s+/).length).toBeLessThanOrEqual(14);
  });

  it("sky locks rising for Day Sky", () => {
    const sky = buildSkySegmentVM(snapshot);
    expect(sky.markers.find((m) => m.key === "rising")?.locked).toBe(true);
    expect(sky.cards).toHaveLength(3);
  });

  it("astronomy has educational cards without tradition", () => {
    const astro = buildAstronomySegmentVM(profile, snapshot);
    expect(astro.intro.toLowerCase()).toContain("science");
    expect(astro.cards.some((c) => c.id === "rising" && c.locked)).toBe(true);
    expect(astro.precisionFooter.toLowerCase()).toContain("birth details");
  });
});
