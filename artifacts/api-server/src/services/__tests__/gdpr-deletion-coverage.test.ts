/**
 * DB integration coverage for GDPR purge gaps (Birth Sky / Health Lab /
 * Speech V2 / nutrition / devices). Skips when Postgres is unavailable.
 * Static wiring is covered by gdpr-deletion-coverage.static.test.mjs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import {
  db,
  childrenTable,
  birthProfilesTable,
  birthSkyPreferencesTable,
  birthSkyConversationsTable,
  birthSkyMessagesTable,
  skySnapshotsTable,
  healthLabProgressTable,
  speechCoachV2TurnLogTable,
  speechCoachV2SessionsTable,
  nutritionDailyLogTable,
  nutritionMealMemoryTable,
  userDevicesTable,
  userIdentityAliasesTable,
} from "@workspace/db";
import { isDbIntegrationAvailable } from "../../test/db-integration.js";
import {
  purgeChildScopedData,
  purgeUserData,
  type DeletionAuditEntry,
} from "../data-deletion-service.js";

const dbIntegrationOk = await isDbIntegrationAvailable();

test(
  "purgeChildScopedData removes Birth Sky + Health Lab + Speech V2 + nutrition",
  { skip: !dbIntegrationOk },
  async () => {
    if (!dbIntegrationOk) return;

    const userId = `gdpr-child-purge-${Date.now()}`;
    const profileId = `profile-${userId}`;
    const conversationId = `conv-${userId}`;
    const snapshotId = `snap-${userId}`;
    const sessionId = `sess-${userId}`;

    const [child] = await db
      .insert(childrenTable)
      .values({
        userId,
        name: "GDPR Child",
        age: 4,
        ageMonths: 48,
        goals: "test",
        schoolStartTime: "08:00",
        schoolEndTime: "14:00",
        foodType: "veg",
      })
      .returning({ id: childrenTable.id });
    const childId = child!.id;

    await db.insert(birthProfilesTable).values({
      id: profileId,
      userId,
      childId,
      birthDate: "2020-01-01",
      timePrecision: "exact",
      consent: {
        consentVersion: "1",
        acceptedAt: new Date().toISOString(),
        scopes: ["storage"],
        disclaimerAccepted: true,
        childId,
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
    await db.insert(healthLabProgressTable).values({
      childId,
      userId,
      profile: { sensitive: true },
    });
    await db.insert(speechCoachV2SessionsTable).values({
      sessionId,
      userId,
      childId,
      ageBand: "3-5",
      durationSeconds: 60,
      phaseReached: "practice",
    });
    await db.insert(speechCoachV2TurnLogTable).values({
      sessionId,
      userId,
      childId,
      expected: "cat",
      transcript: "cat",
      accuracyScore: 90,
      fluencyScore: 90,
      confidenceScore: 90,
      completionScore: 90,
      overallScore: 90,
    });
    await db.insert(nutritionDailyLogTable).values({
      childId,
      userId,
      dateKey: "2026-08-29",
      checklist: { fruit: true },
      score: 1,
    });
    await db.insert(nutritionMealMemoryTable).values({
      childId,
      userId,
      entries: [],
    });

    const audit: DeletionAuditEntry[] = [];
    await db.transaction(async (tx) => {
      await purgeChildScopedData(tx, childId, audit);
      await tx.delete(childrenTable).where(eq(childrenTable.id, childId));
    });

    assert.equal(
      (await db.select().from(birthProfilesTable).where(eq(birthProfilesTable.childId, childId))).length,
      0,
    );
    assert.equal(
      (await db.select().from(skySnapshotsTable).where(eq(skySnapshotsTable.userId, userId))).length,
      0,
    );
    assert.equal(
      (await db.select().from(birthSkyMessagesTable).where(eq(birthSkyMessagesTable.userId, userId))).length,
      0,
    );
    assert.equal(
      (await db.select().from(healthLabProgressTable).where(eq(healthLabProgressTable.childId, childId))).length,
      0,
    );
    assert.equal(
      (await db.select().from(speechCoachV2TurnLogTable).where(eq(speechCoachV2TurnLogTable.childId, childId))).length,
      0,
    );
    assert.equal(
      (await db.select().from(nutritionDailyLogTable).where(eq(nutritionDailyLogTable.childId, childId))).length,
      0,
    );
    assert.equal(
      (await db.select().from(nutritionMealMemoryTable).where(eq(nutritionMealMemoryTable.childId, childId))).length,
      0,
    );

    const auditTables = new Set(audit.map((a) => a.table));
    assert.ok(auditTables.has("birth_profiles"));
    assert.ok(auditTables.has("health_lab_progress"));
    assert.ok(auditTables.has("speech_coach_v2_turn_log"));
    assert.ok(auditTables.has("nutrition_daily_log"));
  },
);

test(
  "purgeUserData removes Birth Sky prefs, devices, and identity aliases",
  { skip: !dbIntegrationOk },
  async () => {
    if (!dbIntegrationOk) return;

    const userId = `gdpr-user-purge-${Date.now()}`;

    await db.insert(birthSkyPreferencesTable).values({ userId });
    await db.insert(userDevicesTable).values({
      userId,
      deviceId: `dev-${userId}`,
      platform: "ios",
    });
    await db.insert(userIdentityAliasesTable).values({
      internalUserId: userId,
      firebaseUid: userId,
      email: `${userId}@example.com`,
      normalizedEmail: `${userId}@example.com`,
      provider: "password",
    });

    const audit: DeletionAuditEntry[] = [];
    await db.transaction(async (tx) => {
      await purgeUserData(tx, userId, audit);
    });

    assert.equal(
      (await db.select().from(birthSkyPreferencesTable).where(eq(birthSkyPreferencesTable.userId, userId))).length,
      0,
    );
    assert.equal(
      (await db.select().from(userDevicesTable).where(eq(userDevicesTable.userId, userId))).length,
      0,
    );
    assert.equal(
      (
        await db
          .select()
          .from(userIdentityAliasesTable)
          .where(eq(userIdentityAliasesTable.internalUserId, userId))
      ).length,
      0,
    );

    const auditTables = new Set(audit.map((a) => a.table));
    assert.ok(auditTables.has("birth_sky_preferences"));
    assert.ok(auditTables.has("user_devices"));
    assert.ok(auditTables.has("user_identity_aliases"));
  },
);
