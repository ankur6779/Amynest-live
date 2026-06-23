import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldDowngradeOnMissingEntitlement } from "../rcCustomerService.js";

test("shouldDowngradeOnMissingEntitlement allows reconciliation downgrades", () => {
  assert.equal(shouldDowngradeOnMissingEntitlement("reconciliation"), true);
  assert.equal(shouldDowngradeOnMissingEntitlement("manual_recovery"), true);
});

test("shouldDowngradeOnMissingEntitlement allows terminal webhook events", () => {
  assert.equal(shouldDowngradeOnMissingEntitlement("webhook", "EXPIRATION"), true);
  assert.equal(shouldDowngradeOnMissingEntitlement("webhook", "BILLING_ISSUE"), true);
  assert.equal(shouldDowngradeOnMissingEntitlement("webhook", "SUBSCRIPTION_PAUSED"), true);
  assert.equal(shouldDowngradeOnMissingEntitlement("webhook", "CANCELLATION"), true);
});

test("shouldDowngradeOnMissingEntitlement blocks purchase webhook downgrades", () => {
  assert.equal(shouldDowngradeOnMissingEntitlement("webhook", "INITIAL_PURCHASE"), false);
  assert.equal(shouldDowngradeOnMissingEntitlement("webhook", "RENEWAL"), false);
  assert.equal(shouldDowngradeOnMissingEntitlement("webhook", "UNCANCELLATION"), false);
  assert.equal(shouldDowngradeOnMissingEntitlement("purchase_finalize"), false);
  assert.equal(shouldDowngradeOnMissingEntitlement("restore"), false);
});
