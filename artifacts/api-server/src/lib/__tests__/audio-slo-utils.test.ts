import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computePercentiles, percentile } from "../audio-slo-utils.js";

describe("audio-slo-utils", () => {
  it("computes percentiles on sorted samples", () => {
    const stats = computePercentiles([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]);
    assert.equal(stats.count, 10);
    assert.equal(stats.p50, 500);
    assert.ok(stats.p95 >= 900);
    assert.ok(stats.p99 >= stats.p95);
  });

  it("returns zeros for empty input", () => {
    const stats = computePercentiles([]);
    assert.equal(stats.count, 0);
    assert.equal(stats.p50, 0);
  });

  it("percentile helper matches load-test convention", () => {
    const sorted = [10, 20, 30, 40, 50];
    assert.equal(percentile(sorted, 50), 30);
    assert.equal(percentile(sorted, 95), 50);
  });
});
