import { beforeEach, describe, expect, it } from "vitest";
import {
  clearOfflineBundle,
  detectOfflineStorageVersion,
  loadOfflineBundle,
  recallOfflineProfileId,
  rememberOfflineChildProfile,
  saveOfflineBundle,
} from "./offline-cache-store";
import { __resetOfflineCryptoCacheForTests } from "./secure-offline-crypto";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";

const profile: BirthProfile = {
  profileId: "p1",
  childId: 9,
  userId: "u1",
  birthDate: "2020-01-01",
  birthTime: null,
  timePrecision: "unknown",
  birthPlace: null,
  consent: {
    consentVersion: "v1",
    acceptedAt: "2020-01-01T00:00:00.000Z",
    scopes: [],
    disclaimerAccepted: true,
    childId: 9,
  },
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-01-01T00:00:00.000Z",
};

const snapshot: SkySnapshot = {
  snapshotId: "s1",
  profileId: "p1",
  cacheKey: "c",
  snapshotVersion: "sv1",
  engineVersion: "amynest-astro-lite/1.0.0",
  computedAt: "2020-01-01T00:00:00.000Z",
  mode: "day_sky",
  astronomy: {
    bodies: [],
    sunSign: "Capricorn",
    moonSign: "Cancer",
    moonPhase: "full",
    moonPhaseLabel: "Full Moon",
    risingSign: null,
    houses: null,
    precision: { timePrecision: "unknown", placeProvided: false },
  },
};

describe("offline-cache-store Pack 7 + RC1 encryption", () => {
  beforeEach(() => {
    localStorage.clear();
    __resetOfflineCryptoCacheForTests();
  });

  it("round-trips current bundle only (encrypted at rest)", async () => {
    await saveOfflineBundle({
      schemaVersion: "1",
      cachedAt: "2020-01-02T00:00:00.000Z",
      profile,
      snapshot,
      preferences: {
        showTradition: true,
        skySounds: false,
        monthlyNotesOptIn: true,
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
    });
    rememberOfflineChildProfile(9, "p1");
    expect(recallOfflineProfileId(9)).toBe("p1");
    expect(detectOfflineStorageVersion("p1")).toBe("encrypted");
    expect((await loadOfflineBundle("p1"))?.snapshot.snapshotVersion).toBe("sv1");
    clearOfflineBundle("p1");
    expect(await loadOfflineBundle("p1")).toBeNull();
  });
});
