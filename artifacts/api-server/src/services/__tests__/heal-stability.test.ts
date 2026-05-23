import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  canTriggerHealAction,
  confirmPredictiveSignal,
  recordHealAction,
  resetHealStabilityGuardForTests,
  tryHealAction,
} from "../heal-stability-guard.js";
import {
  resetHealHysteresisForTests,
  shouldDisableApi,
  shouldEnableApi,
  updateHealthLatches,
} from "../heal-hysteresis.js";
import {
  applyAdminOpsAction,
  applySelfHealInfraFlag,
  getAdminOpsState,
  resetAdminOpsStoreForTests,
} from "../admin-ops-store.js";

describe("heal stability guard", () => {
  beforeEach(() => {
    resetHealStabilityGuardForTests();
    resetHealHysteresisForTests();
    resetAdminOpsStoreForTests();
  });

  it("enforces action cooldown", () => {
    assert.equal(tryHealAction(1000), true);
    assert.equal(canTriggerHealAction(2000), false);
    assert.equal(tryHealAction(70_000), true);
  });

  it("limits actions per minute window", () => {
    for (let i = 0; i < 5; i++) {
      recordHealAction(1000 + i);
    }
    assert.equal(canTriggerHealAction(2000), false);
  });

  it("requires 2 consecutive predictive confirmations", () => {
    assert.equal(confirmPredictiveSignal("test", true), false);
    assert.equal(confirmPredictiveSignal("test", true), true);
    assert.equal(confirmPredictiveSignal("test", false), false);
  });

  it("applies API hysteresis thresholds", () => {
    updateHealthLatches({ apiErrorRate: 0.06, streamingStallRate: 0, failureRate: 0 });
    assert.equal(shouldDisableApi(0.06), true);
    assert.equal(shouldEnableApi(0.04), false);
    updateHealthLatches({ apiErrorRate: 0.02, streamingStallRate: 0, failureRate: 0 });
    assert.equal(shouldEnableApi(0.02), true);
  });

  it("forces emergency when all layers would be disabled", () => {
    applyAdminOpsAction("disable_api", "self-heal");
    applyAdminOpsAction("disable_streaming", "self-heal");
    applySelfHealInfraFlag("cacheDisabled", true);
    const ops = getAdminOpsState();
    assert.equal(ops.forceEmergencyMode, true);
    assert.equal(ops.cacheDisabled, false);
  });
});
