import { describe, expect, it } from "vitest";
import { assembleBirthSkyStreamContext } from "./assemble-context";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";

const profile: BirthProfile = {
  profileId: "p1",
  childId: 1,
  userId: "u1",
  birthDate: "2020-01-01",
  birthTime: "12:00",
  timePrecision: "exact",
  birthPlace: { label: "Secret Place", lat: 1, lon: 2 },
  consent: {
    consentVersion: "v1",
    acceptedAt: "2020-01-01T00:00:00.000Z",
    scopes: ["amy_insights_optional"],
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
  engineVersion: "eng_1",
  computedAt: "2020-01-01T00:00:00.000Z",
  mode: "full",
  astronomy: {
    bodies: [],
    sunSign: "Cancer",
    moonSign: "Libra",
    moonPhase: "full",
    moonPhaseLabel: "Full Moon",
    risingSign: "Virgo",
    houses: null,
    precision: { timePrecision: "exact", placeProvided: true },
  },
};

describe("assembleBirthSkyStreamContext", () => {
  it("keeps snapshot immutable and omits place/time secrets", () => {
    const before = structuredClone(snapshot);
    const ctx = assembleBirthSkyStreamContext({
      profile,
      snapshot,
      childFirstName: "Ada",
      userQuestion: "What should I notice?",
      entryPoint: "reflect",
      reflectionIds: ["r1"],
      reflectionCount: 1,
    });
    expect(snapshot).toEqual(before);
    expect(ctx.snapshotVersion).toBe("ss_1");
    expect(ctx.placeProvided).toBe(true);
    expect(JSON.stringify(ctx)).not.toContain("Secret Place");
    expect(JSON.stringify(ctx)).not.toContain("12:00");
    expect(JSON.stringify(ctx)).not.toContain('"lat"');
  });
});
