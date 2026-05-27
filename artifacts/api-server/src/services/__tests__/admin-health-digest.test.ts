import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  composeAdminHealthDigest,
  isAdminHealthDigestEnabled,
  resetAdminHealthDigestForTests,
} from "../adminHealthDigestService.js";
import { getAdminDashboard, resetAudioHealthStoreForTests } from "../audio-health-store.js";
import { resetSystemHealthStoreForTests } from "../system-health-store.js";

describe("admin health digest", () => {
  const prevEnabled = process.env["ADMIN_HEALTH_DIGEST_ENABLED"];

  beforeEach(() => {
    resetAdminHealthDigestForTests();
    resetAudioHealthStoreForTests();
    resetSystemHealthStoreForTests();
  });

  afterEach(() => {
    if (prevEnabled === undefined) delete process.env["ADMIN_HEALTH_DIGEST_ENABLED"];
    else process.env["ADMIN_HEALTH_DIGEST_ENABLED"] = prevEnabled;
  });

  it("detects enabled flag", () => {
    process.env["ADMIN_HEALTH_DIGEST_ENABLED"] = "1";
    assert.equal(isAdminHealthDigestEnabled(), true);
    process.env["ADMIN_HEALTH_DIGEST_ENABLED"] = "true";
    assert.equal(isAdminHealthDigestEnabled(), true);
    delete process.env["ADMIN_HEALTH_DIGEST_ENABLED"];
    assert.equal(isAdminHealthDigestEnabled(), false);
  });

  it("composes digest with dashboard and system snapshot", async () => {
    const dashboard = getAdminDashboard(Date.now());
    const system = {
      health: {
        apiHealthy: true,
        streamingHealthy: true,
        cacheHealthy: true,
        workerHealthy: true,
        dbHealthy: true,
        failureRate: 0,
        avgTTFA: 0,
        lastUpdated: Date.now(),
      },
      metrics: {
        audioFailureRate: 0,
        apiErrorRate: 0.01,
        streamingStallRate: 0.02,
        workerQueueDelayMs: 100,
        cacheHitRate: 0.5,
        dbLatencyMs: 40,
        redisHealthy: true,
      },
      incidents: [],
      services: {
        downCount: 0,
        services: [{ service: "backend", status: "UP" as const, consecutiveFailures: 0, lastError: null }],
      },
      predictive: undefined,
    };

    const composed = composeAdminHealthDigest({ dashboard, system });
    assert.match(composed.subject, /\[AmyNest Health\]/);
    assert.match(composed.text, /AmyNest Health Report/);
    assert.match(composed.text, /Infrastructure/);
    assert.match(composed.html, /Open admin dashboard/);
  });
});
