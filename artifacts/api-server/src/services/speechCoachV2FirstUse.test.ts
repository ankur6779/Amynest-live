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
  usageDailyTable,
  speechCoachV2DailyUsageTable,
  speechCoachV2ActiveSessionsTable,
} from "@workspace/db";
import { isDbIntegrationAvailable } from "../test/db-integration.js";
import { FREE_FEATURE_LIMITS } from "./subscriptionService.js";
import { SPEECH_CONVERSATION_FIRST_USE_FEATURE } from "./speechConversationFirstUse.js";
import {
  SPEECH_COACH_V2_FIRST_USE_DAY,
  SPEECH_COACH_V2_FIRST_USE_FEATURE,
  SPEECH_COACH_V2_FIRST_USE_SECONDS,
  chargeSpeechCoachV2FirstUseSeconds,
  peekSpeechCoachV2FirstUseRemaining,
  peekSpeechCoachV2FirstUseUsed,
} from "./speechCoachV2FirstUse.js";
import { resolveSpeechCoachV2UsagePolicy } from "./speechCoachV2UsagePolicy.js";
import { PRODUCTION_REALTIME_MODEL_DEFAULT } from "./speechCoachV2RealtimeService.js";
import {
  generateTabLockToken,
  registerActiveSession,
  terminateActiveSession,
  validateAndTouchSession,
} from "./speechCoachV2ActiveSessionService.js";
import {
  SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS,
  SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS,
  createInitialSessionState,
} from "@workspace/speech-coach-v2";

const __dir = dirname(fileURLToPath(import.meta.url));
const dbOk = await isDbIntegrationAvailable();

function read(rel: string): string {
  return readFileSync(join(__dir, rel), "utf8");
}

