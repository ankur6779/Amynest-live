/**
 * Privacy / analytics / export / delete / offline certification probes
 * (Pack 8 Parts 4/10, Conformance P1/P5–P6, AI13) — RC1 verification.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { scrubBirthSkyAnalyticsProps } from "../lib/analytics-scrub";
import { BIRTH_SKY_EVENT_NAMES } from "../lib/event-taxonomy";
import {
  clearOfflineBundle,
  detectOfflineStorageVersion,
  loadOfflineBundle,
  offlineStorageContainsPlaintextBirthMarkers,
  readRawOfflineStorage,
  saveOfflineBundle,
} from "../infrastructure/repositories/offline-cache-store";
import { __resetOfflineCryptoCacheForTests } from "../infrastructure/repositories/secure-offline-crypto";
import {
  clearReflectionStore,
  loadReflectionStore,
  saveReflectionEntry,
} from "../infrastructure/repositories/reflection-store";
import type { BirthProfile, SkySnapshot } from "../domain/models/birth-profile";

const profile: BirthProfile = {
  profileId: "p-cert",
  childId: 1,
  userId: "u",
  birthDate: "2020-01-01",
  birthTime: "08:30",
  timePrecision: "exact",
  birthPlace: { label: "Test", lat: 1.234567, lon: 2.345678 },
  consent: {
    consentVersion: "v",
    acceptedAt: "2020-01-01T00:00:00.000Z",
    scopes: [],
    disclaimerAccepted: true,
    childId: 1,
  },
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-01-01T00:00:00.000Z",
};

const snapshot: SkySnapshot = {
  snapshotId: "s",
  profileId: "p-cert",
  cacheKey: "c",
  snapshotVersion: "sv",
  engineVersion: "amynest-astro-lite/1.0.0",
  computedAt: "2020-01-01T00:00:00.000Z",
  mode: "full",
  astronomy: {
    bodies: [],
    sunSign: "A",
    moonSign: "B",
    moonPhase: "c",
    moonPhaseLabel: "D",
    risingSign: null,
    houses: null,
    precision: { timePrecision: "exact", placeProvided: true },
  },
};

describe("RC1 privacy & analytics certification", () => {
  beforeEach(() => {
    localStorage.clear();
    __resetOfflineCryptoCacheForTests();
  });

  it("scrub rejects birth time/place/coords/journal/AI text keys", () => {
    const forbidden = [
      { birth_time: "12:00" },
      { birthPlace: "X" },
      { lat: 1 },
      { lon: 2 },
      { journal_text: "secret" },
      { prompt: "hi" },
      { ai_response: "bye" },
      { sky_payload: {} },
    ];
    for (const props of forbidden) {
      expect(scrubBirthSkyAnalyticsProps(props).ok).toBe(false);
    }
  });

  it("scrub allows opaque version ids only", () => {
    const ok = scrubBirthSkyAnalyticsProps({
      snapshotVersion: "ss_1",
      engineVersion: "amynest-astro-lite/1.0.0",
      export_type: "summary",
      lensId: "birth_sky",
    });
    expect(ok.ok).toBe(true);
  });

  it("taxonomy includes lifecycle + lens platform events (allowlist)", () => {
    expect(BIRTH_SKY_EVENT_NAMES).toContain("birth_sky.export_completed");
    expect(BIRTH_SKY_EVENT_NAMES).toContain("birth_sky.lens_registered");
    expect(BIRTH_SKY_EVENT_NAMES).not.toContain("birth_sky.prompt_text");
  });

  it("offline cache encrypts birth time/place — no plaintext in localStorage (P1 PASS)", async () => {
    await saveOfflineBundle({
      schemaVersion: "1",
      cachedAt: new Date().toISOString(),
      profile,
      snapshot,
      preferences: {
        showTradition: true,
        skySounds: false,
        monthlyNotesOptIn: true,
        updatedAt: new Date().toISOString(),
      },
    });
    const raw = readRawOfflineStorage("p-cert");
    expect(raw).toBeTruthy();
    expect(detectOfflineStorageVersion("p-cert")).toBe("encrypted");
    expect(offlineStorageContainsPlaintextBirthMarkers("p-cert")).toBe(false);
    expect(raw).not.toContain("08:30");
    expect(raw).not.toContain("1.234567");
    expect(raw).not.toContain("2.345678");
    expect(raw).not.toMatch(/"birthTime"\s*:/);
    expect(raw).not.toMatch(/"latitude"\s*:/);
    const loaded = await loadOfflineBundle("p-cert");
    expect(loaded?.profile.birthTime).toBe("08:30");
    expect(loaded?.profile.birthPlace?.lat).toBe(1.234567);
  });

  it("delete inspection: clearOfflineBundle + clearReflectionStore remove local secrets", async () => {
    await saveOfflineBundle({
      schemaVersion: "1",
      cachedAt: new Date().toISOString(),
      profile,
      snapshot,
      preferences: {
        showTradition: true,
        skySounds: false,
        monthlyNotesOptIn: true,
        updatedAt: new Date().toISOString(),
      },
    });
    saveReflectionEntry({
      profileId: profile.profileId,
      snapshotVersion: snapshot.snapshotVersion,
      promptId: "p1",
      body: "private journal",
    });
    clearOfflineBundle(profile.profileId);
    clearReflectionStore(profile.profileId);
    expect(await loadOfflineBundle(profile.profileId)).toBeNull();
    expect(readRawOfflineStorage(profile.profileId)).toBeNull();
    expect(loadReflectionStore(profile.profileId).entries).toHaveLength(0);
  });

  it("export inspection: analytics scrub never allows export payload bodies", () => {
    const scrub = scrubBirthSkyAnalyticsProps({
      export_type: "full",
      exportManifestVersion: "birth_sky_export/1.0.0",
      payload: { birthTime: "08:30" },
    });
    expect(scrub.ok).toBe(false);
  });

  it("AI telemetry inspection: no prompt/response/journal/birth secrets", () => {
    const aiForbidden = [
      { prompt: "What does the sky mean?" },
      { prompt_text: "x" },
      { ai_response: "It means…" },
      { response_text: "y" },
      { journal_text: "dear diary" },
      { reflection_text: "note" },
      { conversation_text: "chat" },
      { birthTime: "08:30" },
      { birth_place: "City" },
      { lat: 12.97 },
      { sky_payload: { sunSign: "A" } },
    ];
    for (const props of aiForbidden) {
      expect(scrubBirthSkyAnalyticsProps(props).ok).toBe(false);
    }
    const allowed = scrubBirthSkyAnalyticsProps({
      entryPoint: "reflect",
      gate_outcome: "allowed",
      contextSchemaVersion: "birth_sky_context/1.0.0",
      modelVersion: "opaque-model-id",
      snapshotVersion: "ss_1",
      engineVersion: "amynest-astro-lite/1.0.0",
      deliveryId: "d1",
    });
    expect(allowed.ok).toBe(true);
  });
});
