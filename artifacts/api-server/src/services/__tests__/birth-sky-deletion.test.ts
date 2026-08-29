import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import {
  db,
  birthProfilesTable,
  birthSkyPreferencesTable,
  birthSkyConversationsTable,
  birthSkyMessagesTable,
  skySnapshotsTable,
} from "@workspace/db";
import { isDbIntegrationAvailable } from "../../test/db-integration.js";
import { purgeUserData, type DeletionAuditEntry } from "../data-deletion-service.js";

const userId = `birth-sky-del-${Date.now()}`;
const otherUserId = `birth-sky-other-${Date.now()}`;
const profileId = `profile-${userId}`;
const conversationId = `conv-${userId}`;
const snapshotId = `snap-${userId}`;

async function cleanup(uid: string): Promise<void> {
  const audit: DeletionAuditEntry[] = [];
  try {
    await db.transaction(async (tx) => {
      await purgeUserData(tx, uid, audit);
    });
  } catch {
    // best-effort
  }
}

const dbIntegrationOk = await isDbIntegrationAvailable();

test("purgeUserData removes all Birth Sky user records", { skip: !dbIntegrationOk }, async () => {
  if (!dbIntegrationOk) return;

  await cleanup(userId);
  await cleanup(otherUserId);

  await db.insert(birthSkyPreferencesTable).values({ userId });
  await db.insert(birthProfilesTable).values({
    id: profileId,
    userId,
    childId: 1,
    birthDate: "2020-01-01",
    timePrecision: "exact",
    consent: {
      consentVersion: "1",
      acceptedAt: new Date().toISOString(),
      scopes: ["storage"],
      disclaimerAccepted: true,
      childId: 1,
    },
  });
  await db.insert(skySnapshotsTable).values({
    id: snapshotId,
    profileId,
    userId,
    cacheKey: "ck",
    snapshotVersion: "v1",
    engineVersion: "e1",
    mode: "test",
    astronomy: {},
  });
  await db.insert(birthSkyConversationsTable).values({
    id: conversationId,
    profileId,
    userId,
    snapshotVersion: "v1",
    engineVersion: "e1",
    entryPoint: "test",
  });
  await db.insert(birthSkyMessagesTable).values({
    id: `msg-${userId}`,
    conversationId,
    profileId,
    userId,
    role: "user",
    body: "hello",
    sequence: 1,
  });

  await db.insert(birthSkyPreferencesTable).values({ userId: otherUserId });

  const audit: DeletionAuditEntry[] = [];
  await db.transaction(async (tx) => {
    await purgeUserData(tx, userId, audit);
  });

  const remainingPrefs = await db
    .select()
    .from(birthSkyPreferencesTable)
    .where(eq(birthSkyPreferencesTable.userId, userId));
  assert.equal(remainingPrefs.length, 0);

  const remainingProfiles = await db
    .select()
    .from(birthProfilesTable)
    .where(eq(birthProfilesTable.userId, userId));
  assert.equal(remainingProfiles.length, 0);

  const otherPrefs = await db
    .select()
    .from(birthSkyPreferencesTable)
    .where(eq(birthSkyPreferencesTable.userId, otherUserId));
  assert.equal(otherPrefs.length, 1);

  const auditTables = new Set(audit.map((a) => a.table));
  assert.ok(auditTables.has("birth_sky_preferences"));
  assert.ok(auditTables.has("birth_profiles"));

  await cleanup(otherUserId);
});

test("purgeUserData is idempotent for empty Birth Sky datasets", { skip: !dbIntegrationOk }, async () => {
  if (!dbIntegrationOk) return;
  const emptyUser = `birth-sky-empty-${Date.now()}`;
  const audit: DeletionAuditEntry[] = [];
  await db.transaction(async (tx) => {
    await purgeUserData(tx, emptyUser, audit);
  });
  await db.transaction(async (tx) => {
    await purgeUserData(tx, emptyUser, audit);
  });
});
