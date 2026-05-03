import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import {
  db,
  childrenTable,
  lifeSkillsProgressTable,
} from "@workspace/db";
import {
  GetLifeSkillsTodayQueryParams,
  GetLifeSkillsTodayResponse,
  SetLifeSkillProgressBody,
  SetLifeSkillProgressResponse,
  GetLifeSkillRolePlaysQueryParams,
  GetLifeSkillRolePlaysResponse,
} from "@workspace/api-zod";
import {
  ageBandForLifeSkills,
  pickDailyLifeSkillTasks,
  tasksFor,
  rolePlaysFor,
  computeLifeSkillStreak,
  buildLifeSkillWeeklyBar,
  formatLifeSkillDate,
  type LifeSkillTask,
  type LifeSkillAgeBand,
} from "@workspace/life-skills";

const router: IRouter = Router();

async function getOwnedChild(
  userId: string,
  childId: number,
): Promise<{ id: number; age: number } | null> {
  const rows = await db
    .select({ id: childrenTable.id, age: childrenTable.age })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

function gatherDates(
  rows: Array<{ completedDates: string[] | null }>,
): string[] {
  const out: string[] = [];
  for (const r of rows) {
    if (Array.isArray(r.completedDates)) out.push(...r.completedDates);
  }
  return out;
}

function yesterdayISO(today: Date = new Date()): string {
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  return formatLifeSkillDate(d);
}

router.get("/life-skills/today", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = GetLifeSkillsTodayQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const child = await getOwnedChild(userId, parsed.data.childId);
  if (!child) {
    res.status(404).json({ error: "Child not found" });
    return;
  }

  const today = new Date();
  const dateStr = formatLifeSkillDate(today);
  const ageBand = ageBandForLifeSkills(child.age);

  const rows = await db
    .select()
    .from(lifeSkillsProgressTable)
    .where(eq(lifeSkillsProgressTable.childId, child.id));

  // Recover yesterday's picks so today's picker can rotate categories.
  const yKey = yesterdayISO(today);
  const previousIds: string[] = [];
  for (const r of rows) {
    if (Array.isArray(r.completedDates) && r.completedDates.includes(yKey)) {
      previousIds.push(r.skillId);
    }
  }

  const tasks: LifeSkillTask[] = pickDailyLifeSkillTasks({
    ageBand,
    date: dateStr,
    childKey: child.id,
    count: 2,
    previousIds,
  });

  const completedSkillIds: string[] = [];
  const skippedSkillIds: string[] = [];
  for (const r of rows) {
    if (Array.isArray(r.completedDates) && r.completedDates.includes(dateStr)) {
      completedSkillIds.push(r.skillId);
    }
  }

  const allDates = gatherDates(rows);
  const streak = computeLifeSkillStreak(allDates, today);
  const weeklyBar = buildLifeSkillWeeklyBar(allDates, today);

  res.json(
    GetLifeSkillsTodayResponse.parse({
      ageBand,
      date: dateStr,
      tasks,
      completedSkillIds,
      skippedSkillIds,
      streak,
      weeklyBar,
    }),
  );
});

router.post("/life-skills/progress", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SetLifeSkillProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const child = await getOwnedChild(userId, parsed.data.childId);
  if (!child) {
    res.status(403).json({ error: "Child not found or not yours" });
    return;
  }

  const today = new Date();
  const dateStr =
    typeof parsed.data.date === "string" && parsed.data.date.length >= 10
      ? parsed.data.date.slice(0, 10)
      : formatLifeSkillDate(today);

  // Validate the skill id belongs to a real seeded task. We accept any age
  // band so historical completions still work if a child crosses a band.
  const ageBand = ageBandForLifeSkills(child.age);
  const validIds = new Set<string>();
  for (const band of ["toddler", "preschool", "kid", "teen"] as const) {
    for (const t of tasksFor(band)) validIds.add(t.id);
  }
  if (!validIds.has(parsed.data.skillId)) {
    res.status(400).json({ error: "Unknown skillId" });
    return;
  }

  {
    // Read-modify-write the per-skill row. Rare race conditions resolve to
    // identical state because dedupe-on-set keeps the date list a Set.
    // Only "done" reaches this point — the spec enum no longer permits
    // anything else, and "skip" is a client-only UI hint persisted locally.
    const existing = await db
      .select()
      .from(lifeSkillsProgressTable)
      .where(
        and(
          eq(lifeSkillsProgressTable.childId, child.id),
          eq(lifeSkillsProgressTable.skillId, parsed.data.skillId),
        ),
      )
      .limit(1);

    const prevDates = existing[0]?.completedDates ?? [];
    const dedup = Array.from(new Set([...prevDates, dateStr])).sort();
    const perSkillStreak = computeLifeSkillStreak(dedup, today);

    if (existing[0]) {
      await db
        .update(lifeSkillsProgressTable)
        .set({
          completedDates: dedup,
          currentStreak: perSkillStreak.current,
          bestStreak: Math.max(existing[0].bestStreak, perSkillStreak.best),
          lastCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(lifeSkillsProgressTable.id, existing[0].id));
    } else {
      await db.insert(lifeSkillsProgressTable).values({
        userId,
        childId: child.id,
        skillId: parsed.data.skillId,
        completedDates: dedup,
        currentStreak: perSkillStreak.current,
        bestStreak: perSkillStreak.best,
        lastCompletedAt: new Date(),
      });
    }
  }
  // "skip" is intentionally not persisted — it's a per-day UI hint only and
  // shouldn't affect the streak. Keeping the row absent prevents skips from
  // polluting the cross-skill date set.

  void ageBand;

  // Recompute the cross-skill streak + weekly bar for the response.
  const rows = await db
    .select()
    .from(lifeSkillsProgressTable)
    .where(eq(lifeSkillsProgressTable.childId, child.id));
  const allDates = gatherDates(rows);
  const streak = computeLifeSkillStreak(allDates, today);
  const weeklyBar = buildLifeSkillWeeklyBar(allDates, today);

  res.json(
    SetLifeSkillProgressResponse.parse({
      childId: child.id,
      skillId: parsed.data.skillId,
      date: dateStr,
      action: parsed.data.action,
      streak,
      weeklyBar,
    }),
  );
});

router.get("/life-skills/role-plays", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = GetLifeSkillRolePlaysQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const band: LifeSkillAgeBand = parsed.data.ageBand;
  res.json(GetLifeSkillRolePlaysResponse.parse(rolePlaysFor(band)));
});

// Silence unused-import lint for `sql` if the compiler ever complains.
void sql;

export default router;
