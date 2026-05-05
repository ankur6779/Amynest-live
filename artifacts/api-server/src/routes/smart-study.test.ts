/**
 * Smart Study Zone — route-level integration test.
 *
 * The adaptive engine is unit-tested in @workspace/study-zone, but those
 * tests don't catch route-level regressions: auth failures, ownership
 * checks, JSONB serialization round-trip, or the daily-plan endpoint
 * actually picking up weak topics that the attempt endpoint just wrote.
 *
 * This test mounts the real `smart-study` router on a throwaway Express
 * app (with an injected stub auth middleware so getAuth(req).userId
 * returns our test user), seeds a real child row, posts ~10 attempts
 * with one topic deliberately failing, then asserts that:
 *   1. POST /attempt persists weakTopics for the failing topic.
 *   2. POST /daily-plan surfaces that topic as a "weak" plan item.
 *   3. The unauthenticated path returns 401.
 *   4. A request from a different user for the same childId returns 404
 *      (ownership guard).
 *
 * Uses a randomly-generated userId per test run and cleans up the rows
 * it created so it doesn't pollute the dev DB.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { eq } from "drizzle-orm";
import {
  db,
  childrenTable,
  childLearningProgressTable,
} from "@workspace/db";
import smartStudyRouter from "./smart-study.js";

type AuthedApp = {
  server: http.Server;
  baseUrl: string;
};

async function startApp(injectedUserId: string | null): Promise<AuthedApp> {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.firebaseAuth = {
      userId: injectedUserId,
      email: null,
      emailVerified: false,
      name: null,
      picture: null,
    };
    next();
  });
  app.use("/api", smartStudyRouter);
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function stopApp(app: AuthedApp): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    app.server.close((err) => (err ? reject(err) : resolve())),
  );
}

describe("smart-study route — daily-plan + attempt round-trip", () => {
  const userId = `smart-study-test-${randomUUID()}`;
  let app: AuthedApp;
  let childId: number;

  before(async () => {
    // Age 8 → resolves to "basic" study mode (school-age) so the engine
    // emits a non-empty plan with weak/fresh items.
    const inserted = await db
      .insert(childrenTable)
      .values({
        userId,
        name: "Test Kid",
        age: 8,
        ageMonths: 0,
        schoolStartTime: "09:00",
        schoolEndTime: "15:00",
        goals: "",
      })
      .returning({ id: childrenTable.id });
    childId = inserted[0]!.id;
    app = await startApp(userId);
  });

  after(async () => {
    await db
      .delete(childLearningProgressTable)
      .where(eq(childLearningProgressTable.userId, userId));
    await db
      .delete(childrenTable)
      .where(eq(childrenTable.userId, userId));
    if (app) await stopApp(app);
  });

  it("records ~10 attempts and surfaces the failing topic as a weak plan item", async () => {
    // 5 wrong attempts on math/addition → 0% accuracy on that topic →
    // recomputeWeakTopics will mark it weak (≥2 attempts and <60%).
    for (let i = 0; i < 5; i++) {
      const r = await fetch(`${app.baseUrl}/api/smart-study/attempt`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          childId,
          subject: "math",
          topicId: "addition",
          correct: false,
        }),
      });
      assert.equal(r.status, 200, `wrong attempt ${i} should be accepted`);
    }

    // 5 correct attempts spread across other topics so the engine has
    // enough context to (a) not flag those as weak and (b) round-trip
    // multi-subject JSONB correctly.
    const fillers: { subject: string; topicId: string; correct: boolean }[] = [
      { subject: "math", topicId: "subtraction", correct: true },
      { subject: "math", topicId: "subtraction", correct: true },
      { subject: "english", topicId: "nouns", correct: true },
      { subject: "english", topicId: "nouns", correct: true },
      { subject: "science", topicId: "plants", correct: true },
    ];
    for (const f of fillers) {
      const r = await fetch(`${app.baseUrl}/api/smart-study/attempt`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ childId, ...f }),
      });
      assert.equal(r.status, 200, `filler attempt should be accepted`);
    }

    // Sanity: the math row should have exactly ["addition"] as weak.
    const rows = await db
      .select()
      .from(childLearningProgressTable)
      .where(eq(childLearningProgressTable.userId, userId));
    const math = rows.find((r) => r.subject === "math");
    assert.ok(math, "math progress row should be persisted");
    const weakTopics = Array.isArray(math!.weakTopics)
      ? (math!.weakTopics as unknown[])
      : [];
    assert.deepEqual(
      weakTopics,
      ["addition"],
      `expected math weakTopics to be ["addition"], got ${JSON.stringify(weakTopics)}`,
    );

    // Now ask for the daily plan — addition should be in there as a
    // "weak" item (engine seeds weak topics first).
    const planRes = await fetch(`${app.baseUrl}/api/smart-study/daily-plan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childId }),
    });
    assert.equal(planRes.status, 200);
    const planBody = (await planRes.json()) as {
      child: { id: number; mode: string };
      plan: { items: { subject: string; topicId: string; source: string }[] };
      completionPct: number;
      doneTopicIds: string[];
    };
    assert.equal(planBody.child.id, childId);
    assert.equal(
      planBody.child.mode,
      "basic",
      "age 8 should resolve to basic study mode",
    );
    assert.ok(
      Array.isArray(planBody.plan.items) && planBody.plan.items.length > 0,
      "daily plan must be non-empty in basic mode",
    );
    const weakItem = planBody.plan.items.find(
      (it) => it.subject === "math" && it.topicId === "addition",
    );
    assert.ok(
      weakItem,
      `addition should appear in plan; got items: ${JSON.stringify(planBody.plan.items)}`,
    );
    assert.equal(
      weakItem!.source,
      "weak",
      "addition should be tagged as a weak (recap) item",
    );

    // doneTopicIds for today should include the topics we attempted.
    assert.ok(planBody.doneTopicIds.includes("addition"));
    assert.ok(planBody.doneTopicIds.includes("subtraction"));
  });

  it("returns 401 when the request is unauthenticated", async () => {
    const anon = await startApp(null);
    try {
      const r = await fetch(`${anon.baseUrl}/api/smart-study/daily-plan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ childId }),
      });
      assert.equal(r.status, 401);
      const r2 = await fetch(`${anon.baseUrl}/api/smart-study/attempt`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          childId,
          subject: "math",
          topicId: "addition",
          correct: true,
        }),
      });
      assert.equal(r2.status, 401);
    } finally {
      await stopApp(anon);
    }
  });

  it("returns 404 when the child belongs to another user (ownership guard)", async () => {
    const otherUserId = `smart-study-test-other-${randomUUID()}`;
    const other = await startApp(otherUserId);
    try {
      const r = await fetch(`${other.baseUrl}/api/smart-study/daily-plan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ childId }),
      });
      assert.equal(r.status, 404);
      const r2 = await fetch(`${other.baseUrl}/api/smart-study/attempt`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          childId,
          subject: "math",
          topicId: "addition",
          correct: true,
        }),
      });
      assert.equal(r2.status, 404);
    } finally {
      await stopApp(other);
    }
  });

  it("Smart Study v2: next-questions returns shape and /attempt persists seen ids + bumps level", async () => {
    // Smart Study v2 lives on per-(child, subject) rows where `subject` is
    // one of the SMART_SUBJECTS ids — independent from the legacy "math"
    // row used by /daily-plan above. Use "addition" so the level state
    // here can't collide with the earlier weak-topic row.
    const nq = await fetch(`${app.baseUrl}/api/smart-study/next-questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childId, subject: "addition", count: 3 }),
    });
    assert.equal(nq.status, 200);
    const nqBody = (await nq.json()) as {
      level: number;
      source: "ai" | "dataset";
      country: string;
      questions: { id: string; q: string; options: string[]; answer: string }[];
    };
    assert.ok(nqBody.questions.length === 3, `expected 3 questions, got ${nqBody.questions.length}`);
    assert.ok(nqBody.level >= 1 && nqBody.level <= 6, "level must be 1..6");
    assert.ok(["ai", "dataset"].includes(nqBody.source));
    for (const q of nqBody.questions) {
      assert.ok(q.id && q.q && q.options.length >= 2 && q.options.includes(q.answer));
    }

    // Post 3 correct attempts with questionIds — should bump level by +1
    // (3-correct streak rule) and persist all 3 ids in seenQuestionIds.
    for (const q of nqBody.questions) {
      const r = await fetch(`${app.baseUrl}/api/smart-study/attempt`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          childId,
          subject: "addition",
          topicId: "addition",
          correct: true,
          questionId: q.id,
        }),
      });
      assert.equal(r.status, 200);
    }

    const rows = await db
      .select()
      .from(childLearningProgressTable)
      .where(eq(childLearningProgressTable.userId, userId));
    const additionRow = rows.find((r) => r.subject === "addition");
    assert.ok(additionRow, "addition smart-study row should be persisted");
    const seen = Array.isArray(additionRow!.seenQuestionIds)
      ? (additionRow!.seenQuestionIds as string[])
      : [];
    assert.equal(seen.length, 3, `expected 3 seen ids, got ${seen.length}`);
    for (const q of nqBody.questions) {
      assert.ok(seen.includes(q.id), `seenQuestionIds should include ${q.id}`);
    }
    assert.equal(
      additionRow!.currentLevel,
      Math.min(nqBody.level + 1, 6),
      "3 correct in a row should bump currentLevel by 1 (clamped to 6)",
    );

    // A second next-questions call must not return any of the now-seen ids.
    const nq2 = await fetch(`${app.baseUrl}/api/smart-study/next-questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childId, subject: "addition", count: 3 }),
    });
    assert.equal(nq2.status, 200);
    const nq2Body = (await nq2.json()) as { questions: { id: string }[] };
    for (const q of nq2Body.questions) {
      assert.ok(!seen.includes(q.id), `next batch should exclude seen id ${q.id}`);
    }
  });

  it("rejects an unknown subject with 400", async () => {
    const r = await fetch(`${app.baseUrl}/api/smart-study/attempt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        childId,
        subject: "not-a-real-subject",
        topicId: "addition",
        correct: true,
      }),
    });
    assert.equal(r.status, 400);
    const body = (await r.json()) as { error: string };
    assert.equal(body.error, "unknown_subject");
  });
});
