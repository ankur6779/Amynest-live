import { test } from "node:test";
import assert from "node:assert/strict";
import { db, pushTokensTable, notificationLogTable, notificationPreferencesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  pruneInvalidToken,
  pruneStaleTokens,
  dispatchNotification,
  getOrCreatePreferences,
  isFcmInvalidTokenError,
} from "../notificationDispatchService";

const userId = `test-user-${Date.now()}`;

async function cleanup(uid: string): Promise<void> {
  await db.delete(notificationLogTable).where(eq(notificationLogTable.userId, uid));
  await db.delete(pushTokensTable).where(eq(pushTokensTable.userId, uid));
  await db.delete(notificationPreferencesTable).where(eq(notificationPreferencesTable.userId, uid));
}

test("isFcmInvalidTokenError flags only per-device unregistered errors", () => {
  // True positives: provider-confirmed token-is-gone codes.
  assert.equal(
    isFcmInvalidTokenError({ code: "messaging/registration-token-not-registered" }),
    true,
  );
  assert.equal(
    isFcmInvalidTokenError({ code: "messaging/invalid-registration-token" }),
    true,
  );
  assert.equal(
    isFcmInvalidTokenError({ errorInfo: { code: "messaging/registration-token-not-registered" } }),
    true,
  );
  // Negatives: non-token-specific provider errors must NOT auto-prune.
  // (invalid-argument can fire for malformed payloads; auth/quota errors
  // are server-config issues, not bad tokens.)
  assert.equal(isFcmInvalidTokenError({ code: "messaging/invalid-argument" }), false);
  assert.equal(isFcmInvalidTokenError({ code: "messaging/quota-exceeded" }), false);
  assert.equal(isFcmInvalidTokenError({ code: "messaging/internal-error" }), false);
  assert.equal(isFcmInvalidTokenError(new Error("network")), false);
  assert.equal(isFcmInvalidTokenError(null), false);
  assert.equal(isFcmInvalidTokenError(undefined), false);
});

test("pruneInvalidToken removes the matching token row", async () => {
  await cleanup(userId);
  const fakeToken = `tok_${Math.random().toString(36).slice(2)}`;
  await db.insert(pushTokensTable).values({ userId, token: fakeToken, platform: "web" });
  await pruneInvalidToken(fakeToken, "test");
  const rows = await db.select().from(pushTokensTable).where(eq(pushTokensTable.token, fakeToken));
  assert.equal(rows.length, 0);
  await cleanup(userId);
});

test("pruneStaleTokens removes tokens past the cutoff", async () => {
  const uid = `stale-${Date.now()}`;
  await cleanup(uid);
  const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
  await db.insert(pushTokensTable).values({
    userId: uid,
    token: `stale_${Math.random()}`,
    platform: "web",
    lastSeenAt: oldDate,
    createdAt: oldDate,
  });
  const removed = await pruneStaleTokens(60);
  assert.ok(removed >= 1, `expected at least one row removed, got ${removed}`);
  await cleanup(uid);
});

test("dispatchNotification with no tokens returns no_tokens", async () => {
  await cleanup(userId);
  await getOrCreatePreferences(userId);
  const result = await dispatchNotification({
    userId,
    category: "routine_item",
    title: "T",
    body: "B",
    dedupKey: `t:${Date.now()}`,
  });
  assert.equal(result.status, "no_tokens");
  await cleanup(userId);
});

test("quiet hours block per-item dispatch with throttled status", async () => {
  const uid = `quiet-${Date.now()}`;
  await cleanup(uid);
  await getOrCreatePreferences(uid);
  // Compute the user's current local HH:MM (defaults to Asia/Kolkata) and
  // set a quiet-hours window that brackets it on both sides so the dispatch
  // service unambiguously sees us as inside quiet hours regardless of when
  // the test runs.
  const localHHMM = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [hh, mm] = localHHMM.split(":").map((s) => parseInt(s, 10));
  const startMins = ((hh! * 60 + mm!) - 30 + 24 * 60) % (24 * 60);
  const endMins = (hh! * 60 + mm! + 30) % (24 * 60);
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  await db
    .update(notificationPreferencesTable)
    .set({ quietHoursStart: fmt(startMins), quietHoursEnd: fmt(endMins) })
    .where(eq(notificationPreferencesTable.userId, uid));
  await db.insert(pushTokensTable).values({
    userId: uid,
    token: `quiet_${Math.random()}`,
    platform: "web",
  });
  const result = await dispatchNotification({
    userId: uid,
    category: "routine_item",
    title: "Brush teeth",
    body: "Time to brush",
    dedupKey: `routine_item:r:0:${Date.now()}`,
  });
  assert.equal(result.status, "throttled");
  assert.equal(result.reason, "quiet_hours");
  await cleanup(uid);
});

test("daily cap blocks per-item dispatch once reached", async () => {
  const uid = `cap-${Date.now()}`;
  await cleanup(uid);
  await getOrCreatePreferences(uid);
  // Set intensity to "minimal" (cap=3) and pre-insert 3 "sent" log entries
  // for today so countSentToday returns >= cap on the next dispatch attempt.
  await db
    .update(notificationPreferencesTable)
    .set({ notificationIntensity: "minimal", dailyCap: 3 })
    .where(eq(notificationPreferencesTable.userId, uid));
  for (let i = 0; i < 3; i++) {
    await db.insert(notificationLogTable).values({
      userId: uid,
      category: "routine_item",
      title: `earlier-${i}`,
      body: "earlier",
      status: "sent",
      platform: "web",
    });
  }
  await db.insert(pushTokensTable).values({
    userId: uid,
    token: `cap_${Math.random()}`,
    platform: "web",
  });
  const result = await dispatchNotification({
    userId: uid,
    category: "routine_item",
    title: "Brush teeth",
    body: "Time to brush",
    dedupKey: `routine_item:r:0:${Date.now()}`,
  });
  assert.equal(result.status, "throttled");
  assert.equal(result.reason, "daily_cap");
  await cleanup(uid);
});

test("category disabled blocks dispatch with throttled status", async () => {
  await cleanup(userId);
  await getOrCreatePreferences(userId);
  await db
    .update(notificationPreferencesTable)
    .set({ routineItemEnabled: false })
    .where(eq(notificationPreferencesTable.userId, userId));
  await db.insert(pushTokensTable).values({
    userId,
    token: `dummy_${Math.random()}`,
    platform: "web",
  });
  const result = await dispatchNotification({
    userId,
    category: "routine_item",
    title: "T",
    body: "B",
    dedupKey: `t:${Date.now()}`,
  });
  assert.equal(result.status, "throttled");
  assert.equal(result.reason, "category_disabled");
  await cleanup(userId);
});
