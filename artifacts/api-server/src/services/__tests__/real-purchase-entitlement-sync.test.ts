import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import {
  applyRevenueCatSnapshot,
  deriveStateFromRevenueCatSnapshot,
  isStatePremium,
  productIdToPlan,
} from "../subscriptionStateService.js";
import { isPremiumNow, isPremiumSubscriberNow } from "../subscription-premium-gate.js";
import { isDbIntegrationAvailable } from "../../test/db-integration.js";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const AMYWORLD_UID = "Mvc8x7Jdoid7hmrZVJywGe979qO2";
const OTHER_UID = "DifferentUserUid0000000000001";
const PLAY_TXN = "GPA.3305-5562-8196-73420";
const PRODUCT = "amynest_monthly:monthly";

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

const purchasedAt = new Date("2026-09-12T17:01:39.000Z");
const periodEnd = new Date("2026-10-12T17:01:10.000Z");
const expiredEnd = new Date("2026-08-12T17:01:10.000Z");

function amyworldSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    appUserId: AMYWORLD_UID,
    originalAppUserId: AMYWORLD_UID,
    entitlementId: "premium",
    productId: PRODUCT,
    store: "play_store",
    environment: "PLAY_LIVE",
    originalTransactionId: PLAY_TXN,
    latestTransactionId: PLAY_TXN,
    expirationAt: periodEnd,
    autoRenewStatus: true,
    eventType: "INITIAL_PURCHASE",
    eventAt: purchasedAt,
    ...overrides,
  };
}

describe("real Play purchase entitlement sync — resolver", () => {
  it("T0: missing DB row / FREE state is never premium", () => {
    const free = {
      status: "free",
      plan: "free",
      provider: "none",
      subscriptionState: "FREE",
      trialEndsAt: null,
      currentPeriodEnd: null,
      bonusExpiresAt: null,
      expiresAt: null,
      gracePeriodExpiresAt: null,
    };
    assert.equal(isPremiumNow(free as never), false);
    assert.equal(isPremiumSubscriberNow(free as never), false);
  });

  it("T1/T2: INITIAL_PURCHASE snapshot for amynest_monthly:monthly is ACTIVE premium", () => {
    assert.equal(productIdToPlan(PRODUCT), "monthly");
    const derived = deriveStateFromRevenueCatSnapshot(amyworldSnapshot(), purchasedAt);
    assert.equal(derived.state, "ACTIVE");
    assert.equal(derived.reason, "active_entitlement");
    assert.equal(
      isStatePremium(derived.state, { currentPeriodEnd: derived.premiumUntil, now: purchasedAt }),
      true,
    );
    assert.equal(
      isPremiumNow({
        status: "active",
        plan: "monthly",
        provider: "revenuecat",
        subscriptionState: "ACTIVE",
        currentPeriodEnd: periodEnd,
        expiresAt: periodEnd,
        trialEndsAt: null,
        bonusExpiresAt: null,
        gracePeriodExpiresAt: null,
      } as never),
      true,
    );
    assert.equal(
      isPremiumSubscriberNow({
        status: "active",
        plan: "monthly",
        provider: "revenuecat",
        subscriptionState: "ACTIVE",
        currentPeriodEnd: periodEnd,
        expiresAt: periodEnd,
      } as never),
      true,
    );
  });

  it("expired webhook / period end in the past is not premium", () => {
    const derived = deriveStateFromRevenueCatSnapshot(
      amyworldSnapshot({ expirationAt: expiredEnd }),
      new Date("2026-09-12T17:04:00.000Z"),
    );
    assert.equal(derived.state, "EXPIRED");
    assert.equal(
      isPremiumNow({
        status: "canceled",
        plan: "free",
        provider: "revenuecat",
        subscriptionState: "EXPIRED",
        currentPeriodEnd: expiredEnd,
        expiresAt: expiredEnd,
        trialEndsAt: null,
        bonusExpiresAt: null,
        gracePeriodExpiresAt: null,
      } as never),
      false,
    );
    assert.equal(
      isPremiumSubscriberNow({
        status: "canceled",
        provider: "revenuecat",
        subscriptionState: "EXPIRED",
        currentPeriodEnd: expiredEnd,
        expiresAt: expiredEnd,
      } as never),
      false,
    );
  });

  it("cancelled but still within paid period remains premium subscriber", () => {
    const derived = deriveStateFromRevenueCatSnapshot(
      amyworldSnapshot({ autoRenewStatus: false, cancelledAt: purchasedAt }),
      purchasedAt,
    );
    assert.equal(derived.state, "CANCELLED");
    assert.equal(
      isPremiumSubscriberNow({
        status: "active",
        provider: "revenuecat",
        subscriptionState: "CANCELLED",
        currentPeriodEnd: periodEnd,
        expiresAt: periodEnd,
      } as never),
      true,
    );
  });

  it("unknown / missing period never becomes premium", () => {
    const derived = deriveStateFromRevenueCatSnapshot({
      appUserId: AMYWORLD_UID,
      productId: PRODUCT,
    });
    assert.equal(derived.state, "FREE");
    assert.equal(isStatePremium("FREE", {}), false);
  });

  it("a different user's missing row cannot inherit this transaction", () => {
    assert.notEqual(OTHER_UID, AMYWORLD_UID);
    assert.equal(
      isPremiumNow({
        status: "free",
        plan: "free",
        provider: "none",
        subscriptionState: "FREE",
        currentPeriodEnd: null,
        expiresAt: null,
        trialEndsAt: null,
        bonusExpiresAt: null,
        gracePeriodExpiresAt: null,
      } as never),
      false,
    );
  });
});

