/**
 * Parent feedback loop (Priority 1) — routine-feedback route smoke test.
 *
 * Mounts the routine-feedback router behind an inline auth-injection
 * middleware and exercises routine-level + per-activity feedback writes,
 * signal validation, and ownership enforcement against the real database.
 *
 * This layer lives ABOVE the frozen routine generation engine — it only
 * writes to routine_feedback and never influences generation.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import { db, childrenTable, routinesTable, routineFeedbackTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import routineFeedbackRouter from "./routine-feedback";
import { isDbIntegrationAvailable } from "../test/db-integration.js";

const dbIntegrationOk = await isDbIntegrationAvailable();
const TEST_USER = `routine-feedback-test-${randomUUID()}`;
const TODAY = new Date().toISOString().slice(0, 10);

let server: ReturnType<express.Express["listen"]>;
let baseUrl: string;
let childId: number;
let routineId: number;
let otherRoutineId: number;
let otherChildId: number;

before(async () => {
  if (!dbIntegrationOk) return;

  const [child] = await db
    .insert(childrenTable)
    .values({
      userId: TEST_USER,
      name: "Feedback Child",
      age: 5,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "routine-feedback test",
    })
    .returning({ id: childrenTable.id });
  childId = child!.id;

  const [routine] = await db
    .insert(routinesTable)
    .values({ childId, date: TODAY, title: "Feedback Routine", items: [] })
    .returning({ id: routinesTable.id });
  routineId = routine!.id;

  // A routine owned by a DIFFERENT user, to verify ownership checks.
  const [other] = await db
    .insert(childrenTable)
    .values({
      userId: `other-${randomUUID()}`,
      name: "Other Child",
      age: 6,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "other",
    })
    .returning({ id: childrenTable.id });
  otherChildId = other!.id;
  const [otherRoutine] = await db
    .insert(routinesTable)
    .values({ childId: otherChildId, date: TODAY, title: "Other Routine", items: [] })
    .returning({ id: routinesTable.id });
  otherRoutineId = otherRoutine!.id;

  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as Request).firebaseAuth = {
      userId: TEST_USER,
      email: null,
      emailVerified: false,
      phoneNumber: null,
      name: null,
      picture: null,
    };
    next();
  });
  app.use(routineFeedbackRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (!dbIntegrationOk) return;
  await db
    .delete(routineFeedbackTable)
    .where(inArray(routineFeedbackTable.routineId, [routineId, otherRoutineId]));
  await db.delete(routinesTable).where(inArray(routinesTable.id, [routineId, otherRoutineId]));
  await db.delete(childrenTable).where(inArray(childrenTable.id, [childId, otherChildId]));
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

function post(body: unknown) {
  return fetch(`${baseUrl}/routine-feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("routine-feedback routes — smoke", { skip: !dbIntegrationOk }, () => {
  it("accepts routine-level feedback (null activityKey)", async () => {
    const res = await post({
      childId,
      routineId,
      routineDate: TODAY,
      signal: "worked_well",
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as {
      id: number;
      childId: number;
      routineId: number;
      activityKey: string | null;
      signal: string;
    };
    assert.equal(body.childId, childId);
    assert.equal(body.routineId, routineId);
    assert.equal(body.activityKey, null);
    assert.equal(body.signal, "worked_well");
  });

  it("accepts per-activity feedback with an activityKey", async () => {
    const res = await post({
      childId,
      routineId,
      routineDate: TODAY,
      activityKey: "morning stretch",
      signal: "loved_this",
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as { activityKey: string | null; signal: string };
    assert.equal(body.activityKey, "morning stretch");
    assert.equal(body.signal, "loved_this");
  });

  it("rejects an unknown signal via zod (400)", async () => {
    const res = await post({
      childId,
      routineId,
      routineDate: TODAY,
      signal: "totally_made_up",
    });
    assert.equal(res.status, 400);
  });

  it("rejects feedback for a routine the caller does not own (403)", async () => {
    const res = await post({
      childId: otherChildId,
      routineId: otherRoutineId,
      routineDate: TODAY,
      signal: "worked_well",
    });
    assert.equal(res.status, 403);
  });

  it("rejects a childId that does not match the routine's child (403)", async () => {
    const res = await post({
      childId: otherChildId,
      routineId,
      routineDate: TODAY,
      signal: "worked_well",
    });
    assert.equal(res.status, 403);
  });

  it("persists exactly the feedback rows we created", async () => {
    const rows = await db
      .select()
      .from(routineFeedbackTable)
      .where(eq(routineFeedbackTable.routineId, routineId));
    assert.equal(rows.length, 2);
    const signals = rows.map((r) => r.signal).sort();
    assert.deepEqual(signals, ["loved_this", "worked_well"]);
  });
});
