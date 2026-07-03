import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getApiDomainMetrics,
  recordApiDomainOutcome,
  resetApiDomainMetrics,
} from "./api-domain-metrics.js";

describe("api-domain-metrics", () => {
  it("tracks success and failure per domain", () => {
    resetApiDomainMetrics();
    recordApiDomainOutcome("hub_journey", true, 120);
    recordApiDomainOutcome("hub_journey", false, 80, "server_error");
    const snap = getApiDomainMetrics();
    assert.equal(snap.domains.hub_journey.success, 1);
    assert.equal(snap.domains.hub_journey.failure, 1);
    assert.equal(snap.domains.hub_journey.total, 2);
    assert.equal(snap.domains.hub_journey.successRate, 0.5);
    assert.equal(snap.domains.hub_journey.lastErrorCode, "server_error");
  });
});
