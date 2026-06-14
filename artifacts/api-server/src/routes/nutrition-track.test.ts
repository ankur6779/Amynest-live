/**
 * Nutrition track API — smoke test against real DB.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import { db, childrenTable, nutritionDailyLogTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import nutritionTrackRouter from "./nutrition-track.js";
import { isDbIntegrationAvailable } from "../test/db-integration.js";

const dbIntegrationOk = await isDbIntegrationAvailable();
const TEST_USER = `nutrition-track-test-${randomUUID()}`;
const TODAY = "2026-06-14";

let server: ReturnType<express.Express["listen"]>;
let baseUrl: string;
let childId: number;
let otherChildId: number;

before(async () => {
  if (!dbIntegrationOk) return;

  const [child] = await db
    .insert(childrenTable)
    .values({
      userId: TEST_USER,
      name: "Nutrition Child",
      age: 4,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "nutrition-track test",
    })
    .returning({ id: childrenTable.id });
  childId = child!.id;

  const [other] = await db
    .insert(childrenTable)
    .values({
      userId: `other-${randomUUID()}`,
      name: "Other",
      age: 5,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "other",
    })
    .returning({ id: childrenTable.id });
  otherChildId = other!.id;

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
  app.use(nutritionTrackRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (!dbIntegrationOk) return;
  await db.delete(nutritionDailyLogTable).where(eq(nutritionDailyLogTable.childId, childId));
  await db.delete(childrenTable).where(inArray(childrenTable.id, [childId, otherChildId]));
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("nutrition-track routes — smoke", { skip: !dbIntegrationOk }, () => {
  it("PUT then GET daily score", async () => {
    const putRes = await fetch(`${baseUrl}/nutrition/daily-score`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        childId,
        dateKey: TODAY,
        checklist: { breakfast: true, protein: true, dairy: true, greens: true },
      }),
    });
    assert.equal(putRes.status, 200);
    const putJson = (await putRes.json()) as { log: { score: number; minDayMet: boolean } };
    assert.equal(putJson.log.score, 50);
    assert.equal(putJson.log.minDayMet, true);

    const getRes = await fetch(
      `${baseUrl}/nutrition/daily-score?childId=${childId}&date=${TODAY}`,
    );
    assert.equal(getRes.status, 200);
    const getJson = (await getRes.json()) as { log: { score: number } | null };
    assert.equal(getJson.log?.score, 50);
  });

  it("returns weekly trend with seven days", async () => {
    const res = await fetch(
      `${baseUrl}/nutrition/weekly-trend?childId=${childId}&date=${TODAY}`,
    );
    assert.equal(res.status, 200);
    const json = (await res.json()) as { days: unknown[] };
    assert.equal(json.days.length, 7);
  });

  it("returns streak after qualifying day", async () => {
    const res = await fetch(`${baseUrl}/nutrition/streak?childId=${childId}&date=${TODAY}`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { streak: number };
    assert.ok(json.streak >= 1);
  });

  it("forbids other user's child", async () => {
    const res = await fetch(`${baseUrl}/nutrition/daily-score?childId=${otherChildId}&date=${TODAY}`);
    assert.equal(res.status, 403);
  });
});
