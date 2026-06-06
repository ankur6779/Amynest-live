import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { db, notificationLogTable, notificationPreferencesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { isDbIntegrationAvailable } from "../../test/db-integration.js";
import {
  claimNotificationDelivery,
  finalizeNotificationClaim,
  STALE_PENDING_CLAIM_MS,
} from "../notificationClaimService.js";
import {
  atomicAcquireDeliverySlot,
  releaseStalePendingClaimsGlobally,
} from "../notificationRateLimitService.js";
import {
  MAX_NOTIFICATIONS_PER_ACCOUNT_PER_DAY,
} from "@workspace/notification-engine";
import {
  withCronAdvisoryLock,
  tryAcquireCronAdvisoryLock,
  releaseCronAdvisoryLock,
} from "../../lib/cron-advisory-lock.js";
import type { ClaimInput } from "../notificationClaimService.js";

const dbOk = await isDbIntegrationAvailable();

function claimInput(userId: string, fingerprint: string): ClaimInput {
  return {
    userId,
    category: "infant_care",
    title: "Test",
    body: "Body",
    dedupKey: fingerprint,
    deepLink: "/hub",
  };
}

async function cleanup(userId: string): Promise<void> {
  await db.delete(notificationLogTable).where(eq(notificationLogTable.userId, userId));
  await db.delete(notificationPreferencesTable).where(eq(notificationPreferencesTable.userId, userId));
}

describe("notification claim-before-send", { skip: !dbOk }, () => {
  it("exactly one claim wins when 2 workers race same fingerprint", async () => {
    const userId = `claim-2-${Date.now()}`;
    const fp = `1_vaccine_due_overdue_hepb_${new Date().toISOString().slice(0, 10)}`;
    await cleanup(userId);

    const results = await Promise.all([
      claimNotificationDelivery(claimInput(userId, fp)),
      claimNotificationDelivery(claimInput(userId, fp)),
    ]);

    const winners = results.filter((id) => id != null);
    assert.equal(winners.length, 1, "exactly one claim must succeed");
    assert.ok(results.some((id) => id == null), "second claim must fail");

    await cleanup(userId);
  });

  it("exactly one claim wins when 10 workers race same fingerprint", async () => {
    const userId = `claim-10-${Date.now()}`;
    const fp = `2_milestone_tip_daily_${new Date().toISOString().slice(0, 10)}`;
    await cleanup(userId);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => claimNotificationDelivery(claimInput(userId, fp))),
    );

    assert.equal(results.filter((id) => id != null).length, 1);
    assert.equal(results.filter((id) => id == null).length, 9);

    await cleanup(userId);
  });

  it("duplicate claim attempts return null without extra rows", async () => {
    const userId = `claim-dup-${Date.now()}`;
    const fp = `3_vaccine_due_today_hepb_${new Date().toISOString().slice(0, 10)}`;
    await cleanup(userId);

    const first = await claimNotificationDelivery(claimInput(userId, fp));
    const second = await claimNotificationDelivery(claimInput(userId, fp));
    assert.ok(first != null);
    assert.equal(second, null);

    const rows = await db
      .select()
      .from(notificationLogTable)
      .where(eq(notificationLogTable.userId, userId));
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.status, "pending");

    await cleanup(userId);
  });

  it("exactly one claim wins when 100 workers race same fingerprint", async () => {
    const userId = `claim-100-${Date.now()}`;
    const fp = `5_learning_reading_${new Date().toISOString().slice(0, 10)}`;
    await cleanup(userId);

    const results = await Promise.all(
      Array.from({ length: 100 }, () => claimNotificationDelivery(claimInput(userId, fp))),
    );

    assert.equal(results.filter((id) => id != null).length, 1);
    assert.equal(results.filter((id) => id == null).length, 99);

    await cleanup(userId);
  });

  it("push failure recovery marks claim failed and blocks re-claim same fingerprint", async () => {
    const userId = `claim-fail-${Date.now()}`;
    const fp = `4_engagement_nudge_${new Date().toISOString().slice(0, 10)}`;
    await cleanup(userId);

    const claimId = await claimNotificationDelivery(claimInput(userId, fp));
    assert.ok(claimId != null);
    await finalizeNotificationClaim(claimId!, {
      status: "failed",
      errorMessage: "all_tokens_failed",
    });

    const retry = await claimNotificationDelivery(claimInput(userId, fp));
    assert.equal(retry, null);

    await cleanup(userId);
  });
});

