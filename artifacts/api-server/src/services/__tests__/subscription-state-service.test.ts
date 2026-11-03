import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  deriveStateFromRevenueCatSnapshot,
  isStatePremium,
  productIdToPlan,
  shouldSkipStaleRevenueCatSnapshot,
} from "../subscriptionStateService.js";

const now = new Date("2026-01-01T00:00:00.000Z");
const future = new Date("2026-02-01T00:00:00.000Z");
const past = new Date("2025-12-01T00:00:00.000Z");
const repoRoot = resolve(import.meta.dirname, "../../../../..");

test("productIdToPlan maps AmyNest store products", () => {
  assert.equal(productIdToPlan("amynest_monthly_premium"), "monthly");
  assert.equal(productIdToPlan("amynest_monthly:monthly"), "monthly");
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

test("shouldSkipStaleRevenueCatSnapshot blocks older webhook payloads after a newer mirror", () => {
  const renewalAt = new Date("2026-03-01T00:00:00.000Z");
  const staleInitialAt = new Date("2026-01-15T00:00:00.000Z");
  assert.equal(shouldSkipStaleRevenueCatSnapshot(renewalAt, staleInitialAt), true);
  assert.equal(shouldSkipStaleRevenueCatSnapshot(renewalAt, renewalAt), false);
  assert.equal(shouldSkipStaleRevenueCatSnapshot(renewalAt, new Date("2026-03-02T00:00:00.000Z")), false);
  assert.equal(shouldSkipStaleRevenueCatSnapshot(null, staleInitialAt), false);
  assert.equal(shouldSkipStaleRevenueCatSnapshot(renewalAt, null), false);
});

test("applyRevenueCatSnapshot source contract refuses stale lastEventAt overwrites", () => {
  const source = readFileSync(
    resolve(repoRoot, "artifacts/api-server/src/services/subscriptionStateService.ts"),
    "utf8",
  );
  assert.match(source, /shouldSkipStaleRevenueCatSnapshot/);
  assert.match(source, /stale_revenuecat_event_skipped/);
  assert.match(source, /reason: "stale_event"/);
});

test("extendBonusPremium source contract extends atomically via GREATEST", () => {
  const source = readFileSync(
    resolve(repoRoot, "artifacts/api-server/src/services/subscriptionService.ts"),
    "utf8",
  );
  const fnStart = source.indexOf("export async function extendBonusPremium");
  assert.ok(fnStart >= 0);
  const fnBody = source.slice(fnStart, fnStart + 900);
  assert.match(fnBody, /GREATEST\(COALESCE\(\$\{subscriptionsTable\.bonusExpiresAt\}/);
  assert.match(fnBody, /interval '1 day'/);
  assert.doesNotMatch(fnBody, /const base = Math\.max\(now, sub\.bonusExpiresAt/);
});
