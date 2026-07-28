import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateProviderConsistency, withBrandConsistencyRetry } from "./consistency.js";
import { buildGoldenMasterPackage, compareAgainstGoldenMaster } from "./golden-master.js";
import { BRAND_LOCK_VERSION, getBrandLockManifest } from "./lock.js";
import { isMultiPlatformSafe } from "./platforms.js";

describe("brand RC-1 lock + golden master", () => {
  it("exposes immutable brand lock manifest", () => {
    const manifest = getBrandLockManifest();
    assert.equal(manifest.version, BRAND_LOCK_VERSION);
    assert.equal(manifest.immutable, true);
    assert.equal(manifest.colors.primary, "#6A2CFF");
    assert.ok(manifest.neverAllow.length >= 3);
  });

  it("builds golden master with canonical studio rules", () => {
    const master = buildGoldenMasterPackage();
    assert.equal(master.version, BRAND_LOCK_VERSION);
    assert.deepEqual(
      [...master.storyFormat],
      ["Hook", "Problem", "AmyNest Solution", "Benefit", "Download CTA"],
    );
    assert.equal(master.delivery.resolution, "1080x1920");
    assert.match(master.canonical.cinematicPrompt, /Pixar/i);
  });

  it("rejects golden-master deviations", () => {
    const bad = compareAgainstGoldenMaster({
      hasEndCard: false,
      hasCta: true,
      colorsPrimary: "#FF0000",
      storyPurposes: ["hook", "cta"],
      resolution: "720x1280",
    });
    assert.equal(bad.ok, false);
    assert.ok(bad.deviations.length >= 2);
  });

  it("retries with stronger conditioning on identity drift", async () => {
    let attempts = 0;
    const { result, attempts: used } = await withBrandConsistencyRetry({
      maxAttempts: 3,
      run: async (attempt, conditioning) => {
        attempts += 1;
        if (attempt === 0) {
          return { notes: "identity drift detected", conditioning };
        }
        return { notes: "ok", conditioning };
      },
      assess: (value, attempt) =>
        evaluateProviderConsistency({
          notes: value.notes,
          attempt,
        }),
    });
    assert.equal(result.notes, "ok");
    assert.ok(used >= 2);
    assert.equal(attempts, used);
  });

  it("enforces multi-platform 1080x1920", () => {
    assert.equal(isMultiPlatformSafe({ width: 1080, height: 1920, durationSeconds: 15 }).ok, true);
    assert.equal(isMultiPlatformSafe({ width: 720, height: 1280, durationSeconds: 15 }).ok, false);
  });
});
