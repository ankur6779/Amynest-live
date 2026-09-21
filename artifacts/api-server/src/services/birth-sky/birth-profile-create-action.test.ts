import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { birthProfileCreateAction } from "./birth-profile-create-action.js";

describe("birthProfileCreateAction", () => {
  it("inserts when no prior row exists", () => {
    assert.equal(birthProfileCreateAction(null), "insert");
    assert.equal(birthProfileCreateAction(undefined), "insert");
  });

  it("updates an active profile in place", () => {
    assert.equal(birthProfileCreateAction({ deletedAt: null }), "update");
  });

  it("resurrects a soft-deleted profile instead of inserting", () => {
    assert.equal(
      birthProfileCreateAction({ deletedAt: new Date("2026-07-28T00:00:00.000Z") }),
      "resurrect",
    );
  });
});
