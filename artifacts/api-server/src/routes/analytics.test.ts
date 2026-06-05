/**
 * Analytics instrumentation — ingest + data-quality + retention smoke test.
 *
 * Mounts the analytics + analytics-admin routers behind an inline
 * auth-injection middleware (the injected user is also marked admin via
 * ADMIN_USER_IDS) and exercises batch ingest, taxonomy validation, the
 * data-quality readout, and retention measurement against the real database.
 *
 * Pure measurement — never feeds routine generation.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import { db, analyticsEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import analyticsRouter from "./analytics";
import analyticsAdminRouter from "./analytics-admin";
import { resetAnalyticsQuality } from "../services/analyticsIngestService";
import { isDbIntegrationAvailable } from "../test/db-integration.js";

const dbIntegrationOk = await isDbIntegrationAvailable();
const TEST_USER = `analytics-test-${randomUUID()}`;

let server: ReturnType<express.Express["listen"]>;
let baseUrl: string;

before(async () => {
  if (!dbIntegrationOk) return;
  // Mark the injected test user as an admin so the readout endpoints pass.
  process.env.ADMIN_USER_IDS = `${process.env.ADMIN_USER_IDS ?? ""},${TEST_USER}`;
  resetAnalyticsQuality();

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
  app.use(analyticsRouter);
  app.use(analyticsAdminRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (!dbIntegrationOk) return;
  await db.delete(analyticsEventsTable).where(eq(analyticsEventsTable.userId, TEST_USER));
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("analytics routes — smoke", { skip: !dbIntegrationOk }, () => {
  it("ingests valid events and drops invalid ones with a summary", async () => {
    const res = await fetch(`${baseUrl}/analytics/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        platform: "web",
        events: [
          { name: "app_open", props: { cold: true } },
          { name: "routine_viewed", props: { routineId: 1, dateMode: "today" } },
          { name: "totally_unknown_event", props: {} },
          { name: "routine_viewed", props: { dateMode: "not_a_mode" } },
        ],
      }),
    });
    assert.equal(res.status, 202);
    const body = (await res.json()) as {
      accepted: number;
      rejected: number;
      byReason: { unknown_event: number; invalid_props: number };
    };
    assert.equal(body.accepted, 2);
    assert.equal(body.rejected, 2);
    assert.equal(body.byReason.unknown_event, 1);
    assert.equal(body.byReason.invalid_props, 1);
  });

  it("rejects an empty batch (400)", async () => {
    const res = await fetch(`${baseUrl}/analytics/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: [] }),
    });
    assert.equal(res.status, 400);
  });

  it("persists accepted events to analytics_events", async () => {
    const rows = await db
      .select()
      .from(analyticsEventsTable)
      .where(eq(analyticsEventsTable.userId, TEST_USER));
    assert.equal(rows.length, 2);
    const names = rows.map((r) => r.eventName).sort();
    assert.deepEqual(names, ["app_open", "routine_viewed"]);
    // Category is derived from the taxonomy, not the client.
    assert.ok(rows.every((r) => r.eventCategory === "session" || r.eventCategory === "routine"));
  });

  it("exposes a data-quality snapshot to admins", async () => {
    const res = await fetch(`${baseUrl}/admin/analytics/quality`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      accepted: number;
      rejected: { unknownEvent: number; invalidProps: number };
      invalidRate: number;
    };
    assert.equal(body.accepted, 2);
    assert.equal(body.rejected.unknownEvent, 1);
    assert.equal(body.rejected.invalidProps, 1);
    assert.equal(body.invalidRate, 0.5);
  });

  it("computes a retention report including today's active user", async () => {
    const res = await fetch(`${baseUrl}/admin/analytics/retention?days=30`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      windowDays: number;
      activeUsers: { dau: number; wau: number; mau: number };
      dauSeries: Array<{ day: string; count: number }>;
      retention: { d1: { rate: number | null }; d7: unknown; d30: unknown };
    };
    assert.equal(body.windowDays, 30);
    assert.ok(body.activeUsers.dau >= 1, "today's ingest should count as a DAU");
    assert.ok(Array.isArray(body.dauSeries));
    assert.ok("d1" in body.retention && "d7" in body.retention && "d30" in body.retention);
  });

  it("forbids non-admins from the readouts", async () => {
    // A fresh app whose injected user is NOT in ADMIN_USER_IDS.
    const app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request).firebaseAuth = {
        userId: `nonadmin-${randomUUID()}`,
        email: null,
        emailVerified: false,
        phoneNumber: null,
        name: null,
        picture: null,
      };
      next();
    });
    app.use(analyticsAdminRouter);
    const srv = app.listen(0);
    await new Promise<void>((r) => srv.once("listening", () => r()));
    const port = (srv.address() as AddressInfo).port;
    const res = await fetch(`http://127.0.0.1:${port}/admin/analytics/retention`);
    assert.equal(res.status, 403);
    await new Promise<void>((resolve) => srv.close(() => resolve()));
  });
});
