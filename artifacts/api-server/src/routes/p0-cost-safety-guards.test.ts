/**
 * P0 cost safety — quota enforcement on speech transcribe, spelling AI, abacus tutor.
 */
import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import { eq, and } from "drizzle-orm";
import {
  db,
  childrenTable,
  subscriptionsTable,
  usageDailyTable,
} from "@workspace/db";
import { isDbIntegrationAvailable } from "../test/db-integration.js";
import {
  FREE_FEATURE_LIMITS,
  speechTranscribeDailyLimit,
} from "../services/subscriptionService.js";

const __dir = dirname(fileURLToPath(import.meta.url));

function readRouteSource(name: string): string {
  return readFileSync(join(__dir, name), "utf8");
}

describe("P0 cost safety — route wiring", () => {
  it("speech transcribe uses speechTranscribeGate", () => {
    const src = readRouteSource("speech.ts");
    assert.match(src, /router\.post\("\/speech\/transcribe", speechTranscribeGate\(\)/);
  });

  it("spelling ai-generate uses aiUsageGate", () => {
    const src = readRouteSource("spelling.ts");
    assert.match(src, /router\.post\("\/spelling\/ai-generate", aiUsageGate/);
  });

  it("abacus tutor uses aiUsageGate", () => {
    const src = readRouteSource("abacus.ts");
    // hubModuleGate (premium) + infant explore + AI usage — order may gain gates; all required.
    assert.match(src, /router\.post\(\s*"\/abacus\/tutor"/);
    assert.match(src, /hubModuleGate\("hub_abacus"/);
    assert.match(src, /infantExploreMutationGate\(\)/);
    assert.match(src, /aiUsageGate/);
  });
});

const dbIntegrationOk = await isDbIntegrationAvailable();

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function seedFreeUser(userId: string): Promise<number> {
  await db.insert(subscriptionsTable).values({
    userId,
    plan: "free",
    status: "free",
    provider: "none",
  });
  const child = await db
    .insert(childrenTable)
    .values({
      userId,
      name: "Quota Test Child",
      age: 6,
      ageMonths: 0,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "p0-cost-guard",
    })
    .returning({ id: childrenTable.id });
  return child[0]!.id;
}

async function seedPremiumUser(userId: string): Promise<number> {
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(subscriptionsTable).values({
    userId,
    plan: "monthly",
    status: "active",
    provider: "manual",
    currentPeriodEnd: periodEnd,
  });
  const child = await db
    .insert(childrenTable)
    .values({
      userId,
      name: "Premium Child",
      age: 6,
      ageMonths: 0,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "p0-cost-guard",
    })
    .returning({ id: childrenTable.id });
  return child[0]!.id;
}

async function clearUser(userId: string, childId?: number): Promise<void> {
  await db.delete(usageDailyTable).where(eq(usageDailyTable.userId, userId));
  await db.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  if (childId != null) {
    await db.delete(childrenTable).where(eq(childrenTable.id, childId));
  } else {
    await db.delete(childrenTable).where(eq(childrenTable.userId, userId));
  }
}

async function setAiQueryUsage(userId: string, used: number): Promise<void> {
  await db.insert(usageDailyTable).values({
    userId,
    feature: "ai_query",
    day: todayUtc(),
    count: used,
  });
}

async function setSpeechTranscribeUsage(userId: string, used: number): Promise<void> {
  await db.insert(usageDailyTable).values({
    userId,
    feature: "speech_transcribe",
    day: todayUtc(),
    count: used,
  });
}

/** Minimal payload that passes transcribe body + length checks after format conversion. */
const FAKE_AUDIO_B64 = Buffer.alloc(200, 1).toString("base64");

describe("P0 cost safety — integration", { skip: !dbIntegrationOk }, () => {
  const FREE_USER = `p0-cost-free-${randomUUID()}`;
  const PREMIUM_USER = `p0-cost-prem-${randomUUID()}`;
  const ABUSE_USER = `p0-cost-abuse-${randomUUID()}`;

  let speechBaseUrl: string;
  let spellingBaseUrl: string;
  let abacusBaseUrl: string;
  let speechServer: ReturnType<express.Express["listen"]>;
  let spellingServer: ReturnType<express.Express["listen"]>;
  let abacusServer: ReturnType<express.Express["listen"]>;
  let freeChildId: number;
  let premiumChildId: number;
  let abuseChildId: number;

  before(async () => {
    mock.module("@workspace/integrations-openai-ai-server", {
      namedExports: {
        ensureCompatibleFormat: async (buf: Buffer) => ({
          buffer: buf,
          format: "wav" as const,
        }),
        speechToText: async () => "test transcript",
        openai: {},
      },
    });

    mock.module("../lib/route-ai-queue.js", {
      namedExports: {
        submitRouteAiJob: async (opts: {
          res: Response;
          buildSyncBody: (r: unknown) => unknown;
          routeName: string;
        }) => {
          if (opts.routeName === "speech/transcribe") {
            opts.res.status(200).json(opts.buildSyncBody({ text: "hello" }));
            return;
          }
          if (opts.routeName === "spelling/ai-generate") {
            opts.res
              .status(200)
              .json(
                opts.buildSyncBody({
                  ok: true,
                  words: [{ word: "cat", syllables: ["cat"], chunks: ["c", "at"], hint: "pet" }],
                  source: "ai",
                }),
              );
            return;
          }
          if (opts.routeName === "abacus/tutor") {
            opts.res.status(200).json(opts.buildSyncBody({ ok: true, reply: "mock tutor" }));
            return;
          }
          opts.res.status(500).json({ error: "unmocked_route" });
        },
      },
    });

    freeChildId = await seedFreeUser(FREE_USER);
    premiumChildId = await seedPremiumUser(PREMIUM_USER);
    abuseChildId = await seedFreeUser(ABUSE_USER);

    const noopLog = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      trace: () => {},
      fatal: () => {},
      child: () => noopLog,
    };

    const mount = (userId: string, router: express.Router, prefix = "") => {
      const app = express();
      app.use(express.json({ limit: "2mb" }));
      app.use((req: Request, _res: Response, next: NextFunction) => {
        req.firebaseAuth = {
          userId,
          email: null,
          emailVerified: false,
          phoneNumber: null,
          name: null,
          picture: null,
        };
        (req as unknown as { log: typeof noopLog }).log = noopLog;
        next();
      });
      if (prefix) app.use(prefix, router);
      else app.use(router);
      return app;
    };

    const { default: speechRouter } = await import("./speech.js");
    const { default: spellingRouter } = await import("./spelling.js");
    const { default: abacusRouter } = await import("./abacus.js");

    await new Promise<void>((resolve) => {
      speechServer = mount(FREE_USER, speechRouter).listen(0, () => resolve());
    });
    speechBaseUrl = `http://127.0.0.1:${(speechServer.address() as AddressInfo).port}`;

    await new Promise<void>((resolve) => {
      spellingServer = mount(FREE_USER, spellingRouter).listen(0, () => resolve());
    });
    spellingBaseUrl = `http://127.0.0.1:${(spellingServer.address() as AddressInfo).port}`;

    await new Promise<void>((resolve) => {
      abacusServer = mount(FREE_USER, abacusRouter, "/api").listen(0, () => resolve());
    });
    abacusBaseUrl = `http://127.0.0.1:${(abacusServer.address() as AddressInfo).port}`;
  });

  after(async () => {
    await clearUser(FREE_USER, freeChildId);
    await clearUser(PREMIUM_USER, premiumChildId);
    await clearUser(ABUSE_USER, abuseChildId);
    await new Promise<void>((resolve) => speechServer?.close(() => resolve()));
    await new Promise<void>((resolve) => spellingServer?.close(() => resolve()));
    await new Promise<void>((resolve) => abacusServer?.close(() => resolve()));
    mock.restoreAll();
  });

  it("speech transcribe allows requests under the free daily cap", async () => {
    await db.delete(usageDailyTable).where(eq(usageDailyTable.userId, FREE_USER));
    const r = await fetch(`${speechBaseUrl}/speech/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: FAKE_AUDIO_B64 }),
    });
    assert.equal(r.status, 200);
    const body = (await r.json()) as { transcript: string };
    assert.equal(body.transcript, "hello");
  });

  it("speech transcribe returns 402 when free daily limit is exhausted", async () => {
    await db.delete(usageDailyTable).where(eq(usageDailyTable.userId, FREE_USER));
    await setSpeechTranscribeUsage(FREE_USER, FREE_FEATURE_LIMITS.speech_transcribe);
    const r = await fetch(`${speechBaseUrl}/speech/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: FAKE_AUDIO_B64 }),
    });
    assert.equal(r.status, 402);
    const body = (await r.json()) as { error: string; feature: string };
    assert.equal(body.error, "feature_locked");
    assert.equal(body.feature, "speech_transcribe");
  });

  it("premium users get a higher speech transcribe allowance", async () => {
    const premiumLimit = speechTranscribeDailyLimit(true);
    assert.ok(premiumLimit > FREE_FEATURE_LIMITS.speech_transcribe);

    await clearUser(PREMIUM_USER, premiumChildId);
    premiumChildId = await seedPremiumUser(PREMIUM_USER);
    await setSpeechTranscribeUsage(PREMIUM_USER, FREE_FEATURE_LIMITS.speech_transcribe);

    const app = express();
    app.use(express.json({ limit: "2mb" }));
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.firebaseAuth = {
        userId: PREMIUM_USER,
        email: null,
        emailVerified: false,
        phoneNumber: null,
        name: null,
        picture: null,
      };
      next();
    });
    const { default: speechRouter } = await import("./speech.js");
    app.use(speechRouter);

    const server = await new Promise<ReturnType<express.Express["listen"]>>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const r = await fetch(`${url}/speech/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: FAKE_AUDIO_B64 }),
    });
    assert.equal(r.status, 200, "premium user should pass above free-tier cap");

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("spelling ai-generate succeeds then 402s when ai_query is exhausted", async () => {
    await db.delete(usageDailyTable).where(eq(usageDailyTable.userId, FREE_USER));
    const ok = await fetch(`${spellingBaseUrl}/spelling/ai-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ age: "6-7", difficulty: "easy", count: 3 }),
    });
    assert.equal(ok.status, 200);

    await setAiQueryUsage(FREE_USER, FREE_FEATURE_LIMITS.ai_query);
    const blocked = await fetch(`${spellingBaseUrl}/spelling/ai-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ age: "6-7", difficulty: "easy", count: 3 }),
    });
    assert.equal(blocked.status, 402);
    const body = (await blocked.json()) as { feature: string };
    assert.equal(body.feature, "ai_query");
  });

  it("abacus tutor succeeds then 402s when ai_query is exhausted", async () => {
    await db.delete(usageDailyTable).where(eq(usageDailyTable.userId, FREE_USER));
    const ok = await fetch(`${abacusBaseUrl}/api/abacus/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId: freeChildId,
        level: 1,
        language: "en",
        question: "How do I show 7?",
      }),
    });
    assert.equal(ok.status, 200);

    await setAiQueryUsage(FREE_USER, FREE_FEATURE_LIMITS.ai_query);
    const blocked = await fetch(`${abacusBaseUrl}/api/abacus/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId: freeChildId,
        level: 1,
        language: "en",
        question: "Another question?",
      }),
    });
    assert.equal(blocked.status, 402);
    const body = (await blocked.json()) as { feature: string };
    assert.equal(body.feature, "ai_query");
  });

  it("rapid parallel transcribe attempts cannot exceed the free daily cap", async () => {
    await db.delete(usageDailyTable).where(eq(usageDailyTable.userId, ABUSE_USER));

    const app = express();
    app.use(express.json({ limit: "2mb" }));
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.firebaseAuth = {
        userId: ABUSE_USER,
        email: null,
        emailVerified: false,
        phoneNumber: null,
        name: null,
        picture: null,
      };
      next();
    });
    const { default: speechRouter } = await import("./speech.js");
    app.use(speechRouter);
    const server = await new Promise<ReturnType<express.Express["listen"]>>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const limit = FREE_FEATURE_LIMITS.speech_transcribe;
    const attempts = Array.from({ length: limit + 5 }, () =>
      fetch(`${url}/speech/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: FAKE_AUDIO_B64 }),
      }),
    );
    const results = await Promise.all(attempts);
    const okCount = results.filter((r) => r.status === 200).length;
    const blockedCount = results.filter((r) => r.status === 402).length;
    assert.equal(okCount, limit);
    assert.ok(blockedCount >= 5);

    const rows = await db
      .select()
      .from(usageDailyTable)
      .where(
        and(
          eq(usageDailyTable.userId, ABUSE_USER),
          eq(usageDailyTable.feature, "speech_transcribe"),
          eq(usageDailyTable.day, todayUtc()),
        ),
      );
    assert.equal(rows[0]?.count ?? 0, limit);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
