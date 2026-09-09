import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CERTIFICATION_FORCE_FREE_EMAILS,
  freeSubscriptionResetValues,
  isCertificationForceFreeEmail,
  shouldBlockStaleCertificationRevenueCatWrite,
} from "../certificationPremiumReset.js";

test("Champion6779 is the force-free certification tester", () => {
  assert.equal(isCertificationForceFreeEmail("Champion6779@gmail.com"), true);
  assert.equal(isCertificationForceFreeEmail("champion6779@gmail.com"), true);
  assert.equal(isCertificationForceFreeEmail(" champion6779@gmail.com "), true);
  assert.equal(isCertificationForceFreeEmail("tajkolli07@gmail.com"), false);
  assert.equal(isCertificationForceFreeEmail(null), false);
  assert.ok(CERTIFICATION_FORCE_FREE_EMAILS.includes("champion6779@gmail.com"));
});

test("stale RevenueCat renewals are blocked after the one-shot reset", () => {
  const resetAppliedAt = new Date("2026-09-09T10:00:00.000Z");
  assert.equal(
    shouldBlockStaleCertificationRevenueCatWrite({
      forceFree: true,
      resetAppliedAt,
      eventType: "RENEWAL",
      source: "webhook",
      grantsPremium: true,
    }),
    true,
  );
  assert.equal(
    shouldBlockStaleCertificationRevenueCatWrite({
      forceFree: true,
      resetAppliedAt,
      source: "restore",
      grantsPremium: true,
    }),
    true,
  );
  assert.equal(
    shouldBlockStaleCertificationRevenueCatWrite({
      forceFree: true,
      resetAppliedAt,
      source: "reconciliation",
      grantsPremium: true,
    }),
    true,
  );
});

test("a new Play purchase after reset is allowed to grant premium", () => {
  const resetAppliedAt = new Date("2026-09-09T10:00:00.000Z");
  assert.equal(
    shouldBlockStaleCertificationRevenueCatWrite({
      forceFree: true,
      resetAppliedAt,
      eventType: "INITIAL_PURCHASE",
      source: "webhook",
      grantsPremium: true,
    }),
    false,
  );
  assert.equal(
    shouldBlockStaleCertificationRevenueCatWrite({
      forceFree: true,
      resetAppliedAt,
      source: "purchase_finalize",
      grantsPremium: true,
    }),
    false,
  );
  assert.equal(
    shouldBlockStaleCertificationRevenueCatWrite({
      forceFree: true,
      resetAppliedAt,
      eventType: "RENEWAL",
      source: "webhook",
      lastPaidEventAt: new Date("2026-09-09T11:00:00.000Z"),
      grantsPremium: true,
    }),
    false,
  );
});

test("expiry writes and non-tester accounts are never blocked", () => {
  const resetAppliedAt = new Date("2026-09-09T10:00:00.000Z");
  assert.equal(
    shouldBlockStaleCertificationRevenueCatWrite({
      forceFree: true,
      resetAppliedAt,
      eventType: "EXPIRATION",
      source: "webhook",
      grantsPremium: false,
    }),
    false,
  );
  assert.equal(
    shouldBlockStaleCertificationRevenueCatWrite({
      forceFree: false,
      resetAppliedAt,
      eventType: "RENEWAL",
      source: "webhook",
      grantsPremium: true,
    }),
    false,
  );
  assert.equal(
    shouldBlockStaleCertificationRevenueCatWrite({
      forceFree: true,
      resetAppliedAt: null,
      eventType: "RENEWAL",
      source: "webhook",
      grantsPremium: true,
    }),
    false,
  );
});

test("free reset values satisfy the FREE provider-link check", () => {
  const values = freeSubscriptionResetValues(new Date("2026-09-09T10:00:00.000Z"));
  assert.equal(values.plan, "free");
  assert.equal(values.status, "free");
  assert.equal(values.provider, "none");
  assert.equal(values.subscriptionState, "FREE");
  assert.equal(values.providerSubscriptionId, null);
  assert.equal(values.revenuecatAppUserId, null);
  assert.equal(values.originalTransactionId, null);
  assert.equal(values.currentPeriodEnd, null);
  assert.equal(values.bonusExpiresAt, null);
});
