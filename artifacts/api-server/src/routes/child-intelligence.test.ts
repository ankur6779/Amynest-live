/**
 * Adaptive Family Intelligence — child-intelligence routes smoke test.
 *
 * Mounts the child-intelligence router behind an inline auth-injection
 * middleware and exercises the full read → set goals → log signal → re-read
 * loop against the real database.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import { db, childrenTable, childDailySignalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import childIntelligenceRouter from "./child-intelligence";
import { deriveEnergyProfile } from "../services/childIntelligenceService";

const TEST_USER = `child-intel-test-${randomUUID()}`;

let server: ReturnType<express.Express["listen"]>;
let baseUrl: string;
let childId: number;
let otherChildId: number;

before(async () => {
  const inserted = await db
    .insert(childrenTable)
    .values({
      userId: TEST_USER,
      name: "Test Child",
      age: 7,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "child-intelligence test",
    })
    .returning({ id: childrenTable.id });
  childId = inserted[0]!.id;

  // A second child owned by a *different* user to verify ownership checks.
  const other = await db
    .insert(childrenTable)
    .values({
      userId: `other-${randomUUID()}`,
      name: "Other Child",
      age: 6,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "other",
    })
    .returning({ id: childrenTable.id });
  otherChildId = other[0]!.id;

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
  app.use(childIntelligenceRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await db.delete(childDailySignalsTable).where(eq(childDailySignalsTable.childId, childId));
  await db.delete(childrenTable).where(eq(childrenTable.id, childId));
  await db.delete(childrenTable).where(eq(childrenTable.id, otherChildId));
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("child-intelligence routes — smoke", () => {
  it("GET returns an empty snapshot for a fresh child", async () => {
    const res = await fetch(`${baseUrl}/child-intelligence/${childId}`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      childId: number;
      parentGoals: string[];
      energyProfile: unknown;
      recentSignals: unknown[];
    };
    assert.equal(body.childId, childId);
    assert.deepEqual(body.parentGoals, []);
    assert.deepEqual(body.recentSignals, []);
  });

  it("PUT goals replaces parent goals and de-duplicates unknown values", async () => {
    const res = await fetch(`${baseUrl}/child-intelligence/${childId}/goals`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        parentGoals: ["improve_sleep", "improve_focus", "improve_sleep"],
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { parentGoals: string[] };
    assert.deepEqual(body.parentGoals.sort(), ["improve_focus", "improve_sleep"]);
  });

  it("POST signal upserts and shows up in recentSignals", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`${baseUrl}/child-intelligence/${childId}/signal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: today,
        mood: 4,
        focusScore: 3,
        sleepQuality: 4,
        completionPct: 75,
        screenMinutes: 30,
        tantrumCount: 0,
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      recentSignals: Array<{ date: string; mood: number | null }>;
    };
    const today_ = body.recentSignals.find((s) => s.date === today);
    assert.ok(today_, "today's signal should appear in recentSignals");
    assert.equal(today_!.mood, 4);
  });

  it("re-POST same date updates fields and preserves omitted ones", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`${baseUrl}/child-intelligence/${childId}/signal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: today, mood: 2 }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      recentSignals: Array<{
        date: string;
        mood: number | null;
        sleepQuality: number | null;
      }>;
    };
    const today_ = body.recentSignals.find((s) => s.date === today)!;
    assert.equal(today_.mood, 2);
    assert.equal(today_.sleepQuality, 4, "omitted sleepQuality should be preserved");
  });

  it("returns 404 for a child the caller does not own", async () => {
    const res = await fetch(`${baseUrl}/child-intelligence/${otherChildId}`);
    assert.equal(res.status, 404);
  });

  it("rejects unknown goal codes via zod (400)", async () => {
    const res = await fetch(`${baseUrl}/child-intelligence/${childId}/goals`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parentGoals: ["not_a_real_goal"] }),
    });
    assert.equal(res.status, 400);
  });

  it("GET weekly-report returns rollup with averages, deltas, goalProgress", async () => {
    const res = await fetch(`${baseUrl}/child-intelligence/${childId}/weekly-report`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      childId: number;
      rangeStart: string;
      rangeEnd: string;
      signalDays: number;
      streakDays: number;
      averages: Record<string, number | null>;
      deltas: Record<string, number | null>;
      goalProgress: Array<{ goal: string; direction: string; note: string }>;
    };
    assert.equal(body.childId, childId);
    assert.ok(typeof body.signalDays === "number");
    assert.ok("mood" in body.averages);
    assert.ok("mood" in body.deltas);
    assert.ok(Array.isArray(body.goalProgress));
  });

  it("GET weekly-report returns 404 for a child the caller does not own", async () => {
    const res = await fetch(`${baseUrl}/child-intelligence/${otherChildId}/weekly-report`);
    assert.equal(res.status, 404);
  });

  it("GET insights returns riskWindows + correlations arrays", async () => {
    const res = await fetch(`${baseUrl}/child-intelligence/${childId}/insights`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      childId: number;
      riskWindows: unknown[];
      correlations: unknown[];
    };
    assert.equal(body.childId, childId);
    assert.ok(Array.isArray(body.riskWindows));
    assert.ok(Array.isArray(body.correlations));
  });

  it("GET insights returns 404 for a child the caller does not own", async () => {
    const res = await fetch(`${baseUrl}/child-intelligence/${otherChildId}/insights`);
    assert.equal(res.status, 404);
  });

  it("GET learning-weights returns categoryWeights + slotSuccess arrays", async () => {
    const res = await fetch(`${baseUrl}/child-intelligence/${childId}/learning-weights`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      childId: number;
      categoryWeights: unknown[];
      slotSuccess: unknown[];
      lastComputedAt: string;
      sample: number;
    };
    assert.equal(body.childId, childId);
    assert.ok(Array.isArray(body.categoryWeights));
    assert.ok(Array.isArray(body.slotSuccess));
    assert.equal(typeof body.lastComputedAt, "string");
    assert.equal(typeof body.sample, "number");
  });

  it("GET learning-weights returns 404 for a child the caller does not own", async () => {
    const res = await fetch(`${baseUrl}/child-intelligence/${otherChildId}/learning-weights`);
    assert.equal(res.status, 404);
  });
});

describe("deriveEnergyProfile — heuristic", () => {
  it("returns nulls when fewer than 3 samples", () => {
    const p = deriveEnergyProfile([{ sleepQuality: 4, tantrumCount: 0 }]);
    assert.equal(p.sampleCount, 1);
    assert.equal(p.peakFocusStart, null);
    assert.equal(p.calmWindowStart, null);
  });

  it("shifts peak focus later when avg sleepQuality is poor", () => {
    const p = deriveEnergyProfile([
      { sleepQuality: 2, tantrumCount: 0 },
      { sleepQuality: 2, tantrumCount: 0 },
      { sleepQuality: 2, tantrumCount: 0 },
    ]);
    assert.equal(p.peakFocusStart, "10:00");
    assert.equal(p.peakFocusEnd, "12:00");
  });

  it("uses default windows for well-rested low-tantrum samples", () => {
    const p = deriveEnergyProfile([
      { sleepQuality: 5, tantrumCount: 0 },
      { sleepQuality: 4, tantrumCount: 0 },
      { sleepQuality: 5, tantrumCount: 0 },
    ]);
    assert.equal(p.peakFocusStart, "09:00");
    assert.equal(p.lowEnergyStart, "13:00");
    assert.equal(p.calmWindowStart, "19:00");
  });

  it("shifts low-energy window later when avg tantrums > 1", () => {
    const p = deriveEnergyProfile([
      { sleepQuality: 4, tantrumCount: 2 },
      { sleepQuality: 4, tantrumCount: 2 },
      { sleepQuality: 4, tantrumCount: 2 },
    ]);
    assert.equal(p.lowEnergyStart, "15:00");
    assert.equal(p.lowEnergyEnd, "17:00");
  });
});
