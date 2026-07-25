import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BIRTH_SKY_EXPORT_MANIFEST_VERSION,
  buildBirthSkyExportBundle,
  isSupportedExportManifestVersion,
} from "./export-service.js";

describe("birth-sky export-service Pack 7", () => {
  it("embeds exportManifestVersion and omits geo by default", () => {
    const bundle = buildBirthSkyExportBundle({
      exportType: "astronomy",
      childFirstName: "Ada",
      profile: {
        birthDate: "2020-01-01",
        timePrecision: "exact",
        birthPlace: { label: "Secret" },
      },
      snapshot: {
        snapshotVersion: "sv1",
        engineVersion: "amynest-astro-lite/1.0.0",
        mode: "full",
        computedAt: "2020-01-01T00:00:00.000Z",
        astronomy: {
          sunSign: "Capricorn",
          moonSign: "Cancer",
          moonPhaseLabel: "Full Moon",
          risingSign: "Leo",
        },
      },
      reflections: [],
      conversations: [],
    });
    assert.equal(bundle.manifest.exportManifestVersion, BIRTH_SKY_EXPORT_MANIFEST_VERSION);
    assert.equal(bundle.manifest.disclaimer, true);
    assert.equal(/lat|lon|Secret/.test(JSON.stringify(bundle)), false);
    assert.equal(isSupportedExportManifestVersion(bundle.manifest.exportManifestVersion), true);
  });

  it("summary includes disclaimer and mode", () => {
    const bundle = buildBirthSkyExportBundle({
      exportType: "summary",
      childFirstName: "Ada",
      profile: {
        birthDate: "2020-01-01",
        timePrecision: "unknown",
        birthPlace: null,
      },
      snapshot: {
        snapshotVersion: "sv1",
        engineVersion: "amynest-astro-lite/1.0.0",
        mode: "day_sky",
        computedAt: "2020-01-01T00:00:00.000Z",
        astronomy: { moonPhaseLabel: "Full Moon" },
      },
      reflections: [],
      conversations: [],
    });
    assert.equal(bundle.payload.mode, "day_sky");
    assert.match(String(bundle.payload.disclaimer), /not a scientific prediction/i);
  });
});
