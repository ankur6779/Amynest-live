import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getAdminOpsState,
  resetAdminOpsStoreForTests,
} from "../admin-ops-store.js";
import {
  getServiceHeartbeat,
  resetServiceCrashStoreForTests,
} from "../service-crash-store.js";
import {
  resetCrashRecoveryControllerForTests,
  runCrashPollOnce,
} from "../crash-recovery-controller.js";
import { resetHealStabilityGuardForTests } from "../heal-stability-guard.js";
import type { ServiceProbes } from "../service-crash-probes.js";

describe("crash recovery", () => {
  beforeEach(() => {
    resetAdminOpsStoreForTests();
    resetServiceCrashStoreForTests();
    resetCrashRecoveryControllerForTests();
    resetHealStabilityGuardForTests();
  });

  it("marks service DOWN after 3 consecutive probe failures", async () => {
    const failingProbes: ServiceProbes = {
      backend: async () => ({ ok: true }),
      worker: async () => ({ ok: true }),
      redis: async () => ({ ok: false, error: "redis_ping_failed" }),
      db: async () => ({ ok: true }),
    };

    await runCrashPollOnce(failingProbes);
    await runCrashPollOnce(failingProbes);
    assert.equal(getServiceHeartbeat("redis").status, "UP");

    await runCrashPollOnce(failingProbes);
    assert.equal(getServiceHeartbeat("redis").status, "DOWN");
  });

  it("disables cache when Redis is DOWN", async () => {
    const failingProbes: ServiceProbes = {
      backend: async () => ({ ok: true }),
      worker: async () => ({ ok: true }),
      redis: async () => ({ ok: false, error: "redis_ping_failed" }),
      db: async () => ({ ok: true }),
    };

    for (let i = 0; i < 3; i++) {
      await runCrashPollOnce(failingProbes);
    }

    assert.equal(getAdminOpsState().cacheDisabled, true);
  });

  it("opens API circuit when backend is DOWN", async () => {
    const failingProbes: ServiceProbes = {
      backend: async () => ({ ok: false, error: "connection_refused" }),
      worker: async () => ({ ok: true }),
      redis: async () => ({ ok: true }),
      db: async () => ({ ok: true }),
    };

    for (let i = 0; i < 3; i++) {
      await runCrashPollOnce(failingProbes);
    }

    const ops = getAdminOpsState();
    assert.equal(getServiceHeartbeat("backend").status, "DOWN");
    assert.equal(ops.disableApi, true);
    assert.equal(ops.disableStreaming, true);
    assert.equal(ops.forceEmergencyMode, true);
  });

  it("recovers Redis and re-enables cache on successful probe", async () => {
    let redisOk = false;
    const probes: ServiceProbes = {
      backend: async () => ({ ok: true }),
      worker: async () => ({ ok: true }),
      redis: async () => (redisOk ? { ok: true } : { ok: false, error: "down" }),
      db: async () => ({ ok: true }),
    };

    for (let i = 0; i < 3; i++) {
      await runCrashPollOnce(probes);
    }
    assert.equal(getAdminOpsState().cacheDisabled, true);

    redisOk = true;
    await runCrashPollOnce(probes);

    assert.equal(getServiceHeartbeat("redis").status, "UP");
    assert.equal(getAdminOpsState().cacheDisabled, false);
  });

  it("pauses pregeneration when worker is DOWN", async () => {
    const failingProbes: ServiceProbes = {
      backend: async () => ({ ok: true }),
      worker: async () => ({ ok: false, error: "no_workers_registered" }),
      redis: async () => ({ ok: true }),
      db: async () => ({ ok: true }),
    };

    for (let i = 0; i < 3; i++) {
      await runCrashPollOnce(failingProbes);
    }

    assert.equal(getAdminOpsState().pregenerationPaused, true);
  });
});
