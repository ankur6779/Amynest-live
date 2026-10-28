/**
 * Guardrail: heal/repair writers must not clobber a concurrent paid activate.
 *
 * healStaleSubscriptionRecord / repairFalseExpiredInternalTrial used to UPDATE
 * by userId only after an in-memory isPremiumNow / false-expired check.
 * A Razorpay/RC activate that landed between getOrCreate and the heal write
 * could be wiped back to FREE (plan/provider/periodEnd cleared).
 */
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import { healStaleSubscriptionRecord, isPremiumNow } from "../subscriptionService.js";
import { isDbIntegrationAvailable } from "../../test/db-integration.js";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const service = readFileSync(
  resolve(repoRoot, "artifacts/api-server/src/services/subscriptionService.ts"),
  "utf8",
);

function sliceFn(exportName: string): string {
  const start = service.indexOf(`async function ${exportName}`);
  const alt = service.indexOf(`export async function ${exportName}`);
  const fnStart = start >= 0 ? start : alt;
  assert.ok(fnStart >= 0, `${exportName} should exist`);
  const next = service.indexOf("\nexport async function", fnStart + 1);
  const nextAsync = service.indexOf("\nasync function", fnStart + 1);
  let end = service.length;
  for (const cand of [next, nextAsync]) {
    if (cand > fnStart && cand < end) end = cand;
  }
  return service.slice(fnStart, end);
}

describe("heal/repair writers refuse to overwrite live entitlement windows", () => {
  it("stillLacksLiveEntitlementWindow guards period/bonus/trial/grace fields", () => {
    const start = service.indexOf("function stillLacksLiveEntitlementWindow");
    assert.ok(start >= 0, "stillLacksLiveEntitlementWindow helper should exist");
    const end = service.indexOf("\nexport async function healStaleSubscriptionRecord", start);
    const slice = service.slice(start, end > start ? end : start + 1200);
    assert.match(slice, /currentPeriodEnd/);
    assert.match(slice, /expiresAt/);
    assert.match(slice, /bonusExpiresAt/);
    assert.match(slice, /gracePeriodExpiresAt/);
    assert.match(slice, /trialEndsAt/);
  });

  it("healStaleSubscriptionRecord FREE downgrade requires status + live-window guard", () => {
    const slice = sliceFn("healStaleSubscriptionRecord");
    assert.match(slice, /stillLacksLiveEntitlementWindow\(now\)/);
    assert.match(
      slice,
      /eq\(subscriptionsTable\.status,\s*sub\.status\)/,
    );
    assert.match(slice, /return updated \?\? sub/);
  });

  it("healStaleSubscriptionRecord manual periodEnd fix requires provider+window guard", () => {
    const slice = sliceFn("healStaleSubscriptionRecord");
    assert.match(slice, /eq\(subscriptionsTable\.provider,\s*"manual"\)/);
    assert.match(slice, /eq\(subscriptionsTable\.status,\s*"active"\)/);
    assert.match(slice, /stillLacksLiveEntitlementWindow\(now\)/);
  });

  it("repairFalseExpiredInternalTrial requires free+none + live-window guard", () => {
    const slice = sliceFn("repairFalseExpiredInternalTrial");
    assert.match(slice, /eq\(subscriptionsTable\.status,\s*"free"\)/);
    assert.match(slice, /eq\(subscriptionsTable\.provider,\s*"none"\)/);
    assert.match(slice, /stillLacksLiveEntitlementWindow\(now\)/);
    assert.match(slice, /return updated \?\? sub/);
  });
});

const dbOk = await isDbIntegrationAvailable();
const TEST_UID = `heal-toctou-${Date.now()}`;

describe("healStaleSubscriptionRecord — concurrent activate TOCTOU", { skip: !dbOk }, () => {
  after(async () => {
    if (!dbOk) return;
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, TEST_UID));
  });

  it("does not wipe a paid activate that landed after the stale in-memory read", async () => {
    const expiredEnd = new Date(Date.now() - 86_400_000);
    const paidEnd = new Date(Date.now() + 30 * 86_400_000);

    // Stale shape entitlement polls would have read: expired RC still "active".
    await db.insert(subscriptionsTable).values({
      userId: TEST_UID,
      plan: "monthly",
      status: "active",
      provider: "revenuecat",
      subscriptionState: "ACTIVE",
      currentPeriodEnd: expiredEnd,
      expiresAt: expiredEnd,
    });

    const stale = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, TEST_UID),
    });
    assert.ok(stale);
    assert.equal(isPremiumNow(stale), false);

    // Concurrent activate / renew lands before heal's UPDATE.
    await db
      .update(subscriptionsTable)
      .set({
        plan: "monthly",
        status: "active",
        provider: "razorpay",
        subscriptionState: "ACTIVE",
        currentPeriodEnd: paidEnd,
        expiresAt: paidEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionsTable.userId, TEST_UID));

    // Heal still holds the pre-activate snapshot (same as getOrCreate → heal gap).
    const healed = await healStaleSubscriptionRecord(stale);
    assert.equal(isPremiumNow(healed), false, "in-memory return may stay stale");

    const row = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, TEST_UID),
    });
    assert.ok(row);
    assert.equal(row.provider, "razorpay");
    assert.equal(row.status, "active");
    assert.equal(isPremiumNow(row), true);
    assert.ok(row.currentPeriodEnd && row.currentPeriodEnd.getTime() === paidEnd.getTime());
  });

  it("still heals when the row remains expired", async () => {
    const expiredEnd = new Date(Date.now() - 86_400_000);
    await db
      .update(subscriptionsTable)
      .set({
        plan: "monthly",
        status: "active",
        provider: "revenuecat",
        subscriptionState: "ACTIVE",
        currentPeriodEnd: expiredEnd,
        expiresAt: expiredEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionsTable.userId, TEST_UID));

    const stale = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, TEST_UID),
    });
    assert.ok(stale);
    assert.equal(isPremiumNow(stale), false);

    const healed = await healStaleSubscriptionRecord(stale);
    assert.equal(healed.status, "free");
    assert.equal(healed.provider, "none");
    assert.equal(isPremiumNow(healed), false);

    const row = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, TEST_UID),
    });
    assert.ok(row);
    assert.equal(row.status, "free");
    assert.equal(row.provider, "none");
    assert.equal(row.currentPeriodEnd, null);
  });
});