describe("atomic rate limits", { skip: !dbOk }, () => {
  it("only allows account daily cap deliveries under concurrent workers", async () => {
    const userId = `rate-limit-${Date.now()}`;
    const date = new Date().toISOString().slice(0, 10);
    await cleanup(userId);

    const fingerprints = Array.from(
      { length: MAX_NOTIFICATIONS_PER_ACCOUNT_PER_DAY + 5 },
      (_, i) => `9_engagement_nudge_${i}_${date}`,
    );

    const results = await Promise.all(
      fingerprints.map((fp) =>
        atomicAcquireDeliverySlot({
          ...claimInput(userId, fp),
          timezone: "Asia/Kolkata",
          skipIntensityCap: true,
        }),
      ),
    );

    const allowed = results.filter((r) => r.ok);
    assert.ok(
      allowed.length <= MAX_NOTIFICATIONS_PER_ACCOUNT_PER_DAY,
      `expected at most ${MAX_NOTIFICATIONS_PER_ACCOUNT_PER_DAY} slots, got ${allowed.length}`,
    );
    const blocked = results.filter((r) => !r.ok && r.status === "rate_limited");
    assert.ok(blocked.length >= 5, "overflow attempts must be rate_limited");

    await cleanup(userId);
  });
});

describe("stale pending recovery", { skip: !dbOk }, () => {
  it("releases pending claims older than 15 minutes for retry", async () => {
    const userId = `stale-pending-${Date.now()}`;
    const fp = `6_routine_item_r1_i0_${new Date().toISOString().slice(0, 10)}`;
    await cleanup(userId);

    const claimId = await claimNotificationDelivery(claimInput(userId, fp));
    assert.ok(claimId != null);

    await db.execute(sql`
      UPDATE notification_log
      SET sent_at = NOW() - INTERVAL '16 minutes'
      WHERE id = ${claimId}
    `);

    const released = await releaseStalePendingClaimsGlobally(15);
    assert.ok(released >= 1);

    const retry = await claimNotificationDelivery(claimInput(userId, fp));
    assert.ok(retry != null, "fingerprint must be reclaimable after stale release");

    await cleanup(userId);
  });

  it("STALE_PENDING_CLAIM_MS is 15 minutes", () => {
    assert.equal(STALE_PENDING_CLAIM_MS, 15 * 60 * 1000);
  });
});

describe("cron advisory lock", { skip: !dbOk }, () => {
  it("second lock holder is rejected while first holds lock", async () => {
    const job = `test_cron_lock_${Date.now()}`;
    const first = await tryAcquireCronAdvisoryLock(job);
    assert.equal(first, true);
    const second = await tryAcquireCronAdvisoryLock(job);
    assert.equal(second, false);
    await releaseCronAdvisoryLock(job);
    const third = await tryAcquireCronAdvisoryLock(job);
    assert.equal(third, true);
    await releaseCronAdvisoryLock(job);
  });

  it("withCronAdvisoryLock skips overlapping execution", async () => {
    const job = `test_cron_wrap_${Date.now()}`;
    let runs = 0;
    const first = await tryAcquireCronAdvisoryLock(job);
    assert.equal(first, true);
    const skipped = await withCronAdvisoryLock(job, async () => {
      runs++;
    });
    assert.equal(skipped, undefined);
    assert.equal(runs, 0);
    await releaseCronAdvisoryLock(job);
  });
});
