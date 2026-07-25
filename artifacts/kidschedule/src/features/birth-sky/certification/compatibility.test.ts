/**
 * Compatibility Matrix validation + upgrade hydration (Pack 8 Addendum A, A7).
 * RC1-04: migration must preserve version axes; historical snapshots stay readable.
 */
import { describe, expect, it } from "vitest";
import {
  getVersionRegistrySnapshot,
  isSupportedContextSchemaVersion,
  isSupportedExportManifestVersion,
  BIRTH_SKY_CERT_APP_BUILD,
} from "./version-registry";
import { hydrateSkySnapshot } from "../domain/models/sky-snapshot-compat";
import {
  BIRTH_SKY_EXPORT_MANIFEST_VERSION,
  BIRTH_SKY_PRIVACY_POLICY_VERSION,
} from "../constants/lifecycle";
import { BIRTH_SKY_CONTEXT_SCHEMA_VERSION } from "../constants/ai-context";
import { BIRTH_SKY_ENGINE_VERSION_WRITES } from "../domain/models/birth-profile";
import { BIRTH_SKY_LENS_SDK_VERSION } from "../platform/constants";
import { TRADITIONAL_CONTENT_VERSION } from "../constants/traditional-content";
import { validateLensManifest } from "../platform/lens-validate";
import { loadOfflineBundleWithMigration } from "../infrastructure/repositories/offline-cache-store";
import { __resetOfflineCryptoCacheForTests } from "../infrastructure/repositories/secure-offline-crypto";
import type { BirthProfile, SkySnapshot } from "../domain/models/birth-profile";

describe("IM-7 Compatibility Matrix", () => {
  it("publishes all required axes for app build", () => {
    const reg = getVersionRegistrySnapshot();
    expect(reg.appBuild).toBe(BIRTH_SKY_CERT_APP_BUILD);
    expect(reg.engineVersion.computeWrites).toBe(BIRTH_SKY_ENGINE_VERSION_WRITES);
    expect(reg.contextSchemaVersion.write).toBe(BIRTH_SKY_CONTEXT_SCHEMA_VERSION);
    expect(reg.exportManifestVersion.write).toBe(BIRTH_SKY_EXPORT_MANIFEST_VERSION);
    expect(reg.privacyPolicyVersion.required).toMatch(/^birth_sky_privacy\//);
    expect(reg.lensSdkVersion.current).toBe(BIRTH_SKY_LENS_SDK_VERSION);
    expect(reg.traditionalContentVersion.current).toMatch(/^tradition_pack\//);
    expect(reg.modelVersion.policy).toBe("per_delivery_on_conversation_messages");
  });

  it("fails safe on unsupported export/context versions", () => {
    expect(isSupportedExportManifestVersion(BIRTH_SKY_EXPORT_MANIFEST_VERSION)).toBe(true);
    expect(isSupportedExportManifestVersion("birth_sky_export/0.0.0")).toBe(false);
    expect(isSupportedContextSchemaVersion(BIRTH_SKY_CONTEXT_SCHEMA_VERSION)).toBe(true);
    expect(isSupportedContextSchemaVersion("nope")).toBe(false);
  });

  it("hydrates older engineVersion snapshots without requiring regen", () => {
    const legacy = {
      snapshotId: "legacy-1",
      profileId: "p1",
      cacheKey: "k",
      snapshotVersion: "ss_legacy",
      engineVersion: "retired-engine/0.1.0",
      computedAt: "2019-01-01T00:00:00.000Z",
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
    const result = hydrateSkySnapshot(legacy);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.engineVersion).toBe("retired-engine/0.1.0");
      expect(result.snapshot.snapshotVersion).toBe("ss_legacy");
    }
  });

  it("lens SDK peer validates birth_sky metadata", () => {
    const report = validateLensManifest({
      lensId: "birth_sky",
      displayName: "Birth Sky",
      description: "primary",
      lensVersion: "1.0.0",
      sdkVersion: BIRTH_SKY_LENS_SDK_VERSION,
      capabilities: ["parentOnly", "requiresSkySnapshot", "requiresBirthProfile"],
      featureFlag: "VITE_FF_BIRTH_SKY",
      orderHint: 0,
      privacyScopes: [],
      owner: "birth-sky-core",
    });
    expect(report.ok).toBe(true);
    expect(report.sdkPeerOk).toBe(true);
  });

  it("RC1-04: offline migration preserves snapshot/engine version axes", async () => {
    localStorage.clear();
    __resetOfflineCryptoCacheForTests();
    const profile: BirthProfile = {
      profileId: "p-compat",
      childId: 2,
      userId: "u",
      birthDate: "2020-01-01",
      birthTime: "10:00",
      timePrecision: "exact",
      birthPlace: { label: "X", lat: 1, lon: 2 },
      consent: {
        consentVersion: "v",
        acceptedAt: "2020-01-01T00:00:00.000Z",
        scopes: [],
        disclaimerAccepted: true,
        childId: 2,
      },
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    };
    const snapshot: SkySnapshot = {
      snapshotId: "s-compat",
      profileId: "p-compat",
      cacheKey: "c",
      snapshotVersion: "ss_hist_1",
      engineVersion: "retired-engine/0.1.0",
      computedAt: "2019-01-01T00:00:00.000Z",
      mode: "day_sky",
      astronomy: {
        bodies: [],
        sunSign: "Capricorn",
        moonSign: "Cancer",
        moonPhase: "full",
        moonPhaseLabel: "Full Moon",
        risingSign: null,
        houses: null,
        precision: { timePrecision: "exact", placeProvided: true },
      },
    };
    localStorage.setItem(
      "amynest:birth-sky:offline-bundle:v1:p-compat",
      JSON.stringify({
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
      }),
    );
    const { bundle } = await loadOfflineBundleWithMigration("p-compat");
    expect(bundle?.snapshot.snapshotVersion).toBe("ss_hist_1");
    expect(bundle?.snapshot.engineVersion).toBe("retired-engine/0.1.0");
    const hydrated = hydrateSkySnapshot(bundle!.snapshot);
    expect(hydrated.ok).toBe(true);

    // Registry axes still published after RC1 (not mutated by offline migration)
    const reg = getVersionRegistrySnapshot();
    expect(reg.traditionalContentVersion.current).toBe(TRADITIONAL_CONTENT_VERSION);
    expect(reg.contextSchemaVersion.write).toBe(BIRTH_SKY_CONTEXT_SCHEMA_VERSION);
    expect(reg.exportManifestVersion.write).toBe(BIRTH_SKY_EXPORT_MANIFEST_VERSION);
    expect(reg.privacyPolicyVersion.required).toBe(BIRTH_SKY_PRIVACY_POLICY_VERSION);
    expect(reg.modelVersion.policy).toBe("per_delivery_on_conversation_messages");
    expect(reg.offlineBundleSchema.current).toBe("2");
  });
});
