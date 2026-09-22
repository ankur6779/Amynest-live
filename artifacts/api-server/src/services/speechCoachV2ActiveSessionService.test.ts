import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  db,
  childrenTable,
  subscriptionsTable,
  speechCoachV2ActiveSessionsTable,
} from "@workspace/db";
import { isDbIntegrationAvailable } from "../test/db-integration.js";
import { createInitialSessionState } from "@workspace/speech-coach-v2";
import {
  generateTabLockToken,
  registerActiveSession,
} from "./speechCoachV2ActiveSessionService.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const dbOk = await isDbIntegrationAvailable();

function readSrc(): string {
  return readFileSync(join(__dir, "speechCoachV2ActiveSessionService.ts"), "utf8");
}

describe("speechCoachV2 stale active session reclaim", () => {
  it("registerActiveSession expires stale rows before insert (unique-index safe)", () => {
    const src = readSrc();
    const registerBlock = src.slice(
      src.indexOf("export async function registerActiveSession"),
      src.indexOf("export async function getActiveSessionForChild"),
    );
    // Must clear ANY prior active row (stale or fresh) before insert.
    assert.match(registerBlock, /status:\s*stale\s*\?\s*"expired"\s*:\s*"terminated"/);
    assert.doesNotMatch(
      registerBlock,
      /if\s*\(\s*!stale\s*\)\s*\{[\s\S]*status:\s*"terminated"/,
    );
  });
});

describe("speechCoachV2 stale active session reclaim (db)", { skip: !dbOk }, () => {
  const userId = `speech-v2-stale-${randomUUID()}`;
  let childId = 0;

  before(async () => {
    await db.insert(subscriptionsTable).values({
      userId,
      plan: "free",
      status: "free",
      provider: "none",
    });
    const child = await db
      .insert(childrenTable)
      .values({
        userId,
        name: "Stale Session Child",
        age: 5,
        ageMonths: 0,
        schoolStartTime: "08:00",
        schoolEndTime: "14:00",
        goals: "speech-v2-stale",
      })
      .returning({ id: childrenTable.id });
    childId = child[0]!.id;
  });

  after(async () => {
    await db
      .delete(speechCoachV2ActiveSessionsTable)
      .where(eq(speechCoachV2ActiveSessionsTable.userId, userId));
    await db.delete(childrenTable).where(eq(childrenTable.userId, userId));
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  });

  it("fresh start after stale active row reclaims without unique violation", async () => {
    const staleSessionId = randomUUID();
    const staleToken = generateTabLockToken();
    const staleState = createInitialSessionState({
      sessionId: staleSessionId,
      childId,
      childName: "Stale Session Child",
      ageBand: "4-5",
      sessionSeed: 1,
    });

    await registerActiveSession({
      userId,
      childId,
      sessionId: staleSessionId,
      ageBand: "4-5",
      sessionState: staleState,
      tabLockToken: staleToken,
    });

    // Simulate abandoned session (no heartbeat for >45s).
    await db
      .update(speechCoachV2ActiveSessionsTable)
      .set({ lastSeenAt: new Date(Date.now() - 60_000) })
      .where(
        and(
          eq(speechCoachV2ActiveSessionsTable.userId, userId),
          eq(speechCoachV2ActiveSessionsTable.sessionId, staleSessionId),
        ),
      );

    const freshSessionId = randomUUID();
    const freshToken = generateTabLockToken();
    const freshState = createInitialSessionState({
      sessionId: freshSessionId,
      childId,
      childName: "Stale Session Child",
      ageBand: "4-5",
      sessionSeed: 2,
    });

    await registerActiveSession({
      userId,
      childId,
      sessionId: freshSessionId,
      ageBand: "4-5",
      sessionState: freshState,
      tabLockToken: freshToken,
    });

    const rows = await db
      .select()
      .from(speechCoachV2ActiveSessionsTable)
      .where(eq(speechCoachV2ActiveSessionsTable.userId, userId));

    const staleRow = rows.find((r) => r.sessionId === staleSessionId);
    const freshRow = rows.find((r) => r.sessionId === freshSessionId);
    assert.ok(staleRow);
    assert.equal(staleRow!.status, "expired");
    assert.ok(freshRow);
    assert.equal(freshRow!.status, "active");

    const activeCount = rows.filter((r) => r.status === "active").length;
    assert.equal(activeCount, 1);
  });
});
