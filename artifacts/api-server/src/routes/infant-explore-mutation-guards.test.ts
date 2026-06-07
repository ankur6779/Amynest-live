/**
 * Integration tests: infant explore preview-only guards on mutation routes.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import { db, childrenTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import lifeSkillsRouter from "./life-skills";
import abacusRouter from "./abacus";
import { isDbIntegrationAvailable } from "../test/db-integration.js";
import { INFANT_EXPLORE_PREVIEW_ONLY_ERROR } from "../lib/infant-explore-guard.js";

const dbIntegrationOk = await isDbIntegrationAvailable();
const INFANT_USER = `infant-explore-guard-${randomUUID()}`;
const ADULT_USER = `infant-explore-adult-${randomUUID()}`;

let server: ReturnType<express.Express["listen"]>;
let baseUrl: string;
let infantChildId: number;
let adultChildId: number;

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
      ageMonths: 12,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "infant explore guard test",
    })
    .returning({ id: childrenTable.id });
  infantChildId = infantRow[0]!.id;

  const adultRow = await db
    .insert(childrenTable)
    .values({
      userId: ADULT_USER,
      name: "Kid",
      age: 5,
      ageMonths: 0,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "infant explore guard test",
    })
    .returning({ id: childrenTable.id });
  adultChildId = adultRow[0]!.id;

  const app = mountApp(lifeSkillsRouter, abacusRouter);
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

describe("infant explore mutation guards — routes", { skip: !dbIntegrationOk }, () => {
  it("allows GET /life-skills/today for infant child (preview)", async () => {
    const r = await fetch(`${baseUrl}/life-skills/today?childId=${infantChildId}`, {
      headers: { "x-test-user": INFANT_USER },
    });
    assert.equal(r.status, 200);
  });

  it("blocks POST /life-skills/progress for infant child", async () => {
    const r = await fetch(`${baseUrl}/life-skills/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": INFANT_USER,
      },
      body: JSON.stringify({
        childId: infantChildId,
        skillId: "toddler-wash-1",
        action: "done",
        date: "2026-06-07",
      }),
    });
    assert.equal(r.status, 403);
    const body = (await r.json()) as { error: string; childAgeMonths: number };
    assert.equal(body.error, INFANT_EXPLORE_PREVIEW_ONLY_ERROR);
    assert.equal(body.childAgeMonths, 12);
  });

  it("allows POST /life-skills/progress for 24+ month child", async () => {
    const r = await fetch(`${baseUrl}/life-skills/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": ADULT_USER,
      },
      body: JSON.stringify({
        childId: adultChildId,
        skillId: "kid-time-1",
        action: "done",
        date: "2026-06-07",
      }),
    });
    assert.equal(r.status, 200);
  });

  it("blocks POST /abacus/progress for infant child", async () => {
    const r = await fetch(`${baseUrl}/abacus/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user": INFANT_USER,
      },
      body: JSON.stringify({
        childId: infantChildId,
        action: "log_session",
        totalCorrect: 1,
        totalAttempts: 1,
        totalPoints: 10,
      }),
    });
    assert.equal(r.status, 403);
    const body = (await r.json()) as { error: string };
    assert.equal(body.error, INFANT_EXPLORE_PREVIEW_ONLY_ERROR);
  });

  it("allows GET /abacus/progress for infant child (preview)", async () => {
    const r = await fetch(`${baseUrl}/abacus/progress?childId=${infantChildId}`, {
      headers: { "x-test-user": INFANT_USER },
    });
    assert.equal(r.status, 200);
  });
});
