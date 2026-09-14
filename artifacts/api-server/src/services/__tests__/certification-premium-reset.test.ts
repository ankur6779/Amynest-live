import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CERTIFICATION_FORCE_FREE_EMAILS,
  freeSubscriptionResetValues,
  isCertificationForceFreeEmail,
  shouldBlockStaleCertificationRevenueCatWrite,
  shouldKeepPostResetPurchase,
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

test("shouldKeepPostResetPurchase keeps store + purchase_finalize CUSTOMER_SYNC mirrors", () => {
  const resetAppliedAt = new Date("2026-09-09T10:00:00.000Z");
  const after = new Date("2026-09-09T11:00:00.000Z");
  const before = new Date("2026-09-09T09:00:00.000Z");

  assert.equal(shouldKeepPostResetPurchase(resetAppliedAt, "INITIAL_PURCHASE", after), true);
  assert.equal(shouldKeepPostResetPurchase(resetAppliedAt, "RENEWAL", after), true);
  assert.equal(shouldKeepPostResetPurchase(resetAppliedAt, "PRODUCT_CHANGE", after), true);
  assert.equal(shouldKeepPostResetPurchase(resetAppliedAt, "UNCANCELLATION", after), true);
  assert.equal(shouldKeepPostResetPurchase(resetAppliedAt, "NON_RENEWING_PURCHASE", after), true);
  // purchase_finalize / reconciliation default eventType from buildSnapshotFromV2
  assert.equal(shouldKeepPostResetPurchase(resetAppliedAt, "CUSTOMER_SYNC", after), true);

  assert.equal(shouldKeepPostResetPurchase(resetAppliedAt, "INITIAL_PURCHASE", before), false);
  assert.equal(shouldKeepPostResetPurchase(resetAppliedAt, "CUSTOMER_SYNC", before), false);
  assert.equal(shouldKeepPostResetPurchase(resetAppliedAt, "certification_reset", after), false);
  assert.equal(shouldKeepPostResetPurchase(resetAppliedAt, null, after), false);
  assert.equal(shouldKeepPostResetPurchase(resetAppliedAt, "RENEWAL", null), false);
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

test("force-free blocking is email-scoped in source (no lastEventType sticky)", async () => {
  const { readFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const src = readFileSync(resolve(import.meta.dirname, "../certificationPremiumReset.ts"), "utf8");
  assert.match(src, /Email-scoped only/);
  assert.doesNotMatch(
    src,
    /forceFree =\s*emails\.some\([^)]+\)\s*\|\|\s*sub\?\.lastEventType === "certification_reset"/,
  );
  assert.match(src, /POST_RESET_PAID_EVENT_TYPES/);
  assert.match(src, /"CUSTOMER_SYNC"/);
});
