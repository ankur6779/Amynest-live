import { randomUUID } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { db, childrenTable, speechCoachV2ActiveSessionsTable } from "@workspace/db";
import { createInitialSessionState } from "@workspace/speech-coach-v2";
import { isDbIntegrationAvailable } from "../../test/db-integration.js";
import {
  generateTabLockToken,
  getActiveSessionForChild,
  getActiveSessionRecord,
  registerActiveSession,
} from "../speechCoachV2ActiveSessionService.js";

const userId = `sc2-resume-test-${Date.now()}`;
let childId = 0;

async function cleanup(): Promise<void> {
  try {
    await db
      .delete(speechCoachV2ActiveSessionsTable)
      .where(eq(speechCoachV2ActiveSessionsTable.userId, userId));
    await db.delete(childrenTable).where(eq(childrenTable.userId, userId));
  } catch {
    // best-effort
  }
}

function dbTest(name: string, fn: () => Promise<void>): void {
  test(name, { skip: !dbIntegrationOk }, async () => {
    if (!dbIntegrationOk) return;
    await cleanup();
    const [child] = await db
      .insert(childrenTable)
      .values({
        userId,
        name: "Resume Test Child",
        age: 4,
        ageMonths: 0,
        goals: "test",
        schoolStartTime: "08:00",
        schoolEndTime: "14:00",
        foodType: "veg",
      })
      .returning({ id: childrenTable.id });
    childId = child!.id;
    try {
      await fn();
    } finally {
      await cleanup();
    }
  });
}

const dbIntegrationOk = await isDbIntegrationAvailable();

dbTest("resume preserves server session state after stale disconnect", async () => {
  const sessionId = randomUUID();
  const tabLockToken = generateTabLockToken();
  const progressedState = createInitialSessionState({
    sessionId,
    childId,
    childName: "Resume Test Child",
    ageBand: "4-5",
  });
  progressedState.starsEarned = 5;
  progressedState.phase = "guided_practice";
  progressedState.turnCount = 3;

  await registerActiveSession({
    userId,
    childId,
    sessionId,
    ageBand: "4-5",
    sessionState: progressedState,
    tabLockToken,
  });

  const staleCutoff = new Date(Date.now() - 60_000);
  await db
    .update(speechCoachV2ActiveSessionsTable)
    .set({ lastSeenAt: staleCutoff })
    .where(
      and(
        eq(speechCoachV2ActiveSessionsTable.userId, userId),
        eq(speechCoachV2ActiveSessionsTable.sessionId, sessionId),
      ),
    );

  assert.equal(await getActiveSessionForChild(userId, childId), null);

  const staleRow = await getActiveSessionRecord(userId, childId, sessionId);
  assert.ok(staleRow);

  const freshState = createInitialSessionState({
    sessionId,
    childId,
    childName: "Resume Test Child",
    ageBand: "4-5",
  });
  assert.equal(freshState.starsEarned, 0);

  const resumed = await registerActiveSession({
    userId,
    childId,
    sessionId,
    ageBand: "4-5",
    sessionState: freshState,
    tabLockToken: generateTabLockToken(),
    resume: true,
  });

  assert.equal(resumed.starsEarned, 5);
  assert.equal(resumed.phase, "guided_practice");
  assert.equal(resumed.turnCount, 3);
});

dbTest("fresh start terminates stale active row instead of duplicating", async () => {
  const staleSessionId = randomUUID();
  const staleState = createInitialSessionState({
    sessionId: staleSessionId,
    childId,
    childName: "Resume Test Child",
    ageBand: "4-5",
  });

  await registerActiveSession({
    userId,
    childId,
    sessionId: staleSessionId,
    ageBand: "4-5",
    sessionState: staleState,
    tabLockToken: generateTabLockToken(),
  });

  const staleCutoff = new Date(Date.now() - 60_000);
  await db
    .update(speechCoachV2ActiveSessionsTable)
    .set({ lastSeenAt: staleCutoff })
    .where(eq(speechCoachV2ActiveSessionsTable.sessionId, staleSessionId));

  const newSessionId = randomUUID();
  await registerActiveSession({
    userId,
    childId,
    sessionId: newSessionId,
    ageBand: "4-5",
    sessionState: createInitialSessionState({
      sessionId: newSessionId,
      childId,
      childName: "Resume Test Child",
      ageBand: "4-5",
    }),
    tabLockToken: generateTabLockToken(),
    resume: false,
  });

  const activeRows = await db
    .select()
    .from(speechCoachV2ActiveSessionsTable)
    .where(
      and(
        eq(speechCoachV2ActiveSessionsTable.userId, userId),
        eq(speechCoachV2ActiveSessionsTable.childId, childId),
        eq(speechCoachV2ActiveSessionsTable.status, "active"),
      ),
    );

  assert.equal(activeRows.length, 1);
  assert.equal(activeRows[0]!.sessionId, newSessionId);

  const terminated = await db
    .select()
    .from(speechCoachV2ActiveSessionsTable)
    .where(eq(speechCoachV2ActiveSessionsTable.sessionId, staleSessionId));
  assert.equal(terminated[0]!.status, "terminated");
});