describe("speechCoachV2 first-use freeze", () => {
  it("lifetime feature is not a FREE_FEATURE_LIMITS daily quota", () => {
    assert.equal(
      Object.prototype.hasOwnProperty.call(FREE_FEATURE_LIMITS, SPEECH_COACH_V2_FIRST_USE_FEATURE),
      false,
    );
    assert.notEqual(SPEECH_COACH_V2_FIRST_USE_FEATURE, "speech_coach_v2_seconds");
    assert.notEqual(SPEECH_COACH_V2_FIRST_USE_FEATURE, SPEECH_CONVERSATION_FIRST_USE_FEATURE);
    assert.equal(SPEECH_COACH_V2_FIRST_USE_DAY, "lifetime");
  });

  it("Talk-with-Amy lifetime clock stays independent", () => {
    const talk = read("speechConversationFirstUse.ts");
    const v2 = read("speechCoachV2FirstUse.ts");
    assert.match(talk, /speech_conversation_first_use/);
    assert.match(v2, /speech_coach_v2_first_use_seconds/);
    assert.doesNotMatch(v2, /speech_conversation_first_use/);
    assert.doesNotMatch(talk, /speech_coach_v2_first_use_seconds/);
  });

  it("heartbeat charges lifetime only on the first-use path", () => {
    const src = read("speechCoachV2ActiveSessionService.ts");
    assert.match(src, /if \(policy\.isFirstUseFree\) \{/);
    assert.match(src, /chargeSpeechCoachV2FirstUseSeconds/);
    assert.match(src, /first_use_limit_reached/);
    const registerBlock = src.slice(
      src.indexOf("export async function registerActiveSession"),
      src.indexOf("export async function getActiveSessionForChild"),
    );
    assert.doesNotMatch(registerBlock, /chargeSpeechCoachV2FirstUseSeconds/);
  });

  it("routes refuse exhausted first-use without daily-reset copy", () => {
    const src = read("../routes/speech-coach-v2.ts");
    assert.match(src, /first_use_limit_reached/);
    assert.match(src, /SPEECH_COACH_V2_FIRST_USE_EXHAUSTED_MESSAGE/);
    assert.match(src, /canStartFromPolicy/);
  });

  it("gpt-realtime default is unchanged", () => {
    assert.equal(PRODUCTION_REALTIME_MODEL_DEFAULT, "gpt-realtime");
  });

  it("premium daily 600 and trial 120 constants stay intact", () => {
    assert.equal(SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS, 600);
    assert.equal(SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS, 120);
    assert.equal(SPEECH_COACH_V2_FIRST_USE_SECONDS, 90);
  });
});

describe("speechCoachV2 first-use usage_daily", { skip: !dbOk }, () => {
  const userId = `p4-speech-fu-${randomUUID()}`;

  before(async () => {
    await db.insert(subscriptionsTable).values({
      userId,
      plan: "free",
      status: "free",
      provider: "none",
    });
  });

  after(async () => {
    await db.delete(usageDailyTable).where(eq(usageDailyTable.userId, userId));
    await db.delete(speechCoachV2DailyUsageTable).where(eq(speechCoachV2DailyUsageTable.userId, userId));
    await db.delete(speechCoachV2ActiveSessionsTable).where(eq(speechCoachV2ActiveSessionsTable.userId, userId));
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
    await db.delete(childrenTable).where(eq(childrenTable.userId, userId));
  });

  it("new free user has 90 seconds and peek does not increment", async () => {
    const first = await peekSpeechCoachV2FirstUseUsed(userId);
    const again = await peekSpeechCoachV2FirstUseUsed(userId);
    assert.equal(first, 0);
    assert.equal(again, 0);
    assert.equal(await peekSpeechCoachV2FirstUseRemaining(userId), 90);
    const rows = await db
      .select()
      .from(usageDailyTable)
      .where(
        and(
          eq(usageDailyTable.userId, userId),
          eq(usageDailyTable.feature, SPEECH_COACH_V2_FIRST_USE_FEATURE),
        ),
      );
    assert.equal(rows.length, 0);
  });

  it("charges actual seconds across partial sessions", async () => {
    let r = await chargeSpeechCoachV2FirstUseSeconds(db, userId, 20);
    assert.equal(r.chargedSeconds, 20);
    assert.equal(r.usedAfter, 20);
    assert.equal(r.remainingAfter, 70);

    r = await chargeSpeechCoachV2FirstUseSeconds(db, userId, 30);
    assert.equal(r.chargedSeconds, 30);
    assert.equal(r.usedAfter, 50);
    assert.equal(r.remainingAfter, 40);

    r = await chargeSpeechCoachV2FirstUseSeconds(db, userId, 40);
    assert.equal(r.chargedSeconds, 40);
    assert.equal(r.usedAfter, 90);
    assert.equal(r.remainingAfter, 0);
  });

  it("exhausted allowance stays 0 with no UTC-day reset", async () => {
    const policy = await resolveSpeechCoachV2UsagePolicy(userId);
    assert.equal(policy.isFirstUseFree, true);
    assert.equal(policy.firstUseUsedSeconds, 90);
    assert.equal(policy.firstUseRemainingSeconds, 0);
    assert.equal(policy.dailyLimitSeconds, 0);

    const extra = await chargeSpeechCoachV2FirstUseSeconds(db, userId, 15);
    assert.equal(extra.chargedSeconds, 0);
    assert.equal(extra.remainingAfter, 0);

    const rows = await db
      .select()
      .from(usageDailyTable)
      .where(
        and(
          eq(usageDailyTable.userId, userId),
          eq(usageDailyTable.feature, SPEECH_COACH_V2_FIRST_USE_FEATURE),
        ),
      );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.day, "lifetime");
    assert.equal(rows[0]?.count, 90);
  });

  it("logout/login/reinstall cannot reset — same userId lifetime row", async () => {
    const used = await peekSpeechCoachV2FirstUseUsed(userId);
    assert.equal(used, 90);
    assert.equal(await peekSpeechCoachV2FirstUseRemaining(userId), 0);
  });
});

