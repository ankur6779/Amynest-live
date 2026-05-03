import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  db,
  childrenTable,
  childLearningProgressTable,
  type ChildLearningProgressRow,
  type LearningAttempt,
} from "@workspace/db";
import {
  appendAttempt,
  buildDailyPlan,
  planCompletionPct,
  recomputeWeakTopics,
  resolveStudyMode,
  BASIC_SUBJECTS,
  ADVANCED_SUBJECTS,
} from "@workspace/study-zone";

const router: IRouter = Router();

const VALID_SUBJECTS = new Set<string>([
  ...BASIC_SUBJECTS.map((s) => s.id),
  ...ADVANCED_SUBJECTS.map((s) => s.id),
]);

// Zod shapes for the JSONB columns on `child_learning_progress`. We parse
// untrusted DB jsonb (which could in theory be empty/legacy/garbled) instead
// of casting through `any` — keeps the route type-safe end-to-end.
const StoredAttemptSchema = z.object({
  topicId: z.string(),
  correct: z.boolean(),
  ts: z.string().default(""),
});
const StoredAttemptsSchema = z.array(StoredAttemptSchema).catch([]);
const StoredWeakTopicsSchema = z.array(z.string()).catch([]);

function parseAttempts(raw: unknown): { topicId: string; correct: boolean; ts: string }[] {
  return StoredAttemptsSchema.parse(Array.isArray(raw) ? raw : []);
}
function parseWeakTopics(raw: unknown): string[] {
  return StoredWeakTopicsSchema.parse(Array.isArray(raw) ? raw : []);
}

async function loadOwnedChild(childId: number, userId: string) {
  const rows = await db
    .select({
      id: childrenTable.id,
      name: childrenTable.name,
      age: childrenTable.age,
      childClass: childrenTable.childClass,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

function todayIsoUtc(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// ─── POST /api/smart-study/daily-plan ────────────────────────────────────────

const PlanBody = z.object({
  childId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.post("/smart-study/daily-plan", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = PlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { childId } = parsed.data;
  const dateIso = parsed.data.date ?? todayIsoUtc();

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    const mode = resolveStudyMode(child.age ?? 0, child.childClass);

    const rows = await db
      .select()
      .from(childLearningProgressTable)
      .where(
        and(
          eq(childLearningProgressTable.childId, childId),
          eq(childLearningProgressTable.userId, userId),
        ),
      );

    const subjects = rows.map((r) => ({
      subject: r.subject,
      // Keep `ts` so the engine's 7-day accuracy window can filter properly.
      attempts: parseAttempts(r.accuracyRecent),
      weakTopics: parseWeakTopics(r.weakTopics),
    }));

    const plan = buildDailyPlan({
      childAge: child.age ?? 0,
      childClass: child.childClass,
      dateIso,
      subjects,
    });

    // Today's done-set: any attempt for a topic recorded today counts.
    const doneTopicIds = new Set<string>();
    for (const r of rows) {
      const attempts = parseAttempts(r.accuracyRecent);
      for (const a of attempts) {
        if (a.ts.slice(0, 10) === dateIso) doneTopicIds.add(a.topicId);
      }
    }
    const completionPct = planCompletionPct(plan, doneTopicIds);

    res.json({
      child: { id: child.id, name: child.name, age: child.age, mode },
      plan,
      completionPct,
      doneTopicIds: Array.from(doneTopicIds),
    });
  } catch (err) {
    logger.error(
      `smart-study daily-plan failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/smart-study/attempt ───────────────────────────────────────────

const AttemptBody = z.object({
  childId: z.number().int().positive(),
  subject: z.string().min(1).max(40),
  topicId: z.string().min(1).max(80),
  correct: z.boolean(),
});

router.post("/smart-study/attempt", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = AttemptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { childId, subject, topicId, correct } = parsed.data;
  if (!VALID_SUBJECTS.has(subject)) {
    res.status(400).json({ error: "unknown_subject" });
    return;
  }

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const existing = await db
      .select()
      .from(childLearningProgressTable)
      .where(
        and(
          eq(childLearningProgressTable.childId, childId),
          eq(childLearningProgressTable.subject, subject),
        ),
      )
      .limit(1);
    const row: ChildLearningProgressRow | undefined = existing[0];

    const prevAttempts = parseAttempts(row?.accuracyRecent);
    const next: LearningAttempt = { topicId, correct, ts: new Date().toISOString() };
    const merged = appendAttempt(prevAttempts, next);
    const weak = recomputeWeakTopics(
      merged.map((a) => ({ topicId: a.topicId, correct: a.correct })),
    );

    if (row) {
      await db
        .update(childLearningProgressTable)
        .set({
          accuracyRecent: merged,
          weakTopics: weak,
          lastActiveAt: new Date(),
          updatedAt: sql`now()`,
        })
        .where(eq(childLearningProgressTable.id, row.id));
    } else {
      await db.insert(childLearningProgressTable).values({
        childId,
        userId,
        subject,
        accuracyRecent: merged,
        weakTopics: weak,
        lastActiveAt: new Date(),
      });
    }

    res.json({ ok: true, weakTopics: weak, attemptsCount: merged.length });
  } catch (err) {
    logger.error(
      `smart-study attempt failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
