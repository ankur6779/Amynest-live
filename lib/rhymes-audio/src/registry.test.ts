import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getRhymesRegistryCount,
  getRhymesRegistryEntry,
  isValidRhymesGcsObjectPath,
  listRhymesRegistryEntries,
} from "./registry.js";

describe("rhymes-gcs-registry", () => {
  it("loads 168+ entries from GCS manifest", () => {
    assert.ok(getRhymesRegistryCount() >= 168);
  });

  it("resolves known lullaby ids", () => {
    const twinkle = getRhymesRegistryEntry("twinkle-twinkle-little-star");
    assert.ok(twinkle);
    assert.equal(twinkle!.objectPath, "Rhymes/Twinkle Twinkle Little Star.mp3");
    assert.ok(isValidRhymesGcsObjectPath(twinkle!.objectPath));
  });

  it("rejects invalid object paths", () => {
    assert.equal(isValidRhymesGcsObjectPath("../Rhymes/x.mp3"), false);
    assert.equal(isValidRhymesGcsObjectPath("static-audio/x.mp3"), false);
  });

  it("has unique ids", () => {
    const ids = listRhymesRegistryEntries().map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});