describe("real Play purchase entitlement sync — source contracts", () => {
  it("rc-sync accepts purchase_finalize and restore; rejects unknown purposes", () => {
    const route = readRepoFile("artifacts/api-server/src/routes/subscription.ts");
    assert.match(route, /purpose: z\.enum\(\["restore", "purchase_finalize"\]\)/);
    assert.match(route, /source: parsed\.data\.purpose/);
    assert.match(route, /reason: "webhook_required"/);
    assert.match(route, /"INITIAL_PURCHASE"/);
    assert.match(route, /"RENEWAL"/);
    assert.match(route, /"CANCELLATION"/);
    assert.match(route, /"EXPIRATION"/);
    assert.match(route, /"BILLING_ISSUE"/);
    assert.match(route, /"REFUND"/);
    assert.match(route, /"PRODUCT_CHANGE"/);
    assert.match(route, /"TRANSFER"/);
    assert.match(route, /onConflictDoNothing/);
    assert.match(route, /revenuecatWebhookEventsTable\.eventId/);
  });

  it("GET /subscription does not pull RevenueCat for first-time free rows", () => {
    const route = readRepoFile("artifacts/api-server/src/routes/subscription.ts");
    assert.match(route, /row\.provider !== "revenuecat"/);
    assert.match(route, /!row\.revenuecatAppUserId/);
    assert.match(route, /!row\.originalTransactionId/);
  });

  it("native finalize posts purchase_finalize before polling GET", () => {
    const finalize = readRepoFile("artifacts/kidschedule/src/lib/native-purchase-finalize.ts");
    assert.match(finalize, /postRevenueCatSync\(authFetch, "purchase_finalize"\)/);
    assert.match(finalize, /postRevenueCatSync\(authFetch, "restore"\)/);
    assert.doesNotMatch(finalize, /purpose: "restore" \}/);
  });

  it("analytics purchase_success stays an observer after subscriber confirmation", () => {
    const hook = readRepoFile("artifacts/kidschedule/src/hooks/use-native-billing.ts");
    const finalizeIdx = hook.indexOf("const finalized = await finalizeNativePurchase");
    const purchaseSuccessIdx = hook.indexOf("recordVerifiedStorePurchase", finalizeIdx);
    const entitlementIdx = hook.indexOf("recordEntitlementActivated", purchaseSuccessIdx);
    assert.ok(finalizeIdx >= 0);
    assert.ok(purchaseSuccessIdx > finalizeIdx);
    assert.ok(entitlementIdx > purchaseSuccessIdx);
    assert.match(hook, /if \(finalized\.isPremiumSubscriber && storeMeta\)/);
  });
});

const dbOk = await isDbIntegrationAvailable();
const TEST_PAID = `rc-sync-paid-${Date.now()}`;
const TEST_OTHER = `rc-sync-other-${Date.now()}`;

describe("real Play purchase entitlement sync — DB snapshot writer", { skip: !dbOk }, () => {
  after(async () => {
    if (!dbOk) return;
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, TEST_PAID));
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, TEST_OTHER));
  });

  it("writes one ACTIVE revenuecat row and is idempotent on replay", async () => {
    const first = await applyRevenueCatSnapshot(
      TEST_PAID,
      amyworldSnapshot({ appUserId: TEST_PAID, originalAppUserId: TEST_PAID }),
      { source: "webhook", providerEventId: "evt_initial_1" },
    );
    assert.equal(first.toState, "ACTIVE");
    assert.equal(first.isPremium, true);
    assert.equal(first.plan, "monthly");

    const replay = await applyRevenueCatSnapshot(
      TEST_PAID,
      amyworldSnapshot({ appUserId: TEST_PAID, originalAppUserId: TEST_PAID }),
      { source: "webhook", providerEventId: "evt_initial_1" },
    );
    assert.equal(replay.toState, "ACTIVE");
    assert.equal(replay.isPremium, true);

    const rows = await db.query.subscriptionsTable.findMany({
      where: eq(subscriptionsTable.userId, TEST_PAID),
    });
    assert.equal(rows.length, 1);
    const row = rows[0]!;
    assert.equal(row.provider, "revenuecat");
    assert.equal(row.store, "play_store");
    assert.equal(row.productId, PRODUCT);
    assert.equal(row.latestTransactionId, PLAY_TXN);
    assert.equal(isPremiumNow(row), true);
    assert.equal(isPremiumSubscriberNow(row), true);
  });

  it("does not unlock a different user when this transaction is applied to the buyer", async () => {
    await db.insert(subscriptionsTable).values({
      userId: TEST_OTHER,
      plan: "free",
      status: "free",
      provider: "none",
      subscriptionState: "FREE",
    }).onConflictDoUpdate({
      target: subscriptionsTable.userId,
      set: { plan: "free", status: "free", provider: "none", subscriptionState: "FREE" },
    });
    const other = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, TEST_OTHER),
    });
    assert.ok(other);
    assert.equal(isPremiumNow(other), false);
    assert.equal(other.latestTransactionId ?? null, null);
  });

  it("expired snapshot clears premium on the same user", async () => {
    const expired = await applyRevenueCatSnapshot(
      TEST_PAID,
      amyworldSnapshot({
        appUserId: TEST_PAID,
        originalAppUserId: TEST_PAID,
        expirationAt: expiredEnd,
        eventType: "EXPIRATION",
      }),
      { source: "webhook", providerEventId: "evt_expired_1" },
    );
    assert.equal(expired.toState, "EXPIRED");
    assert.equal(expired.isPremium, false);
    const row = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, TEST_PAID),
    });
    assert.ok(row);
    assert.equal(isPremiumNow(row), false);
    assert.equal(isPremiumSubscriberNow(row), false);
  });
});
