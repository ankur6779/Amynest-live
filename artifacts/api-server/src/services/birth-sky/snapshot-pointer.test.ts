import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldExposeCurrentSnapshot } from "./snapshot-generation-status.js";

/**
 * Regression guard: PDF/export paths must use the same visibility rule as GET /birth-sky
 * so new birth profile fields are never paired with a stale isCurrent astronomy payload.
 */
describe("snapshot pointer visibility for export", () => {
  it("blocks export after edit regen FAILED or in-flight COMPUTING", () => {
    assert.equal(shouldExposeCurrentSnapshot("FAILED", true), false);
    assert.equal(shouldExposeCurrentSnapshot("COMPUTING", true), false);
  });

  it("allows export when generation is READY or legacy PENDING with a snapshot", () => {
    assert.equal(shouldExposeCurrentSnapshot("READY", true), true);
    assert.equal(shouldExposeCurrentSnapshot("PENDING", true), true);
  });
});
