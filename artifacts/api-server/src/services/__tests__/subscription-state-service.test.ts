import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deriveStateFromRevenueCatSnapshot,
  isStatePremium,
  productIdToPlan,
} from "../subscriptionStateService.js";

const now = new Date("2026-01-01T00:00:00.000Z");
const future = new Date("2026-02-01T00:00:00.000Z");
const past = new Date("2025-12-01T00:00:00.000Z");

test("productIdToPlan maps AmyNest store products", () => {
  assert.equal(productIdToPlan("amynest_monthly_premium"), "monthly");
  assert.equal(productIdToPlan("amynest_6month_premium"), "six_month");
  assert.equal(productIdToPlan("amynest_yearly_premium"), "yearly");
  assert.equal(productIdToPlan("unknown"), null);
});

test("deriveStateFromRevenueCatSnapshot maps active entitlement", () => {
  const result = deriveStateFromRevenueCatSnapshot({
    appUserId: "user_1",
    expirationAt: future,
    productId: "amynest_yearly_premium",
  }, now);
  assert.equal(result.state, "ACTIVE");
  assert.equal(result.reason, "active_entitlement");
});

test("deriveStateFromRevenueCatSnapshot maps cancelled but paid period remaining", () => {
  const result = deriveStateFromRevenueCatSnapshot({
    appUserId: "user_1",
    expirationAt: future,
    autoRenewStatus: false,
  }, now);
  assert.equal(result.state, "CANCELLED");
  assert.equal(isStatePremium(result.state, { currentPeriodEnd: result.premiumUntil, now }), true);
});

test("deriveStateFromRevenueCatSnapshot maps grace period before expiration", () => {
  const result = deriveStateFromRevenueCatSnapshot({
    appUserId: "user_1",
    expirationAt: past,
    gracePeriodExpirationAt: future,
  }, now);
  assert.equal(result.state, "GRACE_PERIOD");
  assert.equal(isStatePremium(result.state, { gracePeriodExpiresAt: result.premiumUntil, now }), true);
});

test("deriveStateFromRevenueCatSnapshot maps expired entitlement", () => {
  const result = deriveStateFromRevenueCatSnapshot({
    appUserId: "user_1",
    expirationAt: past,
  }, now);
  assert.equal(result.state, "EXPIRED");
  assert.equal(isStatePremium(result.state, { currentPeriodEnd: result.premiumUntil, now }), false);
});
