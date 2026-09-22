import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, usageDailyTable } from "@workspace/db";
import { isDbIntegrationAvailable } from "../test/db-integration.js";
import {
  SPEECH_CONVERSATION_FIRST_USE_DAY,
  SPEECH_CONVERSATION_FIRST_USE_FEATURE,
  ensureConversationFirstUseUnix,
  peekConversationFirstUseMs,
} from "./speechConversationFirstUse.js";
import { conversationTrialWindow } from "./speechConversationTrialWindow.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const dbOk = await isDbIntegrationAvailable();

describe("speechConversationFirstUse source contract", () => {
  it("does not infer stamp from speech_conversation_seconds history", () => {
    const src = readFileSync(join(__dir, "speechConversationFirstUse.ts"), "utf8");
    assert.doesNotMatch(src, /inferFirstUseFromConverseHistory/);
    assert.doesNotMatch(src, /orderBy\(asc\(/);
    assert.match(src, /Math\.floor\(Date\.now\(\) \/ 1000\)/);
  });
});

describe("speechConversationFirstUse after premium lapse", { skip: !dbOk }, () => {
  const userId = `talk-lapse-${randomUUID()}`;
  const oldUnix = Math.floor(Date.UTC(2026, 0, 1) / 1000);

  before(async () => {
    // Premium-era converse usage still sits in the daily seconds bucket.
    await db.insert(usageDailyTable).values({
      userId,
      feature: "speech_conversation_seconds",
      day: "2026-01-01",
      count: 600,
      createdAt: new Date(oldUnix * 1000),
    });
  });

  after(async () => {
    await db.delete(usageDailyTable).where(eq(usageDailyTable.userId, userId));
  });

  it("peek stays null despite old converse seconds rows", async () => {
    assert.equal(await peekConversationFirstUseMs(userId), null);
  });

  it("ensure stamps now — not the premium history createdAt", async () => {
    const before = Math.floor(Date.now() / 1000) - 2;
    const stamped = await ensureConversationFirstUseUnix(userId);
    const after = Math.floor(Date.now() / 1000) + 2;
    assert.ok(stamped >= before && stamped <= after);
    assert.notEqual(stamped, oldUnix);
    const window = conversationTrialWindow(stamped * 1000, Date.now());
    assert.equal(window.trialExpired, false);
    assert.ok(window.trialDaysLeft >= 2);

    const lifetime = await db
      .select()
      .from(usageDailyTable)
      .where(
        and(
          eq(usageDailyTable.userId, userId),
          eq(usageDailyTable.feature, SPEECH_CONVERSATION_FIRST_USE_FEATURE),
          eq(usageDailyTable.day, SPEECH_CONVERSATION_FIRST_USE_DAY),
        ),
      );
    assert.equal(lifetime.length, 1);
    assert.equal(lifetime[0]?.count, stamped);
  });
});
