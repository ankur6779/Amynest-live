/**
 * Amy Speech Coach — route regression tests.
 *
 * Exercises the real Express router from `./speech.ts` against an in-memory
 * mock of `@workspace/db`, `../lib/auth`, and `../services/subscriptionService`
 * so we can run the full request/response pipeline without a live database
 * or Firebase.
 *
 * Coverage:
 *   1. GET  /api/speech/milestones
 *      - 401 unauthenticated
 *      - 400 invalid query
 *      - 404 child not owned by user
 *      - 200 returns milestones for the band, joined with persisted statuses
 *   2. POST /api/speech/milestones/:id/status
 *      - 200 happy path (insert + on-conflict update)
 *   3. POST /api/speech/practice/log (gated by hub_speech_pronounce)
 *      - 201 happy path on first call
 *      - 402 payment_required on the second call (free lifetime cap = 1)
 *   4. POST /api/speech/expert-waitlist
 *      - 200 first call inserts (alreadyJoined: false)
 *      - 200 second call returns the existing row (alreadyJoined: true)
 *   5. GET  /api/speech/progress
 *      - 200 computes weekly score from in-window logs + milestone statuses
 */
import { describe, it, before, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

// ─── In-memory mock state ──────────────────────────────────────────────

type ChildRow = {
  id: number;
  userId: string;
  age: number | null;
  ageMonths: number | null;
};
type ProgressRow = {
  id: number;
  userId: string;
  childId: number;
  milestoneId: string;
  status: string;
  updatedAt: Date;
  createdAt: Date;
};
type LogRow = {
  id: number;
  userId: string;
  childId: number;
  promptId: string;
  attemptedAt: Date;
  clarityScore: number | null;
  parentNote: string | null;
};
type WaitlistRow = {
  id: number;
  userId: string;
  childId: number | null;
  notes: string | null;
  joinedAt: Date;
};

const state: {
  authUserId: string | null;
  children: ChildRow[];
  progress: ProgressRow[];
  logs: LogRow[];
  waitlist: WaitlistRow[];
  isPremium: boolean;
  featureUsed: Record<string, number>;
  nextProgressId: number;
  nextLogId: number;
  nextWaitlistId: number;
} = {
  authUserId: null,
  children: [],
  progress: [],
  logs: [],
  waitlist: [],
  isPremium: false,
  featureUsed: {},
  nextProgressId: 1,
  nextLogId: 1,
  nextWaitlistId: 1,
};

// Symbol tags so the chainable mock can route to the right table without
// caring about drizzle's actual table shape. Columns are tagged with their
// table+key so the eq/and mocks below can apply real filters.
const col = (t: string, k: string) => ({ __col: `${t}.${k}` });
const CHILDREN_TABLE = {
  __tag: "children",
  id: col("children", "id"),
  userId: col("children", "userId"),
  age: col("children", "age"),
  ageMonths: col("children", "ageMonths"),
} as const;
const PROGRESS_TABLE = {
  __tag: "progress",
  childId: col("progress", "childId"),
  userId: col("progress", "userId"),
  milestoneId: col("progress", "milestoneId"),
} as const;
const LOGS_TABLE = {
  __tag: "logs",
  childId: col("logs", "childId"),
  userId: col("logs", "userId"),
  attemptedAt: col("logs", "attemptedAt"),
} as const;
const WAITLIST_TABLE = {
  __tag: "waitlist",
  userId: col("waitlist", "userId"),
} as const;

function tableOf(t: unknown): string {
  if (t === CHILDREN_TABLE) return "children";
  if (t === PROGRESS_TABLE) return "progress";
  if (t === LOGS_TABLE) return "logs";
  if (t === WAITLIST_TABLE) return "waitlist";
  return "unknown";
}

// ─── Chainable db mock ─────────────────────────────────────────────────

type Predicate = { col: string; val: unknown } | null;

function collectPredicates(node: any, out: Predicate[]): void {
  if (!node) return;
  if (node.__op === "eq" && node.a && typeof node.a.__col === "string") {
    out.push({ col: node.a.__col, val: node.b });
    return;
  }
  if (node.__op === "and" && Array.isArray(node.args)) {
    for (const a of node.args) collectPredicates(a, out);
    return;
  }
  if (node.__op === "gte" && node.a && typeof node.a.__col === "string") {
    // Range predicates aren't needed for filtering — the only gte usage
    // is on attemptedAt for the weekly window, and the test seeds rows
    // already inside that window.
    return;
  }
}

function applyPreds<T extends Record<string, unknown>>(
  rows: T[],
  preds: Predicate[],
  tag: string,
): T[] {
  if (preds.length === 0) return rows;
  return rows.filter((r) =>
    preds.every((p) => {
      if (!p) return true;
      const [t, key] = p.col.split(".");
      if (t !== tag) return true;
      return r[key as keyof T] === p.val;
    }),
  );
}

function makeSelectChain(_columns: unknown, table: unknown) {
  const tag = tableOf(table);
  const rowsFor = (preds: Predicate[]): unknown[] => {
    if (tag === "children") return applyPreds(state.children, preds, tag);
    if (tag === "progress") return applyPreds(state.progress, preds, tag);
    if (tag === "logs") return applyPreds(state.logs, preds, tag);
    if (tag === "waitlist") return applyPreds(state.waitlist, preds, tag);
    return [];
  };
  // The route uses both `.where(...).limit(1)` and bare `.where(...)`
  // (await-thenable). Support both.
  const whereThenable = (whereArg: unknown) => {
    const preds: Predicate[] = [];
    collectPredicates(whereArg, preds);
    const chain: any = {
      limit: async () => rowsFor(preds),
      then: (resolve: (rows: unknown[]) => void) => resolve(rowsFor(preds)),
    };
    return chain;
  };
  return {
    from: () => ({
      where: (whereArg: unknown) => whereThenable(whereArg),
    }),
  };
}

function makeInsertChain(table: unknown) {
  const tag = tableOf(table);
  return {
    values: (vals: Record<string, unknown>) => {
      const chain = {
        onConflictDoUpdate: (opts: { set?: Record<string, unknown> }) => ({
          returning: async () => doInsertOrUpdate(tag, vals, opts.set ?? {}),
        }),
        returning: async () => doInsertOrUpdate(tag, vals, null),
      };
      return chain;
    },
  };
}

function doInsertOrUpdate(
  tag: string,
  vals: Record<string, unknown>,
  setOnConflict: Record<string, unknown> | null,
): unknown[] {
  const now = new Date();
  if (tag === "progress") {
    const childId = Number(vals["childId"]);
    const milestoneId = String(vals["milestoneId"]);
    const existing = state.progress.find(
      (r) => r.childId === childId && r.milestoneId === milestoneId,
    );
    if (existing) {
      if (setOnConflict) {
        if (typeof setOnConflict["status"] === "string") {
          existing.status = String(setOnConflict["status"]);
        }
        existing.updatedAt =
          (setOnConflict["updatedAt"] as Date | undefined) ?? now;
      }
      return [existing];
    }
    const row: ProgressRow = {
      id: state.nextProgressId++,
      userId: String(vals["userId"]),
      childId,
      milestoneId,
      status: String(vals["status"]),
      updatedAt: now,
      createdAt: now,
    };
    state.progress.push(row);
    return [row];
  }
  if (tag === "logs") {
    const row: LogRow = {
      id: state.nextLogId++,
      userId: String(vals["userId"]),
      childId: Number(vals["childId"]),
      promptId: String(vals["promptId"]),
      attemptedAt: (vals["attemptedAt"] as Date | undefined) ?? now,
      clarityScore:
        vals["clarityScore"] == null ? null : Number(vals["clarityScore"]),
      parentNote:
        vals["parentNote"] == null ? null : String(vals["parentNote"]),
    };
    state.logs.push(row);
    return [row];
  }
  if (tag === "waitlist") {
    const userId = String(vals["userId"]);
    const existing = state.waitlist.find((r) => r.userId === userId);
    if (existing) {
      if (setOnConflict) {
        existing.childId =
          setOnConflict["childId"] == null
            ? null
            : Number(setOnConflict["childId"]);
        existing.notes =
          setOnConflict["notes"] == null
            ? null
            : String(setOnConflict["notes"]);
      }
      return [existing];
    }
    const row: WaitlistRow = {
      id: state.nextWaitlistId++,
      userId,
      childId: vals["childId"] == null ? null : Number(vals["childId"]),
      notes: vals["notes"] == null ? null : String(vals["notes"]),
      joinedAt: now,
    };
    state.waitlist.push(row);
    return [row];
  }
  return [];
}

const dbMock = {
  select: (cols?: unknown) => ({
    from: (table: unknown) => makeSelectChain(cols, table).from(),
  }),
  insert: (table: unknown) => makeInsertChain(table),
};

// ─── Module mocks (must run BEFORE importing the router) ───────────────

mock.module("@workspace/db", {
  namedExports: {
    db: dbMock,
    childrenTable: CHILDREN_TABLE,
    speechProgressTable: PROGRESS_TABLE,
    speechPracticeLogTable: LOGS_TABLE,
    speechExpertWaitlistTable: WAITLIST_TABLE,
  },
});

mock.module("../lib/auth", {
  namedExports: {
    getAuth: () => ({
      userId: state.authUserId,
      email: null,
      emailVerified: false,
      phoneNumber: null,
      name: null,
      picture: null,
    }),
  },
});

// drizzle-orm helpers used by the route — return opaque sentinels; the
// in-memory mock ignores them.
mock.module("drizzle-orm", {
  namedExports: {
    and: (...args: unknown[]) => ({ __op: "and", args }),
    eq: (a: unknown, b: unknown) => ({ __op: "eq", a, b }),
    gte: (a: unknown, b: unknown) => ({ __op: "gte", a, b }),
  },
});

mock.module("../middlewares/featureGate", {
  namedExports: {
    featureGate: (feature: string) =>
      async function featureGateMw(
        _req: unknown,
        res: any,
        next: () => void,
      ): Promise<void> {
        if (state.isPremium) {
          next();
          return;
        }
        const used = state.featureUsed[feature] ?? 0;
        if (used >= 1) {
          res.status(402).json({
            error: "feature_locked",
            feature,
            message: "Free trial used. Upgrade to unlock unlimited access.",
            limit: 1,
            used: 1,
            resetsAt: null,
          });
          return;
        }
        state.featureUsed[feature] = used + 1;
        next();
      },
  },
});

// ─── Boot the express app + http server (after mocks installed) ────────

let server: Server;
let baseUrl: string;

async function bootServer(): Promise<void> {
  const express = (await import("express")).default;
  const speechRouter = (await import("./speech")).default;
  const app = express();
  app.use(express.json());
  app.use("/api", speechRouter);
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
}

before(async () => {
  await bootServer();
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
});

beforeEach(() => {
  state.authUserId = "user_test_1";
  state.children = [
    { id: 10, userId: "user_test_1", age: 3, ageMonths: 36 },
    { id: 99, userId: "someone_else", age: 3, ageMonths: 36 },
  ];
  state.progress = [];
  state.logs = [];
  state.waitlist = [];
  state.isPremium = false;
  state.featureUsed = {};
  state.nextProgressId = 1;
  state.nextLogId = 1;
  state.nextWaitlistId = 1;
});

// ─── Helpers ───────────────────────────────────────────────────────────

async function get(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}${path}`);
  const text = await res.text();
  return {
    status: res.status,
    body: text ? JSON.parse(text) : null,
  };
}
async function post(
  path: string,
  body: unknown,
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return {
    status: res.status,
    body: text ? JSON.parse(text) : null,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────

describe("GET /api/speech/milestones", () => {
  it("401 when unauthenticated", async () => {
    state.authUserId = null;
    const r = await get("/api/speech/milestones?childId=10");
    assert.equal(r.status, 401);
  });

  it("400 on missing childId", async () => {
    const r = await get("/api/speech/milestones");
    assert.equal(r.status, 400);
  });

  it("404 when child belongs to another user", async () => {
    const r = await get("/api/speech/milestones?childId=99");
    assert.equal(r.status, 404);
    assert.equal(r.body.error, "child_not_found");
  });

  it("200 returns milestones with status null when none persisted", async () => {
    const r = await get("/api/speech/milestones?childId=10");
    assert.equal(r.status, 200);
    assert.equal(r.body.ageBand, "3y");
    assert.ok(Array.isArray(r.body.items));
    assert.ok(r.body.items.length > 0);
    for (const item of r.body.items) {
      assert.equal(item.status, null);
      assert.equal(item.updatedAt, null);
      assert.equal(item.milestone.ageBand, "3y");
    }
  });

  it("200 joins persisted statuses", async () => {
    const milestones = (await import("@workspace/speech-coach"))
      .SPEECH_MILESTONES;
    const first3y = milestones.find((m) => m.ageBand === "3y")!;
    state.progress.push({
      id: 1,
      userId: "user_test_1",
      childId: 10,
      milestoneId: first3y.id,
      status: "on_track",
      updatedAt: new Date("2026-04-01T00:00:00Z"),
      createdAt: new Date("2026-04-01T00:00:00Z"),
    });
    const r = await get("/api/speech/milestones?childId=10");
    const matched = r.body.items.find(
      (it: any) => it.milestone.id === first3y.id,
    );
    assert.equal(matched.status, "on_track");
    assert.equal(matched.updatedAt, "2026-04-01T00:00:00.000Z");
  });
});

describe("POST /api/speech/milestones/:id/status", () => {
  it("upserts a milestone status", async () => {
    const milestones = (await import("@workspace/speech-coach"))
      .SPEECH_MILESTONES;
    const first3y = milestones.find((m) => m.ageBand === "3y")!;
    const r = await post(`/api/speech/milestones/${first3y.id}/status`, {
      childId: 10,
      status: "needs_attention",
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.status, "needs_attention");
    assert.equal(state.progress.length, 1);
    // Second call updates same row, doesn't create duplicate.
    const r2 = await post(`/api/speech/milestones/${first3y.id}/status`, {
      childId: 10,
      status: "on_track",
    });
    assert.equal(r2.status, 200);
    assert.equal(r2.body.status, "on_track");
    assert.equal(state.progress.length, 1);
  });

  it("404 for unknown milestone id", async () => {
    const r = await post("/api/speech/milestones/m_does_not_exist/status", {
      childId: 10,
      status: "on_track",
    });
    assert.equal(r.status, 404);
  });
});

describe("POST /api/speech/practice/log (gated)", () => {
  it("201 first call, 402 second call for free user", async () => {
    const r1 = await post("/api/speech/practice/log", {
      childId: 10,
      promptId: "p_word_apple",
      clarityScore: 80,
    });
    assert.equal(r1.status, 201);
    assert.equal(r1.body.clarityScore, 80);
    assert.equal(state.logs.length, 1);

    const r2 = await post("/api/speech/practice/log", {
      childId: 10,
      promptId: "p_word_apple",
    });
    assert.equal(r2.status, 402);
    assert.equal(r2.body.error, "feature_locked");
    assert.equal(r2.body.feature, "hub_speech_pronounce");
  });

  it("premium bypasses the gate", async () => {
    state.isPremium = true;
    for (let i = 0; i < 3; i++) {
      const r = await post("/api/speech/practice/log", {
        childId: 10,
        promptId: `p_word_${i}`,
      });
      assert.equal(r.status, 201);
    }
    assert.equal(state.logs.length, 3);
  });
});

describe("POST /api/speech/expert-waitlist (idempotent)", () => {
  it("first call inserts, second returns existing", async () => {
    const r1 = await post("/api/speech/expert-waitlist", {
      childId: 10,
      notes: "Pls notify",
    });
    assert.equal(r1.status, 200);
    assert.equal(r1.body.alreadyJoined, false);
    assert.equal(state.waitlist.length, 1);

    const r2 = await post("/api/speech/expert-waitlist", { childId: 10 });
    assert.equal(r2.status, 200);
    assert.equal(r2.body.alreadyJoined, true);
    assert.equal(r2.body.id, r1.body.id);
    assert.equal(state.waitlist.length, 1);
  });

  it("400 on invalid body", async () => {
    const r = await post("/api/speech/expert-waitlist", { childId: "abc" });
    assert.equal(r.status, 400);
  });
});

describe("GET /api/speech/progress", () => {
  it("computes a weekly score from in-window logs", async () => {
    const milestones = (await import("@workspace/speech-coach"))
      .SPEECH_MILESTONES;
    const first3y = milestones.find((m) => m.ageBand === "3y")!;
    state.progress.push({
      id: 1,
      userId: "user_test_1",
      childId: 10,
      milestoneId: first3y.id,
      status: "on_track",
      updatedAt: new Date(),
      createdAt: new Date(),
    });
    const now = Date.now();
    state.logs = [
      {
        id: 1,
        userId: "user_test_1",
        childId: 10,
        promptId: "p1",
        attemptedAt: new Date(now - 1000 * 60 * 60),
        clarityScore: 80,
        parentNote: null,
      },
      {
        id: 2,
        userId: "user_test_1",
        childId: 10,
        promptId: "p2",
        attemptedAt: new Date(now - 1000 * 60 * 60 * 26),
        clarityScore: 50,
        parentNote: null,
      },
    ];
    const r = await get("/api/speech/progress?childId=10&range=week");
    assert.equal(r.status, 200);
    assert.equal(r.body.range, "week");
    assert.equal(r.body.promptsAttempted, 2);
    assert.equal(r.body.promptsClear, 1);
    assert.equal(r.body.streakDays, 2);
    assert.equal(r.body.milestonesOnTrack, 1);
    assert.ok(typeof r.body.score === "number");
    assert.ok(r.body.score >= 0 && r.body.score <= 100);
  });
});
