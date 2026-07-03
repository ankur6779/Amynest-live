/**
 * Phase 3 P0 — integration smoke tests for production-critical APIs.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import {
  db,
  analyticsEventsTable,
  childrenTable,
  learningProgressTable,
  parentHubJourneyTable,
  subscriptionsTable,
  userDevicesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import hubJourneyRouter from "./hub-journey";
import learningProgressRouter from "./learning-progress";
import devicesRouter from "./devices";
import analyticsRouter from "./analytics";
import subscriptionRouter from "./subscription";
import { isDbIntegrationAvailable } from "../test/db-integration.js";
import { resetApiDomainMetrics } from "../lib/api-domain-metrics.js";

const dbIntegrationOk = await isDbIntegrationAvailable();
const TEST_USER = `p0-stability-${randomUUID()}`;
const DEVICE_ID = `device-${randomUUID().replace(/-/g, "").slice(0, 24)}`;

let server: ReturnType<express.Express["listen"]>;
let baseUrl: string;
let childId: number;

function authInjector(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = `test-${randomUUID()}`;
  (req as Request).firebaseAuth = {
    userId: TEST_USER,
    email: "p0-test@example.com",
    emailVerified: true,
    phoneNumber: null,
    name: "P0 Test",
    picture: null,
  };
  next();
}

before(async () => {
  if (!dbIntegrationOk) return;
  resetApiDomainMetrics();

  const inserted = await db
    .insert(childrenTable)
    .values({
      userId: TEST_USER,
      name: "P0 Child",
      age: 6,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "p0 stability test",
    })
    .returning({ id: childrenTable.id });
  childId = inserted[0]!.id;

  const app = express();
  app.use(express.json());
  app.use(authInjector);
  app.use(hubJourneyRouter);
  app.use(learningProgressRouter);
  app.use(devicesRouter);
  app.use(analyticsRouter);
  app.use(subscriptionRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (!dbIntegrationOk) return;
  await db.delete(analyticsEventsTable).where(eq(analyticsEventsTable.userId, TEST_USER));
  await db.delete(learningProgressTable).where(eq(learningProgressTable.userId, TEST_USER));
  await db.delete(parentHubJourneyTable).where(eq(parentHubJourneyTable.userId, TEST_USER));
  await db.delete(userDevicesTable).where(eq(userDevicesTable.userId, TEST_USER));
  await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, TEST_USER));
  await db.delete(childrenTable).where(eq(childrenTable.userId, TEST_USER));
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("P0 hub journey", { skip: !dbIntegrationOk }, () => {
  it("GET /hub-journey/status returns 200 with journey payload", async () => {
    const res = await fetch(`${baseUrl}/hub-journey/status?childId=${childId}`);
    assert.equal(res.status, 200, await res.text());
    const body = (await res.json()) as { journeyDay: number; child: { id: number } };
    assert.ok(body.journeyDay >= 1);
    assert.equal(body.child.id, childId);
  });
});

describe("P0 learning progress", { skip: !dbIntegrationOk }, () => {
  it("GET /learning-progress/status returns 200 even when hub is fresh", async () => {
    const res = await fetch(`${baseUrl}/learning-progress/status?childId=${childId}`);
    assert.equal(res.status, 200, await res.text());
    const body = (await res.json()) as { journeyDay: number; child: { id: number } };
    assert.ok(body.journeyDay >= 1);
    assert.equal(body.child.id, childId);
  });

  it("concurrent status reads do not 500 (insert race)", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        fetch(`${baseUrl}/learning-progress/status?childId=${childId}`),
      ),
    );
    for (const res of results) {
      assert.equal(res.status, 200, await res.text());
    }
  });
});

describe("P0 device registration", { skip: !dbIntegrationOk }, () => {
  it("POST /devices/register returns 200", async () => {
    const res = await fetch(`${baseUrl}/devices/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deviceId: DEVICE_ID,
        platform: "web",
        browser: "test",
        os: "test",
      }),
    });
    assert.equal(res.status, 200, await res.text());
    const body = (await res.json()) as { device: { deviceId: string }; registered: boolean };
    assert.equal(body.device.deviceId, DEVICE_ID);
    assert.equal(body.registered, true);
  });

  it("re-register is idempotent", async () => {
    const res = await fetch(`${baseUrl}/devices/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: DEVICE_ID, platform: "web" }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { registered: boolean };
    assert.equal(body.registered, false);
  });
});

describe("P0 analytics ingestion", { skip: !dbIntegrationOk }, () => {
  it("POST /analytics/events accepts valid batch", async () => {
    const res = await fetch(`${baseUrl}/analytics/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        platform: "web",
        events: [{ name: "app_open", props: { cold: true } }],
      }),
    });
    assert.equal(res.status, 202, await res.text());
    const body = (await res.json()) as { accepted: number };
    assert.ok(body.accepted >= 1);
  });
});

describe("P0 billing rc-sync validation", { skip: !dbIntegrationOk }, () => {
  it("POST /subscription/rc-sync rejects non-restore without 500", async () => {
    const res = await fetch(`${baseUrl}/subscription/rc-sync`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purpose: "purchase" }),
    });
    assert.equal(res.status, 409);
    const body = (await res.json()) as { reason: string };
    assert.equal(body.reason, "webhook_required");
  });

  it("POST /subscription/rc-sync restore returns structured JSON (no 500)", async () => {
    const res = await fetch(`${baseUrl}/subscription/rc-sync`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purpose: "restore" }),
    });
    assert.notEqual(res.status, 500, await res.text());
    const body = (await res.json()) as { ok: boolean; reason?: string };
    assert.equal(typeof body.ok, "boolean");
  });
});
