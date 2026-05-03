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
  accuracyPctForWindow,
  appendAttempt,
  buildDailyPlan,
  getBasicSubject,
  getAdvancedSubject,
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

const SingleAttempt = z.object({
  childId: z.number().int().positive(),
  subject: z.string().min(1).max(40),
  topicId: z.string().min(1).max(80),
  correct: z.boolean(),
  // Optional client-side timestamp — used when replaying a queued attempt
  // so the rolling 7-day accuracy window stays accurate even if delivery
  // is delayed (offline mobile sessions). Falls back to server `now()`.
  ts: z.string().datetime().optional(),
});
// Clients may post one attempt or a batch (one per question). The cap
// keeps a single request bounded — a Practice/Test session is at most
// ~20 questions, so 50 leaves headroom without inviting abuse.
const AttemptBody = z.union([SingleAttempt, z.array(SingleAttempt).min(1).max(50)]);

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
  const incoming = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  for (const a of incoming) {
    if (!VALID_SUBJECTS.has(a.subject)) {
      res.status(400).json({ error: "unknown_subject" });
      return;
    }
  }
  // All attempts in a single request must target the same child — keeps
  // the ownership check (and DB writes) simple and avoids accidental
  // cross-child writes from a buggy client.
  const childId = incoming[0]!.childId;
  if (incoming.some((a) => a.childId !== childId)) {
    res.status(400).json({ error: "mixed_child_ids" });
    return;
  }

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    // Group by subject so each affected `child_learning_progress` row is
    // loaded + updated exactly once per request, regardless of how many
    // per-question attempts the client batched.
    const bySubject = new Map<string, LearningAttempt[]>();
    for (const a of incoming) {
      const list = bySubject.get(a.subject) ?? [];
      list.push({
        topicId: a.topicId,
        correct: a.correct,
        ts: a.ts ?? new Date().toISOString(),
      });
      bySubject.set(a.subject, list);
    }

    const result: { subject: string; weakTopics: string[]; attemptsCount: number }[] = [];

    for (const [subject, attempts] of bySubject.entries()) {
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

      let merged = parseAttempts(row?.accuracyRecent);
      for (const next of attempts) merged = appendAttempt(merged, next);
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
      result.push({ subject, weakTopics: weak, attemptsCount: merged.length });
    }

    // Back-compat: a single-attempt request returns the original flat
    // shape so existing clients keep working unchanged.
    if (!Array.isArray(parsed.data)) {
      const r = result[0]!;
      res.json({ ok: true, weakTopics: r.weakTopics, attemptsCount: r.attemptsCount });
      return;
    }
    res.json({ ok: true, results: result });
  } catch (err) {
    logger.error(
      `smart-study attempt failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── GET /api/smart-study/insights ───────────────────────────────────────────
//
// Parent-facing summary so parents can see *why* the child's adaptive plan
// looks the way it does — the underlying engine already runs on
// child_learning_progress, this endpoint just exposes the same signals
// (weak topics, 7-day accuracy per subject, yesterday's plan completion)
// in a shape that's directly renderable by the Parent Command Center.

const InsightsQuery = z.object({
  childId: z.coerce.number().int().positive(),
});

router.get("/smart-study/insights", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = InsightsQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }
  const { childId } = parsed.data;

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

    const subjectsForPlan = rows.map((r) => ({
      subject: r.subject,
      attempts: parseAttempts(r.accuracyRecent),
      weakTopics: parseWeakTopics(r.weakTopics),
    }));

    // Per-subject summaries (only for subjects valid in the child's mode so
    // the UI doesn't render stale rows for a subject the child outgrew).
    const packs = mode === "advanced" ? ADVANCED_SUBJECTS : BASIC_SUBJECTS;
    const lookupTopicTitle = (subjectId: string, topicId: string): string => {
      const pack =
        mode === "advanced"
          ? getAdvancedSubject(subjectId)
          : getBasicSubject(subjectId);
      return pack?.topics.find((t) => t.id === topicId)?.title ?? topicId;
    };

    const subjects = packs.map((pack) => {
      const row = rows.find((r) => r.subject === pack.id);
      const attempts = row ? parseAttempts(row.accuracyRecent) : [];
      const weakIds = row ? parseWeakTopics(row.weakTopics) : [];
      const acc = accuracyPctForWindow(attempts);
      return {
        subject: pack.id,
        subjectTitle: pack.title,
        subjectEmoji: pack.emoji,
        accuracyPct: acc?.pct ?? null,
        sampleSize: acc?.sampleSize ?? 0,
        weakTopics: weakIds.map((tid) => ({
          topicId: tid,
          topicTitle: lookupTopicTitle(pack.id, tid),
        })),
      };
    });

    // Yesterday's plan completion: rebuild yesterday's plan deterministically
    // (the engine seeds on date+age so this matches what the child saw) and
    // count topics that have an attempt timestamped on yesterday.
    let yesterday: {
      date: string;
      planSize: number;
      doneCount: number;
      completionPct: number;
    } | null = null;
    if (mode !== "play") {
      const y = new Date();
      y.setUTCDate(y.getUTCDate() - 1);
      const yIso = todayIsoUtc(y);
      const yPlan = buildDailyPlan({
        childAge: child.age ?? 0,
        childClass: child.childClass,
        dateIso: yIso,
        subjects: subjectsForPlan,
      });
      const doneIds = new Set<string>();
      for (const r of rows) {
        for (const a of parseAttempts(r.accuracyRecent)) {
          if (a.ts.slice(0, 10) === yIso) doneIds.add(a.topicId);
        }
      }
      const doneCount = yPlan.items.filter((it) => doneIds.has(it.topicId)).length;
      yesterday = {
        date: yIso,
        planSize: yPlan.items.length,
        doneCount,
        completionPct: planCompletionPct(yPlan, doneIds),
      };
    }

    const hasData = rows.length > 0;

    res.json({
      childId: child.id,
      childName: child.name,
      mode,
      hasData,
      subjects,
      yesterday,
    });
  } catch (err) {
    logger.error(
      `smart-study insights failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
