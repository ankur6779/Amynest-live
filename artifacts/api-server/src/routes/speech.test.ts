/**
 * Speech Coach routes — integration smoke tests.
 *
 * Mounts the real router behind an inline auth-injection middleware against
 * the live dev DB. Verifies the happy paths, the featureGate 402 once the
 * lifetime free attempt is consumed, and waitlist idempotency.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import type { AddressInfo } from "node:net";
import { eq } from "drizzle-orm";
import {
  db,
  childrenTable,
  speechProgressTable,
  speechPracticeLogTable,
  speechExpertWaitlistTable,
  subscriptionsTable,
  usageDailyTable,
} from "@workspace/db";
import {
  PRONUNCIATION_PROMPTS,
  SPEECH_MILESTONES,
} from "@workspace/speech-coach";
import speechRouter from "./speech";

const TEST_USER = `speech-test-${randomUUID()}`;
let server: ReturnType<Express["listen"]>;
let baseUrl: string;
let childId: number;

before(async () => {
  // 3-year-old so we get the "3y" milestone band + matching prompts.
  const inserted = await db
    .insert(childrenTable)
    .values({
      userId: TEST_USER,
      name: "Speech Test Child",
      age: 3,
      ageMonths: 0,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "speech-test",
    })
    .returning({ id: childrenTable.id });
  childId = inserted[0]!.id;

  const app = express();
  app.use(express.json());
  const noopLog = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    trace: () => {},
    fatal: () => {},
    child: () => noopLog,
  };
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.firebaseAuth = {
      userId: TEST_USER,
      email: null,
      emailVerified: false,
      phoneNumber: null,
      name: null,
      picture: null,
    };
    (req as unknown as { log: typeof noopLog }).log = noopLog;
    next();
  });
  app.use(speechRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await db
    .delete(speechProgressTable)
    .where(eq(speechProgressTable.userId, TEST_USER));
  await db
    .delete(speechPracticeLogTable)
    .where(eq(speechPracticeLogTable.userId, TEST_USER));
  await db
    .delete(speechExpertWaitlistTable)
    .where(eq(speechExpertWaitlistTable.userId, TEST_USER));
  await db
    .delete(usageDailyTable)
    .where(eq(usageDailyTable.userId, TEST_USER));
  await db
    .delete(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, TEST_USER));
  await db.delete(childrenTable).where(eq(childrenTable.id, childId));
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("speech routes — smoke", () => {
  it("GET /speech/milestones returns the 3y band defaulted to on_track", async () => {
    const r = await fetch(`${baseUrl}/speech/milestones?childId=${childId}`);
    assert.equal(r.status, 200);
    const body = (await r.json()) as {
      childId: number;
      ageBand: string;
      milestones: Array<{ id: string; ageBand: string; status: string }>;
    };
    assert.equal(body.childId, childId);
    assert.equal(body.ageBand, "3y");
    assert.ok(body.milestones.length > 0);
    for (const m of body.milestones) {
      assert.equal(m.ageBand, "3y");
      assert.equal(m.status, "on_track");
    }
  });

  it("POST /speech/milestones/:id/status persists status", async () => {
    const milestone = SPEECH_MILESTONES.find((m) => m.ageBand === "3y")!;
    const r = await fetch(
      `${baseUrl}/speech/milestones/${milestone.id}/status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, status: "needs_attention" }),
      },
    );
    assert.equal(r.status, 200);
    const body = (await r.json()) as { status: string; milestoneId: string };
    assert.equal(body.status, "needs_attention");
    assert.equal(body.milestoneId, milestone.id);

    // Re-read shows the new status.
    const r2 = await fetch(`${baseUrl}/speech/milestones?childId=${childId}`);
    const body2 = (await r2.json()) as {
      milestones: Array<{ id: string; status: string }>;
    };
    const match = body2.milestones.find((m) => m.id === milestone.id);
    assert.equal(match?.status, "needs_attention");
  });

  it("POST /speech/milestones/:id/status rejects unknown milestone with 404", async () => {
    const r = await fetch(`${baseUrl}/speech/milestones/not_a_real_id/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, status: "on_track" }),
    });
    assert.equal(r.status, 404);
  });

  it("GET /speech/practice/prompts returns 3y prompts", async () => {
    const r = await fetch(
      `${baseUrl}/speech/practice/prompts?childId=${childId}`,
    );
    assert.equal(r.status, 200);
    const body = (await r.json()) as {
      ageBand: string;
      prompts: Array<{ id: string; kind: string }>;
    };
    assert.equal(body.ageBand, "3y");
    assert.ok(body.prompts.length > 0);
  });

  it("POST /speech/practice/log succeeds once then 402s on the second attempt", async () => {
    // Make sure the lifetime bucket is empty for this fresh user.
    await db
      .delete(usageDailyTable)
      .where(eq(usageDailyTable.userId, TEST_USER));

    const prompt = PRONUNCIATION_PROMPTS.find((p) => p.ageBands.includes("3y"))!;
    const r1 = await fetch(`${baseUrl}/speech/practice/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId,
        promptId: prompt.id,
        clarityScore: 80,
      }),
    });
    assert.equal(r1.status, 200);
    const body1 = (await r1.json()) as { promptId: string; clarityScore: number | null };
    assert.equal(body1.promptId, prompt.id);
    assert.equal(body1.clarityScore, 80);

    const r2 = await fetch(`${baseUrl}/speech/practice/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId,
        promptId: prompt.id,
        clarityScore: 60,
      }),
    });
    assert.equal(r2.status, 402);
    const body2 = (await r2.json()) as { error: string; feature: string };
    assert.equal(body2.error, "feature_locked");
    assert.equal(body2.feature, "hub_speech_pronounce");
  });

  it("GET /speech/progress aggregates from the logged attempt", async () => {
    const r = await fetch(`${baseUrl}/speech/progress?childId=${childId}`);
    assert.equal(r.status, 200);
    const body = (await r.json()) as {
      promptsAttempted: number;
      promptsClear: number;
      daysActive: number;
      milestonesTotal: number;
      score: number;
    };
    assert.ok(body.promptsAttempted >= 1);
    assert.ok(body.promptsClear >= 1);
    assert.ok(body.daysActive >= 1);
    assert.ok(body.milestonesTotal > 0);
    assert.ok(body.score >= 0 && body.score <= 100);
  });

  it("POST /speech/expert-waitlist is idempotent on (userId, childId)", async () => {
    const r1 = await fetch(`${baseUrl}/speech/expert-waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, notes: "interested" }),
    });
    assert.equal(r1.status, 200);
    const body1 = (await r1.json()) as { id: number; alreadyOnWaitlist: boolean };
    assert.equal(body1.alreadyOnWaitlist, false);

    const r2 = await fetch(`${baseUrl}/speech/expert-waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId }),
    });
    assert.equal(r2.status, 200);
    const body2 = (await r2.json()) as { id: number; alreadyOnWaitlist: boolean };
    assert.equal(body2.alreadyOnWaitlist, true);
    assert.equal(body2.id, body1.id);

    // Anonymous (no childId) join is also idempotent for the same user.
    const r3 = await fetch(`${baseUrl}/speech/expert-waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(r3.status, 200);
    const r4 = await fetch(`${baseUrl}/speech/expert-waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(r4.status, 200);
    const body3 = (await r3.json()) as { id: number; childId: number | null };
    const body4 = (await r4.json()) as { id: number; alreadyOnWaitlist: boolean };
    assert.equal(body3.childId, null);
    assert.equal(body4.alreadyOnWaitlist, true);
    assert.equal(body4.id, body3.id);
  });
});
