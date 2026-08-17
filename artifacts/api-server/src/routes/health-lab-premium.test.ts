import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import { eq } from "drizzle-orm";
import {
  db,
  childrenTable,
  healthLabProgressTable,
  subscriptionsTable,
} from "@workspace/db";
import { isDbIntegrationAvailable } from "../test/db-integration.js";
import { HEALTH_LAB_ENDPOINT_CLASS } from "../services/healthLabPremiumGate.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const dbOk = await isDbIntegrationAvailable();

function readRoute(): string {
  return readFileSync(join(__dir, "health-lab.ts"), "utf8");
}

describe("Health Lab endpoint protection matrix", () => {
  it("classifies progression reads and mutations, leaving admin ungated by premium", () => {
    assert.equal(HEALTH_LAB_ENDPOINT_CLASS["GET /health-lab/profile/:childId"], "progression_read");
    assert.equal(HEALTH_LAB_ENDPOINT_CLASS["GET /health-lab/dashboard/:childId"], "progression_read");
    assert.equal(HEALTH_LAB_ENDPOINT_CLASS["GET /health-lab/history/:childId"], "progression_read");
    assert.equal(HEALTH_LAB_ENDPOINT_CLASS["GET /admin/health-lab/metrics"], "admin");
    assert.equal(HEALTH_LAB_ENDPOINT_CLASS["POST /health-lab/sync"], "mutation");
    assert.equal(HEALTH_LAB_ENDPOINT_CLASS["POST /health-lab/session"], "mutation");
    assert.equal(HEALTH_LAB_ENDPOINT_CLASS["POST /health-lab/quest"], "mutation");
    assert.equal(HEALTH_LAB_ENDPOINT_CLASS["POST /health-lab/badge"], "mutation");
    assert.equal(HEALTH_LAB_ENDPOINT_CLASS["POST /health-lab/streak"], "mutation");
    assert.equal(HEALTH_LAB_ENDPOINT_CLASS["POST /health-lab/shop"], "mutation");
  });

  it("wires isPremiumNow via assertHealthLabPremium on progression and mutation routes", () => {
    const src = readRoute();
    assert.match(src, /assertHealthLabPremium/);
    assert.match(src, /requireHealthLabPremium/);
    assert.doesNotMatch(src, /hubModuleGate\("hub_health_lab"/);
    const adminIdx = src.indexOf('router.get("/admin/health-lab/metrics"');
    const afterAdmin = src.slice(adminIdx, adminIdx + 400);
    assert.doesNotMatch(afterAdmin, /requireHealthLabPremium/);
    for (const path of [
      "/health-lab/profile/:childId",
      "/health-lab/dashboard/:childId",
      "/health-lab/history/:childId",
      "/health-lab/sync",
      "/health-lab/session",
      "/health-lab/quest",
      "/health-lab/badge",
      "/health-lab/streak",
      "/health-lab/shop",
    ]) {
      const idx = src.indexOf(`"${path}"`);
      assert.ok(idx >= 0, path);
      const window = src.slice(idx, idx + 900);
      assert.match(window, /requireHealthLabPremium/);
    }
  });
});

describe("Health Lab premium API enforcement", { skip: !dbOk }, () => {
  const FREE_USER = `p4-hl-free-${randomUUID()}`;
  const PREMIUM_USER = `p4-hl-prem-${randomUUID()}`;
  const OTHER_USER = `p4-hl-other-${randomUUID()}`;

  let freeChildId = 0;
  let premiumChildId = 0;
  let otherChildId = 0;
  let freeUrl = "";
  let premiumUrl = "";
  let freeServer: ReturnType<express.Express["listen"]>;
  let premiumServer: ReturnType<express.Express["listen"]>;

  function mount(userId: string) {
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
    return app;
  }

  async function seedChild(userId: string, name: string, premium: boolean): Promise<number> {
    if (premium) {
      await db.insert(subscriptionsTable).values({
        userId,
        plan: "monthly",
        status: "active",
        provider: "revenuecat",
        subscriptionState: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    } else {
      await db.insert(subscriptionsTable).values({
        userId,
        plan: "free",
        status: "free",
        provider: "none",
      });
    }
    const rows = await db
      .insert(childrenTable)
      .values({
        userId,
        name,
        age: 5,
        ageMonths: 0,
        schoolStartTime: "08:00",
        schoolEndTime: "14:00",
        goals: "p4-health-lab",
      })
      .returning({ id: childrenTable.id });
    return rows[0]!.id;
  }

  before(async () => {
    freeChildId = await seedChild(FREE_USER, "Free Child", false);
    premiumChildId = await seedChild(PREMIUM_USER, "Premium Child", true);
    otherChildId = await seedChild(OTHER_USER, "Other Child", true);

    const { default: healthLabRouter } = await import("./health-lab.js");
    await new Promise<void>((resolve) => {
      const app = mount(FREE_USER);
      app.use(healthLabRouter);
      freeServer = app.listen(0, () => resolve());
    });
    freeUrl = `http://127.0.0.1:${(freeServer.address() as AddressInfo).port}`;
    await new Promise<void>((resolve) => {
      const app = mount(PREMIUM_USER);
      app.use(healthLabRouter);
      premiumServer = app.listen(0, () => resolve());
    });
    premiumUrl = `http://127.0.0.1:${(premiumServer.address() as AddressInfo).port}`;
  });

  after(async () => {
    await db.delete(healthLabProgressTable).where(eq(healthLabProgressTable.userId, FREE_USER));
    await db.delete(healthLabProgressTable).where(eq(healthLabProgressTable.userId, PREMIUM_USER));
    await db.delete(childrenTable).where(eq(childrenTable.userId, FREE_USER));
    await db.delete(childrenTable).where(eq(childrenTable.userId, PREMIUM_USER));
    await db.delete(childrenTable).where(eq(childrenTable.userId, OTHER_USER));
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, FREE_USER));
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, PREMIUM_USER));
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, OTHER_USER));
    await new Promise<void>((resolve) => freeServer?.close(() => resolve()));
    await new Promise<void>((resolve) => premiumServer?.close(() => resolve()));
  });

  it("free user cannot read progression", async () => {
    const r = await fetch(`${freeUrl}/health-lab/profile/${freeChildId}`);
    assert.equal(r.status, 402);
    const body = (await r.json()) as { error: string };
    assert.equal(body.error, "premium_required");
  });

  it("free user cannot mutate shop or session", async () => {
    const shop = await fetch(`${freeUrl}/health-lab/shop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId: freeChildId,
        coins: 99,
        unlockedAvatarItems: ["hat"],
        clientUpdatedAt: Date.now(),
      }),
    });
    assert.equal(shop.status, 402);

    const session = await fetch(`${freeUrl}/health-lab/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId: freeChildId,
        session: {
          gameId: "breath-control",
          timestamp: Date.now(),
          durationMs: 5000,
          xpEarned: 10,
          xpTier: "bronze",
          score: 10,
        },
        clientUpdatedAt: Date.now(),
      }),
    });
    assert.equal(session.status, 402);
  });

  it("premium user retains Health Lab read and mutation", async () => {
    const get = await fetch(`${premiumUrl}/health-lab/profile/${premiumChildId}`);
    assert.equal(get.status, 200);
    const shop = await fetch(`${premiumUrl}/health-lab/shop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId: premiumChildId,
        coins: 3,
        unlockedAvatarItems: [],
        clientUpdatedAt: Date.now(),
      }),
    });
    assert.equal(shop.status, 200);
    const body = (await shop.json()) as { ok: boolean };
    assert.equal(body.ok, true);
  });

  it("child ownership remains enforced for premium users", async () => {
    const r = await fetch(`${premiumUrl}/health-lab/profile/${otherChildId}`);
    assert.equal(r.status, 404);
    const mutate = await fetch(`${premiumUrl}/health-lab/shop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId: otherChildId,
        coins: 1,
        unlockedAvatarItems: [],
        clientUpdatedAt: Date.now(),
      }),
    });
    assert.equal(mutate.status, 404);
  });
});
