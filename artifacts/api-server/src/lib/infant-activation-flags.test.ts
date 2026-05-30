import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeInfantActivationFlags } from "./infant-activation-flags.js";

describe("computeInfantActivationFlags", () => {
  const emptySteps = { feed: false, sleep: false, weight: false, cry: false };

  it("shows activation for empty state regardless of profile age", () => {
    const flags = computeInfantActivationFlags(emptySteps, 30);
    assert.equal(flags.isEmptyState, true);
    assert.equal(flags.showActivation, true);
    assert.equal(flags.completedCount, 0);
    assert.equal(flags.completionRate, 0);
  });

  it("shows activation when profile is younger than 7 days with partial progress", () => {
    const flags = computeInfantActivationFlags(
      { feed: true, sleep: false, weight: false, cry: false },
      3,
    );
    assert.equal(flags.showActivation, true);
    assert.equal(flags.completionRate, 25);
  });

  it("hides activation after 7 days when some data exists", () => {
    const flags = computeInfantActivationFlags(
      { feed: true, sleep: false, weight: false, cry: false },
      10,
    );
    assert.equal(flags.showActivation, false);
  });

  it("marks fully activated when all four steps complete", () => {
    const flags = computeInfantActivationFlags(
      { feed: true, sleep: true, weight: true, cry: true },
      2,
    );
    assert.equal(flags.isFullyActivated, true);
    assert.equal(flags.showActivation, false);
    assert.equal(flags.completionRate, 100);
  });
});
