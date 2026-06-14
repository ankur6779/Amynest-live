/**
 * Caregiver share API — premium gate and authorization (P0).
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import { db, childrenTable, nutritionCaregiverShareTable, subscriptionsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import nutritionCaregiverShareRouter, {
  nutritionSharePublicRouter,
} from "./nutrition-caregiver-share.js";
import { isDbIntegrationAvailable } from "../test/db-integration.js";

const dbIntegrationOk = await isDbIntegrationAvailable();
const FREE_USER = `nutrition-share-free-${randomUUID()}`;
const PREMIUM_USER = `nutrition-share-premium-${randomUUID()}`;
const OTHER_USER = `nutrition-share-other-${randomUUID()}`;

const sharePayload = {
  foodStyle: "indian",
  children: [
    {
      childId: 0,
      name: "Test Child",
      tonightMeal: "Dal rice",
      dayLabel: "Mon",
      mealPlanSlots: [{ slot: "dinner", meal: "Dal rice" }],
      familyPortionMeal: null,
    },
  ],
};

let server: ReturnType<express.Express["listen"]>;
let baseUrl: string;
let freeChildId: number;
let premiumChildId: number;
let otherChildId: number;

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
      goals: "share test",
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
      goals: "share test",
    })
    .returning({ id: childrenTable.id });
  premiumChildId = premiumChild!.id;

  const [otherChild] = await db
    .insert(childrenTable)
    .values({
      userId: OTHER_USER,
      name: "Other Child",
      age: 4,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "other",
    })
    .returning({ id: childrenTable.id });
  otherChildId = otherChild!.id;

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
  app.use(nutritionCaregiverShareRouter);
  app.use(nutritionSharePublicRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (!dbIntegrationOk) return;

  await db.delete(nutritionCaregiverShareTable).where(
    inArray(nutritionCaregiverShareTable.userId, [FREE_USER, PREMIUM_USER, OTHER_USER]),
  );
  await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, PREMIUM_USER));
  await db.delete(childrenTable).where(
    inArray(childrenTable.id, [freeChildId, premiumChildId, otherChildId]),
  );
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("nutrition caregiver share — P0 authorization", { skip: !dbIntegrationOk }, () => {
  it("returns 401 without auth user", async () => {
    const app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request).firebaseAuth = undefined;
      next();
    });
    app.use(nutritionCaregiverShareRouter);

    const tmpServer = app.listen(0);
    const port = (tmpServer.address() as AddressInfo).port;
    const res = await fetch(`http://127.0.0.1:${port}/nutrition/caregiver-share`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childIds: [freeChildId], payload: sharePayload }),
    });
    assert.equal(res.status, 401);
    await new Promise<void>((resolve) => tmpServer.close(() => resolve()));
  });

  it("returns 403 premium_required for free user", async () => {
    const res = await fetch(`${baseUrl}/nutrition/caregiver-share`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-user": FREE_USER,
      },
      body: JSON.stringify({
        childIds: [freeChildId],
        payload: { ...sharePayload, children: [{ ...sharePayload.children[0]!, childId: freeChildId }] },
      }),
    });
    assert.equal(res.status, 403);
    const json = (await res.json()) as { error: string };
    assert.equal(json.error, "premium_required");
  });

  it("allows premium user to create share link", async () => {
    const res = await fetch(`${baseUrl}/nutrition/caregiver-share`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-user": PREMIUM_USER,
      },
      body: JSON.stringify({
        childIds: [premiumChildId],
        payload: {
          ...sharePayload,
          children: [{ ...sharePayload.children[0]!, childId: premiumChildId, name: "Premium Child" }],
        },
      }),
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { shareToken: string };
    assert.ok(json.shareToken);

    const publicRes = await fetch(`${baseUrl}/nutrition/share/${json.shareToken}`);
    assert.equal(publicRes.status, 200);
    const view = (await publicRes.json()) as { payload: { children: Array<{ name: string }> } };
    assert.equal(view.payload.children[0]?.name, "Premium Child");
  });

  it("forbids creating share for another user's child", async () => {
    const res = await fetch(`${baseUrl}/nutrition/caregiver-share`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-user": PREMIUM_USER,
      },
      body: JSON.stringify({
        childIds: [otherChildId],
        payload: {
          ...sharePayload,
          children: [{ ...sharePayload.children[0]!, childId: otherChildId, name: "Other Child" }],
        },
      }),
    });
    assert.equal(res.status, 403);
  });
});