describe("speechCoachV2 first-use premium does not consume lifetime", { skip: !dbOk }, () => {
  const userId = `p4-speech-prem-${randomUUID()}`;

  before(async () => {
    await db.insert(subscriptionsTable).values({
      userId,
      plan: "monthly",
      status: "active",
      provider: "revenuecat",
      subscriptionState: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  });

  after(async () => {
    await db.delete(usageDailyTable).where(eq(usageDailyTable.userId, userId));
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  });

  it("premium policy is 600/day and does not open first-use", async () => {
    const policy = await resolveSpeechCoachV2UsagePolicy(userId);
    assert.equal(policy.isPaid, true);
    assert.equal(policy.isFirstUseFree, false);
    assert.equal(policy.dailyLimitSeconds, SPEECH_COACH_V2_PAID_DAILY_LIMIT_SECONDS);
    assert.equal(policy.firstUseUsedSeconds, 0);
    const rows = await db
      .select()
      .from(usageDailyTable)
      .where(
        and(
          eq(usageDailyTable.userId, userId),
          eq(usageDailyTable.feature, SPEECH_COACH_V2_FIRST_USE_FEATURE),
        ),
      );
    assert.equal(rows.length, 0);
  });
});

describe("speechCoachV2 first-use session accounting", { skip: !dbOk }, () => {
  const userId = `p4-speech-sess-${randomUUID()}`;
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
        name: "First Use Child",
        age: 5,
        ageMonths: 0,
        schoolStartTime: "08:00",
        schoolEndTime: "14:00",
        goals: "p4-speech",
      })
      .returning({ id: childrenTable.id });
    childId = child[0]!.id;
  });

  after(async () => {
    await db.delete(speechCoachV2ActiveSessionsTable).where(eq(speechCoachV2ActiveSessionsTable.userId, userId));
    await db.delete(usageDailyTable).where(eq(usageDailyTable.userId, userId));
    await db.delete(childrenTable).where(eq(childrenTable.userId, userId));
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  });

  it("register/start does not consume the lifetime allowance", async () => {
    const sessionId = randomUUID();
    const tabLockToken = generateTabLockToken();
    const sessionState = createInitialSessionState({
      sessionId,
      childId,
      childName: "First Use Child",
      ageBand: "4-5",
      sessionSeed: 1,
    });
    await registerActiveSession({
      userId,
      childId,
      sessionId,
      ageBand: "4-5",
      sessionState,
      tabLockToken,
    });
    assert.equal(await peekSpeechCoachV2FirstUseUsed(userId), 0);
    assert.equal(await peekSpeechCoachV2FirstUseRemaining(userId), 90);
  });

  it("heartbeat charges a small actual tick, not the full 90 seconds", async () => {
    const rows = await db
      .select()
      .from(speechCoachV2ActiveSessionsTable)
      .where(eq(speechCoachV2ActiveSessionsTable.userId, userId));
    const active = rows[0];
    assert.ok(active);
    const hb = await validateAndTouchSession({
      userId,
      childId,
      sessionId: active!.sessionId,
      tabLockToken: active!.tabLockToken,
    });
    assert.ok(hb.secondsConsumed >= 1);
    assert.ok(hb.secondsConsumed <= 15);
    const used = await peekSpeechCoachV2FirstUseUsed(userId);
    assert.equal(used, hb.secondsConsumed);
    assert.equal(used < 90, true);
    assert.equal(await peekSpeechCoachV2FirstUseRemaining(userId), 90 - used);
  });

  it("terminate of a failed/short session does not burn the full 90 seconds", async () => {
    const rows = await db
      .select()
      .from(speechCoachV2ActiveSessionsTable)
      .where(eq(speechCoachV2ActiveSessionsTable.userId, userId));
    const active = rows[0];
    assert.ok(active);
    await terminateActiveSession({
      userId,
      childId,
      sessionId: active!.sessionId,
      status: "terminated",
    });
    const used = await peekSpeechCoachV2FirstUseUsed(userId);
    assert.ok(used < 90);
    assert.ok(used >= 1);
  });
});

describe("speechCoachV2 trial remains 120/day", { skip: !dbOk }, () => {
  const userId = `p4-speech-trial-${randomUUID()}`;

  before(async () => {
    await db.insert(subscriptionsTable).values({
      userId,
      plan: "monthly",
      status: "trialing",
      provider: "revenuecat",
      subscriptionState: "TRIAL",
      trialEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });
  });

  after(async () => {
    await db.delete(usageDailyTable).where(eq(usageDailyTable.userId, userId));
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  });

  it("trial policy stays 120s/day and is not first-use", async () => {
    const policy = await resolveSpeechCoachV2UsagePolicy(userId);
    assert.equal(policy.isTrial, true);
    assert.equal(policy.isFirstUseFree, false);
    assert.equal(policy.dailyLimitSeconds, SPEECH_COACH_V2_TRIAL_DAILY_LIMIT_SECONDS);
  });
});
