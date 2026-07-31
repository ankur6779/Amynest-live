import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mayUseCurrentSnapshotForExport,
  shouldExposeCurrentSnapshot,
} from "./snapshot-generation-status.js";

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

describe("mayUseCurrentSnapshotForExport", () => {
  it("allows READY skies for PDF/AI/JSON export", () => {
    assert.deepEqual(mayUseCurrentSnapshotForExport("READY", true), {
      ok: true,
      generationStatus: "READY",
    });
  });

  it("blocks FAILED/COMPUTING so exports cannot mix new birth fields with stale astronomy", () => {
    assert.deepEqual(mayUseCurrentSnapshotForExport("FAILED", true), {
      ok: false,
      generationStatus: "FAILED",
    });
    assert.deepEqual(mayUseCurrentSnapshotForExport("COMPUTING", true), {
      ok: false,
      generationStatus: "COMPUTING",
    });
  });

  it("normalizes unknown status and still requires a snapshot", () => {
    assert.deepEqual(mayUseCurrentSnapshotForExport("bogus", true), {
      ok: true,
      generationStatus: "PENDING",
    });
    assert.deepEqual(mayUseCurrentSnapshotForExport("READY", false), {
      ok: false,
      generationStatus: "READY",
    });
  });
});
