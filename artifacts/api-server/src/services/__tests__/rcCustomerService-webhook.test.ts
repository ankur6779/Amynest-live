import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldWriteFreeSnapshotOnMissingEntitlement } from "../rcCustomerService.js";

test("missing V2 entitlements defer FREE writes for webhooks so payload fallback can grant premium", () => {
  assert.equal(shouldWriteFreeSnapshotOnMissingEntitlement("webhook"), false);
});

test("missing V2 entitlements still write FREE for restore and reconciliation", () => {
  assert.equal(shouldWriteFreeSnapshotOnMissingEntitlement("restore"), true);
  assert.equal(shouldWriteFreeSnapshotOnMissingEntitlement("reconciliation"), true);
  assert.equal(shouldWriteFreeSnapshotOnMissingEntitlement("manual_recovery"), true);
});

test("webhook handler must run payload fallback when sync reports no entitlement lag", () => {
  const laggingV2Sync = { dbUpdated: false, reason: "no_active_entitlement" };
  assert.equal(!laggingV2Sync.dbUpdated, true);

  const prematureFreeWrite = { dbUpdated: true, reason: "no_active_entitlement" };
  assert.equal(!prematureFreeWrite.dbUpdated, false);
});
