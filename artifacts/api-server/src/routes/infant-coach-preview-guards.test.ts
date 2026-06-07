/**
 * Integration tests: Amy Coach infant preview guards.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import { db, childrenTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import coachJourneyRouter from "./coach-journey";
import { isDbIntegrationAvailable } from "../test/db-integration.js";
import { INFANT_COACH_PREVIEW_ONLY_ERROR } from "../lib/infant-coach-preview-guard.js";

const dbIntegrationOk = await isDbIntegrationAvailable();
const INFANT_USER = `infant-coach-guard-${randomUUID()}`;
const ADULT_USER = `infant-coach-adult-${randomUUID()}`;

let server: ReturnType<express.Express["listen"]>;
let baseUrl: string;
let infantChildId: number;

function mountApp(...routers: express.Router[]) {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const userId = req.headers["x-test-user"] as string;
    (req as Request).firebaseAuth = {
      userId,
      email: null,
      emailVerified: false,
      phoneNumber: null,
      name: null,
      picture: null,
    };
    next();
  });
  for (const r of routers) app.use(r);
  return app;
}

before(async () => {
  if (!dbIntegrationOk) return;

  const infantRow = await db
    .insert(childrenTable)
    .values({
      userId: INFANT_USER,
      name: "Baby",
      age: 0,
      ageMonths: 14,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "infant coach guard test",
    })
    .returning({ id: childrenTable.id });
  infantChildId = infantRow[0]!.id;

  await db.insert(childrenTable).values({
    userId: ADULT_USER,
    name: "Kid",
    age: 5,
    ageMonths: 0,
    schoolStartTime: "08:00",
    schoolEndTime: "14:00",
    goals: "infant coach guard test",
  });

  const app = mountApp(coachJourneyRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  if (!dbIntegrationOk) return;
  await db.delete(childrenTable).where(eq(childrenTable.userId, INFANT_USER));
  await db.delete(childrenTable).where(eq(childrenTable.userId, ADULT_USER));
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Amy Coach infant preview guards — routes", { skip: !dbIntegrationOk }, () => {
  it("allows GET /coach-journey/status for infant-only household", async () => {
    const r = await fetch(`${baseUrl}/coach-journey/status`, {
      headers: { "x-test-user": INFANT_USER },
    });
    assert.equal(r.status, 200);
  });

  it("blocks POST /coach-journey/complete-plan when childId is infant", async () => {
    const r = await fetch(`${baseUrl}/coach-journey/complete-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": INFANT_USER,
      },
      body: JSON.stringify({
        goalId: "frequent-night-waking",
        sessionId: "infant-test-session",
        childId: infantChildId,
      }),
    });
    assert.equal(r.status, 403);
    const body = (await r.json()) as { error: string; childAgeMonths: number };
    assert.equal(body.error, INFANT_COACH_PREVIEW_ONLY_ERROR);
    assert.equal(body.childAgeMonths, 14);
  });

  it("blocks POST /coach-journey/complete-plan for infant-only household without childId", async () => {
    const r = await fetch(`${baseUrl}/coach-journey/complete-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": INFANT_USER,
      },
      body: JSON.stringify({
        goalId: "frequent-night-waking",
        sessionId: "infant-test-session-2",
      }),
    });
    assert.equal(r.status, 403);
    const body = (await r.json()) as { error: string };
    assert.equal(body.error, INFANT_COACH_PREVIEW_ONLY_ERROR);
  });

  it("allows POST /coach-journey/complete-plan for 24+ household without childId", async () => {
    const r = await fetch(`${baseUrl}/coach-journey/complete-plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": ADULT_USER,
      },
      body: JSON.stringify({
        goalId: "manage-tantrums",
        sessionId: `adult-session-${randomUUID()}`,
      }),
    });
    assert.equal(r.status, 200);
    const body = (await r.json()) as { ok: boolean };
    assert.equal(body.ok, true);
  });

  it("blocks POST /coach-journey/sync-legacy for infant-only household", async () => {
    const r = await fetch(`${baseUrl}/coach-journey/sync-legacy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": INFANT_USER,
      },
      body: JSON.stringify({ blockUsedIds: ["manage-tantrums"] }),
    });
    assert.equal(r.status, 403);
    const body = (await r.json()) as { error: string };
    assert.equal(body.error, INFANT_COACH_PREVIEW_ONLY_ERROR);
  });
});
