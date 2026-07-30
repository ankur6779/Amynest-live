import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldExposeCurrentSnapshot } from "./snapshot-generation-status.js";

describe("shouldExposeCurrentSnapshot", () => {
  it("exposes READY and PENDING when a snapshot exists", () => {
    assert.equal(shouldExposeCurrentSnapshot("READY", true), true);
    assert.equal(shouldExposeCurrentSnapshot("PENDING", true), true);
  });

  it("hides stale snapshot during COMPUTING or after FAILED", () => {
    assert.equal(shouldExposeCurrentSnapshot("COMPUTING", true), false);
    assert.equal(shouldExposeCurrentSnapshot("FAILED", true), false);
  });

  it("never exposes when there is no snapshot", () => {
    assert.equal(shouldExposeCurrentSnapshot("READY", false), false);
    assert.equal(shouldExposeCurrentSnapshot("FAILED", false), false);
  });
});
