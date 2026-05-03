/**
 * Life Skills route — POST /life-skills/progress smoke test.
 *
 * Mounts the life-skills router behind an inline auth-injection middleware,
 * seeds a child for a synthetic user, marks a real seeded skill as done,
 * then asserts the cross-skill streak / weekly bar reflect the write.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "node:net";
import {
  db,
  childrenTable,
  lifeSkillsProgressTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ageBandForLifeSkills,
  pickDailyLifeSkillTasks,
  formatLifeSkillDate,
} from "@workspace/life-skills";
import lifeSkillsRouter from "./life-skills";

const TEST_USER = `life-skills-test-${randomUUID()}`;
const TEST_AGE = 8;

let server: ReturnType<express.Express["listen"]>;
let baseUrl: string;
let childId: number;

before(async () => {
  const inserted = await db
    .insert(childrenTable)
    .values({
      userId: TEST_USER,
      name: "Test Child",
      age: TEST_AGE,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      goals: "life-skills test",
    })
    .returning({ id: childrenTable.id });
  childId = inserted[0]!.id;

  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as Request).firebaseAuth = {
      userId: TEST_USER,
      email: null,
      emailVerified: false,
      name: null,
      picture: null,
    };
    next();
  });
  app.use(lifeSkillsRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await db
    .delete(lifeSkillsProgressTable)
    .where(eq(lifeSkillsProgressTable.userId, TEST_USER));
  await db.delete(childrenTable).where(eq(childrenTable.userId, TEST_USER));
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("life-skills routes — smoke", () => {
  it("GET /life-skills/today returns tasks + empty streak for a fresh child", async () => {
    const r = await fetch(`${baseUrl}/life-skills/today?childId=${childId}`);
    assert.equal(r.status, 200);
    const body = (await r.json()) as {
      tasks: Array<{ id: string }>;
      streak: { current: number; best: number };
      weeklyBar: Array<{ date: string; completed: boolean }>;
      ageBand: string;
    };
    assert.ok(body.tasks.length > 0, "expected at least one task");
    assert.equal(body.streak.current, 0);
    assert.equal(body.streak.best, 0);
    assert.equal(body.weeklyBar.length, 7);
    assert.equal(body.ageBand, ageBandForLifeSkills(TEST_AGE));
  });

  it("POST /life-skills/progress (done) persists and bumps streak to 1", async () => {
    const today = new Date();
    const dateStr = formatLifeSkillDate(today);
    const ageBand = ageBandForLifeSkills(TEST_AGE);
    const tasks = pickDailyLifeSkillTasks({
      ageBand,
      date: dateStr,
      childKey: childId,
      count: 1,
    });
    const skillId = tasks[0]!.id;

    const r = await fetch(`${baseUrl}/life-skills/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId,
        skillId,
        action: "done",
        date: dateStr,
      }),
    });
    assert.equal(r.status, 200);
    const body = (await r.json()) as {
      streak: { current: number; best: number };
      weeklyBar: Array<{ date: string; completed: boolean }>;
    };
    assert.equal(body.streak.current, 1);
    assert.equal(body.streak.best, 1);
    assert.equal(body.weeklyBar[6]!.date, dateStr);
    assert.equal(body.weeklyBar[6]!.completed, true);

    const rows = await db
      .select()
      .from(lifeSkillsProgressTable)
      .where(eq(lifeSkillsProgressTable.childId, childId));
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.skillId, skillId);
    assert.ok(rows[0]!.completedDates?.includes(dateStr));
  });

  it("POST /life-skills/progress is idempotent — second call doesn't double-count", async () => {
    const today = new Date();
    const dateStr = formatLifeSkillDate(today);
    const ageBand = ageBandForLifeSkills(TEST_AGE);
    const skillId = pickDailyLifeSkillTasks({
      ageBand,
      date: dateStr,
      childKey: childId,
      count: 1,
    })[0]!.id;

    const r = await fetch(`${baseUrl}/life-skills/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, skillId, action: "done", date: dateStr }),
    });
    assert.equal(r.status, 200);
    const rows = await db
      .select()
      .from(lifeSkillsProgressTable)
      .where(eq(lifeSkillsProgressTable.childId, childId));
    const matching = rows.find((row) => row.skillId === skillId);
    assert.ok(matching);
    const occurrences = matching.completedDates?.filter((d) => d === dateStr).length ?? 0;
    assert.equal(occurrences, 1, "completion date must dedupe");
  });

  it("POST /life-skills/progress rejects action=skip (skip is client-only)", async () => {
    const today = new Date();
    const dateStr = formatLifeSkillDate(today);

    const r = await fetch(`${baseUrl}/life-skills/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, skillId: "kid-time-1", action: "skip", date: dateStr }),
    });
    assert.equal(r.status, 400, "spec enum no longer permits 'skip'");
  });

  it("GET /life-skills/role-plays returns scenarios for the requested age band", async () => {
    const r = await fetch(`${baseUrl}/life-skills/role-plays?ageBand=kid`);
    assert.equal(r.status, 200);
    const body = (await r.json()) as Array<{ id: string; ageBand: string }>;
    assert.ok(body.length > 0);
    assert.ok(body.every((rp) => rp.ageBand === "kid"));
  });
});
