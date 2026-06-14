/**
 * Meal memory API — premium gate on history read (P1 hardening).
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import { db, childrenTable, subscriptionsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import nutritionMemoryRouter from "./nutrition-memory.js";
import { isDbIntegrationAvailable } from "../test/db-integration.js";

const dbIntegrationOk = await isDbIntegrationAvailable();
const FREE_USER = `nutrition-memory-free-${randomUUID()}`;
const PREMIUM_USER = `nutrition-memory-premium-${randomUUID()}`;

let server: ReturnType<express.Express["listen"]>;
let baseUrl: string;
let freeChildId: number;
let premiumChildId: number;

before(async () => {
  if (!dbIntegrationOk) return;

  const [freeChild] = await db
    .insert(childrenTable)
    .values({
      userId: FREE_USER,
      name: "Free Child",
      age: 5,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "memory test",
    })
    .returning({ id: childrenTable.id });
  freeChildId = freeChild!.id;

  const [premiumChild] = await db
    .insert(childrenTable)
    .values({
      userId: PREMIUM_USER,
      name: "Premium Child",
      age: 6,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "memory test",
    })
    .returning({ id: childrenTable.id });
  premiumChildId = premiumChild!.id;

  await db.insert(subscriptionsTable).values({
    userId: PREMIUM_USER,
    plan: "yearly",
    status: "active",
    provider: "revenuecat",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers["x-test-user"] as string | undefined;
    (req as Request).firebaseAuth = {
      userId: header ?? FREE_USER,
      email: null,
      emailVerified: false,
      phoneNumber: null,
      name: null,
      picture: null,
    };
    next();
  });
  app.use(nutritionMemoryRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (!dbIntegrationOk) return;
  await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, PREMIUM_USER));
  await db.delete(childrenTable).where(inArray(childrenTable.id, [freeChildId, premiumChildId]));
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("nutrition meal memory — premium gate", { skip: !dbIntegrationOk }, () => {
  it("returns 403 premium_required for free user GET", async () => {
    const res = await fetch(`${baseUrl}/nutrition/meal-memory?childId=${freeChildId}`, {
      headers: { "x-test-user": FREE_USER },
    });
    assert.equal(res.status, 403);
    const json = (await res.json()) as { error: string };
    assert.equal(json.error, "premium_required");
  });

  it("allows premium user GET meal memory", async () => {
    const res = await fetch(`${baseUrl}/nutrition/meal-memory?childId=${premiumChildId}`, {
      headers: { "x-test-user": PREMIUM_USER },
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { entries: unknown[] };
    assert.ok(Array.isArray(json.entries));
  });

  it("allows free user POST meal outcome (sync recording)", async () => {
    const res = await fetch(`${baseUrl}/nutrition/meal-outcome`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-user": FREE_USER },
      body: JSON.stringify({
        childId: freeChildId,
        dateKey: "2026-06-14",
        mealSlot: "dinner",
        mealName: "Dal",
        outcome: "loved",
      }),
    });
    assert.equal(res.status, 200);
  });
});
