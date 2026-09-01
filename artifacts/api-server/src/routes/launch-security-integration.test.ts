/**
 * Integration tests for launch security fixes (IDOR + audio warmup auth).
 *
 * Run with: node --import tsx/esm --experimental-test-module-mocks --test src/routes/launch-security-integration.test.ts
 */
import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";

const dbIntegrationOk = Boolean(process.env.DATABASE_URL?.trim());

describe("Launch security — integration", { skip: !dbIntegrationOk }, () => {
  const OWNER = `launch-sec-owner-${randomUUID()}`;
  const OTHER = `launch-sec-other-${randomUUID()}`;
  let ownerChildId: number;
  let envBaseUrl: string;
  let warmupBaseUrl: string;
  let envServer: ReturnType<express.Express["listen"]>;
  let warmupServer: ReturnType<express.Express["listen"]>;

  before(async () => {
    const { db, childrenTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");

    const child = await db
      .insert(childrenTable)
      .values({
        userId: OWNER,
        name: "Launch Test Child",
        age: 5,
        ageMonths: 0,
        schoolStartTime: "08:00",
        schoolEndTime: "14:00",
        goals: "launch-security",
      })
      .returning({ id: childrenTable.id });
    ownerChildId = child[0]!.id;

    mock.module("../queue/ai-job-queue.js", {
      namedExports: {
        enqueueAiJob: async () => ({ jobId: "test-job-id", error: null }),
      },
    });

    const mount = (userId: string, router: express.Router) => {
      const app = express();
      app.use(express.json());
      app.use((req: Request, _res: Response, next: NextFunction) => {
        req.firebaseAuth = {
          userId,
          email: null,
          emailVerified: false,
          phoneNumber: null,
          name: null,
          picture: null,
        };
        next();
      });
      app.use(router);
      return app;
    };

    const { default: environmentRouter } = await import("./environment.js");
    const { default: audioWarmupRouter } = await import("./audio-warmup.js");

    await new Promise<void>((resolve) => {
      envServer = mount(OTHER, environmentRouter).listen(0, () => resolve());
    });
    envBaseUrl = `http://127.0.0.1:${(envServer.address() as AddressInfo).port}`;

    await new Promise<void>((resolve) => {
      warmupServer = mount(OWNER, audioWarmupRouter).listen(0, () => resolve());
    });
    warmupBaseUrl = `http://127.0.0.1:${(warmupServer.address() as AddressInfo).port}`;
  });

  after(async () => {
    const { db, childrenTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    await db.delete(childrenTable).where(eq(childrenTable.userId, OWNER));
    await new Promise<void>((resolve) => envServer?.close(() => resolve()));
    await new Promise<void>((resolve) => warmupServer?.close(() => resolve()));
    mock.restoreAll();
  });

  it("environment context returns 404 for another user's childId", async () => {
    const r = await fetch(`${envBaseUrl}/environment/context?childId=${ownerChildId}`);
    assert.equal(r.status, 404);
    const body = (await r.json()) as { error: string };
    assert.equal(body.error, "child_not_found");
  });

  it("environment context returns child name for owner", async () => {
    const app = express();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.firebaseAuth = {
        userId: OWNER,
        email: null,
        emailVerified: false,
        phoneNumber: null,
        name: null,
        picture: null,
      };
      next();
    });
    const { default: environmentRouter } = await import("./environment.js");
    app.use(environmentRouter);
    const server = await new Promise<ReturnType<express.Express["listen"]>>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const r = await fetch(`${url}/environment/context?childId=${ownerChildId}`);
    assert.equal(r.status, 200);
    const body = (await r.json()) as { childName: string | null };
    assert.equal(body.childName, "Launch Test Child");

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("audio-warmup enqueue returns 202 for authenticated user", async () => {
    const r = await fetch(`${warmupBaseUrl}/audio-warmup/enqueue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: "stories" }),
    });
    assert.equal(r.status, 202);
    const body = (await r.json()) as { ok: boolean; jobId: string };
    assert.equal(body.ok, true);
    assert.equal(body.jobId, "test-job-id");
  });
});
