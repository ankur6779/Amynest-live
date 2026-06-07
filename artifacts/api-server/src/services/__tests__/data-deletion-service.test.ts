import { test } from "node:test";
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  parentProfilesTable,
  familyLearningGraphsTable,
  revenuecatWebhookEventsTable,
  aiCacheTable,
  childCaregiversTable,
  adminPremiumGrantsTable,
} from "@workspace/db";
import { isDbIntegrationAvailable } from "../../test/db-integration.js";
import {
  purgeUserData,
  type DeletionAuditEntry,
} from "../data-deletion-service.js";

const userId = `gdpr-test-${Date.now()}`;

async function cleanup(uid: string): Promise<void> {
  try {
    await db.delete(childCaregiversTable).where(eq(childCaregiversTable.invitedByUserId, uid));
    await db.delete(childCaregiversTable).where(eq(childCaregiversTable.userId, uid));
    await db.delete(aiCacheTable).where(sql`${aiCacheTable.cacheKey} LIKE ${`%${uid}%`}`);
    await db.delete(revenuecatWebhookEventsTable).where(eq(revenuecatWebhookEventsTable.appUserId, uid));
    await db.delete(familyLearningGraphsTable).where(eq(familyLearningGraphsTable.familyId, uid));
    await db.delete(adminPremiumGrantsTable).where(eq(adminPremiumGrantsTable.email, "gdpr-test@example.com"));
    await db.delete(childrenTable).where(eq(childrenTable.userId, uid));
    await db.delete(parentProfilesTable).where(eq(parentProfilesTable.userId, uid));
  } catch {
    // best-effort
  }
}

function dbTest(name: string, fn: () => Promise<void>): void {
  test(name, { skip: !dbIntegrationOk }, async () => {
    if (!dbIntegrationOk) return;
    await fn();
  });
}

const dbIntegrationOk = await isDbIntegrationAvailable();

dbTest("purgeUserData removes family graphs, webhooks, caches, and inviter links", async () => {
  await cleanup(userId);

  const [child] = await db
    .insert(childrenTable)
    .values({
      userId,
      name: "GDPR Test Child",
      age: 1,
      ageMonths: 6,
      goals: "test",
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      foodType: "veg",
    })
    .returning({ id: childrenTable.id });

  await db.insert(parentProfilesTable).values({
    userId,
    role: "mother",
    workType: "work_from_home",
    foodType: "veg",
    region: "mixed",
  });

  await db.insert(familyLearningGraphsTable).values({
    familyId: userId,
    graph: { nodes: [] },
    insights: { summary: "test" },
  });

  await db.insert(revenuecatWebhookEventsTable).values({
    eventId: `evt-${userId}`,
    eventType: "INITIAL_PURCHASE",
    appUserId: userId,
    payload: { test: true },
  });

  await db.insert(aiCacheTable).values({
    cacheKey: `infant_feeding:${userId}:${child!.id}`,
    namespace: "infant_feeding",
    input: { userId },
    response: { plan: [] },
  });

  await db.insert(adminPremiumGrantsTable).values({
    email: "gdpr-test@example.com",
    plan: "yearly",
  });

  await db.insert(childCaregiversTable).values({
    childId: child!.id,
    userId: "other-caregiver",
    role: "co_parent",
    status: "pending",
    invitedByUserId: userId,
  });

  const audit: DeletionAuditEntry[] = [];
  await db.transaction(async (tx) => {
    await purgeUserData(tx, userId, audit, { accountEmail: "gdpr-test@example.com" });
  });

  const remainingGraphs = await db
    .select()
    .from(familyLearningGraphsTable)
    .where(eq(familyLearningGraphsTable.familyId, userId));
  assert.equal(remainingGraphs.length, 0);

  const remainingWebhooks = await db
    .select()
    .from(revenuecatWebhookEventsTable)
    .where(eq(revenuecatWebhookEventsTable.appUserId, userId));
  assert.equal(remainingWebhooks.length, 0);

  const remainingCache = await db
    .select()
    .from(aiCacheTable)
    .where(sql`${aiCacheTable.cacheKey} LIKE ${`%${userId}%`}`);
  assert.equal(remainingCache.length, 0);

  const remainingInvites = await db
    .select()
    .from(childCaregiversTable)
    .where(eq(childCaregiversTable.invitedByUserId, userId));
  assert.equal(remainingInvites.length, 0);

  const remainingGrants = await db
    .select()
    .from(adminPremiumGrantsTable)
    .where(eq(adminPremiumGrantsTable.email, "gdpr-test@example.com"));
  assert.equal(remainingGrants.length, 0);

  const remainingChildren = await db
    .select()
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId));
  assert.equal(remainingChildren.length, 0);

  await cleanup(userId);
});
