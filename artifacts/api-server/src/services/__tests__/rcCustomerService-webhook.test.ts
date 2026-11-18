import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldWriteFreeSnapshotOnMissingEntitlement } from "../rcCustomerService.js";

test("defers FREE snapshot for grant webhooks while RC entitlements lag", () => {
  assert.equal(
    shouldWriteFreeSnapshotOnMissingEntitlement("webhook", "INITIAL_PURCHASE"),
    false,
  );
  assert.equal(
    shouldWriteFreeSnapshotOnMissingEntitlement("webhook", "RENEWAL"),
    false,
  );
});

test("allows FREE snapshot for terminal webhook events", () => {
  assert.equal(
    shouldWriteFreeSnapshotOnMissingEntitlement("webhook", "EXPIRATION"),
    true,
  );
  assert.equal(
    shouldWriteFreeSnapshotOnMissingEntitlement("webhook", "CANCELLATION"),
    true,
  );
});

test("defers FREE snapshot for purchase finalize sync", () => {
  assert.equal(shouldWriteFreeSnapshotOnMissingEntitlement("purchase_finalize"), false);
});

test("allows FREE snapshot during reconciliation", () => {
  assert.equal(
    shouldWriteFreeSnapshotOnMissingEntitlement("reconciliation", "INITIAL_PURCHASE"),
    true,
  );
});
