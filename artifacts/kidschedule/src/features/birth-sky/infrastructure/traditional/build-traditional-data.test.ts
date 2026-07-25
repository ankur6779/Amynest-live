import { describe, expect, it } from "vitest";
import { buildTraditionalData } from "./build-traditional-data";
import { TRADITIONAL_CONTENT_VERSION } from "../../constants/traditional-content";
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
    scopes: ["reflective"],
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
      { id: "sun", eclipticLongitudeDeg: 100, sign: "Cancer" },
      { id: "moon", eclipticLongitudeDeg: 10, sign: "Aries" },
    ],
    sunSign: "Cancer",
    moonSign: "Aries",
    moonPhase: "new",
    moonPhaseLabel: "New Moon",
    risingSign: null,
    houses: null,
    precision: { timePrecision: "unknown", placeProvided: false },
  },
};

describe("buildTraditionalData", () => {
  it("keys cultural data to snapshot without mutating snapshotVersion", () => {
    const data = buildTraditionalData(profile, snapshot);
    expect(data.lens).toBe("tradition");
    expect(data.snapshotVersion).toBe("ss_1");
    expect(data.traditionalContentVersion).toBe(TRADITIONAL_CONTENT_VERSION);
    expect(data.lunarMansionKey).toMatch(/^mansion_\d{2}$/);
    expect(snapshot.snapshotVersion).toBe("ss_1");
  });
});
