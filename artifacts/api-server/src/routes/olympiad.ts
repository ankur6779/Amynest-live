import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { enqueueAiJob } from "../queue/ai-job-queue.js";
import {
  db,
  childrenTable,
  olympiadScoresTable,
  olympiadChildStatsTable,
  parentProfilesTable,
} from "@workspace/db";
import {
  computeOlympiadScore,
  pickDailyQuestions,
  pickDailyQuestionsWeighted,
  pickWeeklyQuestions,
  pickPracticeQuestions,
  pickTrackQuestions,
  pickMockExamQuestions,
  finalizeLocalizedSet,
  aiQuestionsToOlympiad,
  filterExcluded,
  type OlympiadQuestion,
  type OlympiadSubject,
  type OlympiadTrackId,
} from "@workspace/olympiad";
import { normalizeStudyCountry } from "@workspace/study-zone";
import {
  getOrCreateSubscription,
  isPremiumNow,
} from "../services/subscriptionService";
import { runOlympiadHint, localOlympiadHint } from "../services/domain-ai/olympiad-hint.js";
import { runOlympiadInsight } from "../services/domain-ai/olympiad-insight.js";
import { infantExploreMutationGate } from "../middlewares/infantExploreMutationGate.js";

const router: IRouter = Router();

const ageBandSchema = z.enum(["tiny", "junior", "senior"]);
const difficultySchema = z.enum(["easy", "medium", "hard"]);
const subjectSchema = z.enum(["math", "science", "reasoning", "gk"]);
const runTypeSchema = z.enum(["daily", "weekly", "practice", "mock", "track"]);
const trackIdSchema = z.enum(["nso", "math_olympiad", "gk_olympiad"]);
const kindSchema = z.enum(["daily", "weekly", "practice", "mock", "track"]);

function currentWeekStartUtc(now: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

function weekStartIso(now: Date = new Date()): string {
  const d = currentWeekStartUtc(now);
  return d.toISOString().slice(0, 10);
}

async function loadOwnedChild(childId: number, userId: string) {
  const rows = await db
    .select({
      id: childrenTable.id,
      name: childrenTable.name,
      age: childrenTable.age,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

async function resolveUserCountry(userId: string, override?: string): Promise<string> {
  if (override) return normalizeStudyCountry(override);
  const rows = await db
    .select({ country: parentProfilesTable.country })
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, userId))
    .limit(1);
  return normalizeStudyCountry(rows[0]?.country);
}

async function generateOlympiadWithAi(
  input: {
    ageBand: z.infer<typeof ageBandSchema>;
    difficulty: z.infer<typeof difficultySchema>;
    subject: OlympiadSubject | "mixed";
    country: string;
    ageYears: number;
    count: number;
    excludeIds: string[];
  },
  userId: string,
): Promise<Array<{
  subject: OlympiadSubject;
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}> | null> {
  try {
    const { wrapJobInput } = await import("../queue/ai-job-payload.js");
    const enqueued = await enqueueAiJob(
      "olympiad.next_questions",
      userId,
      wrapJobInput("olympiad/next-questions", input),
    );
    if (!enqueued.jobId) return null;
    const { waitForJobResult } = await import("../queue/index.js");
    const { isBullMqActive } = await import("../queue/ai-job-queue.js");
    const { waitForJob } = await import("../queue/ai-job-store.js");
    const finished = isBullMqActive()
      ? await waitForJobResult(enqueued.jobId, 8000)
      : await waitForJob(enqueued.jobId, 8000);
    if (finished?.status !== "completed" || !finished.result) return null;
    const body = finished.result as {
      questions: Array<{
        subject: OlympiadSubject;
        question: string;
        options: string[];
        answer: string;
        explanation?: string;
      }>;
    };
    return body.questions?.length ? body.questions : null;
  } catch (err) {
    logger.warn(
      `olympiad AI generation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

function maskDisplayName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 1) return "Champ";
  return `${trimmed.charAt(0)}***`;
}

export { computeOlympiadScore };

// ─── POST /api/olympiad/score ────────────────────────────────────────────────

const SubmitScoreBody = z.object({
  childId: z.number().int().positive(),
  ageBand: ageBandSchema,
  runType: runTypeSchema,
  trackId: trackIdSchema.optional(),
  questionsAttempted: z.number().int().min(1).max(30),
  questionsCorrect: z.number().int().min(0),
  durationSec: z.number().int().min(1).max(7200),
});

router.post("/olympiad/score", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = SubmitScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const body = parsed.data;
  if (body.questionsCorrect > body.questionsAttempted) {
    res.status(400).json({ error: "invalid_score" });
    return;
  }

  const child = await loadOwnedChild(body.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const accuracyPct =
    body.questionsAttempted === 0
      ? 0
      : Math.round((body.questionsCorrect / body.questionsAttempted) * 100);

  const score = computeOlympiadScore(
    body.runType,
    body.questionsCorrect,
    body.questionsAttempted,
    body.durationSec,
  );

  try {
    const [row] = await db
      .insert(olympiadScoresTable)
      .values({
        childId: body.childId,
        userId,
        ageBand: body.ageBand,
        runType: body.runType,
        trackId: body.trackId ?? null,
        questionsAttempted: body.questionsAttempted,
        questionsCorrect: body.questionsCorrect,
        accuracyPct,
        durationSec: body.durationSec,
        score,
        weekStart: weekStartIso(),
      })
      .returning({
        id: olympiadScoresTable.id,
        score: olympiadScoresTable.score,
      });

    res.json({ ok: true, id: row!.id, score: row!.score });
  } catch (err) {
    logger.error(
      `olympiad score insert failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── Leaderboard aggregation ─────────────────────────────────────────────────

type LeaderboardQuery = {
  ageBand: z.infer<typeof ageBandSchema>;
  childId: number;
  limit: number;
  scope: "family" | "global";
  userId: string;
};

async function buildLeaderboard(q: LeaderboardQuery) {
  const week = weekStartIso();
  const child = await loadOwnedChild(q.childId, q.userId);
  if (!child) return null;

  const weeklySum = sql<number>`COALESCE(SUM(${olympiadScoresTable.score}), 0)`;

  const baseQuery = db
    .select({
      childId: childrenTable.id,
      name: childrenTable.name,
      points: weeklySum,
    })
    .from(childrenTable)
    .leftJoin(
      olympiadScoresTable,
      and(
        eq(olympiadScoresTable.childId, childrenTable.id),
        eq(olympiadScoresTable.ageBand, q.ageBand),
        eq(olympiadScoresTable.weekStart, week),
      ),
    )
    .groupBy(childrenTable.id, childrenTable.name)
    .orderBy(desc(weeklySum), desc(childrenTable.id));

  const rows =
    q.scope === "family"
      ? await baseQuery
          .where(eq(childrenTable.userId, q.userId))
          .limit(Math.max(q.limit, 20))
      : await baseQuery.having(sql`${weeklySum} > 0`).limit(Math.max(q.limit, 50));

  const ranked = rows.map((r, i) => ({
    rank: i + 1,
    childId: r.childId,
    name: q.scope === "global" ? maskDisplayName(r.name) : r.name,
    points: Number(r.points ?? 0),
    isMe: r.childId === q.childId,
  }));

  const me =
    ranked.find((r) => r.isMe) ?? {
      rank: ranked.length + 1,
      childId: q.childId,
      name: q.scope === "global" ? maskDisplayName(child.name) : child.name,
      points: 0,
      isMe: true,
    };

  return {
    weekStart: week,
    top: ranked.slice(0, q.limit),
    me: { rank: me.rank, points: me.points, total: ranked.length },
  };
}

const LeaderboardQuerySchema = z.object({
  ageBand: ageBandSchema,
  childId: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

router.get("/olympiad/leaderboard/family", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = LeaderboardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const result = await buildLeaderboard({
    ...parsed.data,
    scope: "family",
    userId,
  });
  if (!result) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }
  res.json({ ok: true, ...result });
});

router.get("/olympiad/leaderboard/global", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = LeaderboardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const result = await buildLeaderboard({
    ...parsed.data,
    limit: Math.min(parsed.data.limit ?? 10, 50),
    scope: "global",
    userId,
  });
  if (!result) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }
  res.json({ ok: true, ...result });
});

// ─── POST /api/olympiad/next-questions ─────────────────────────────────────────
//
// Premium: AI-generated fresh MCQs with country context.
// Free: localized static dataset (600+ bank + country GK).
// Response shape matches client OlympiadQuestion (correct = option index).

const NextQuestionsBody = z.object({
  childId: z.number().int().positive(),
  ageBand: ageBandSchema,
  difficulty: difficultySchema,
  kind: kindSchema,
  subject: subjectSchema.optional(),
  trackId: trackIdSchema.optional(),
  count: z.number().int().min(1).max(30).optional(),
  country: z.string().min(2).max(8).optional(),
  dateKey: z.string().optional(),
  excludeIds: z.array(z.string()).max(200).optional(),
  weakSubjects: z.array(subjectSchema).max(4).optional(),
});

function staticPick(input: {
  kind: z.infer<typeof kindSchema>;
  ageBand: z.infer<typeof ageBandSchema>;
  difficulty: z.infer<typeof difficultySchema>;
  childKey: string | number;
  subject?: OlympiadSubject;
  trackId?: OlympiadTrackId;
  count: number;
  dateKey?: string;
  weakSubjects?: OlympiadSubject[];
}): OlympiadQuestion[] {
  const dateKey = input.dateKey ?? weekStartIso();
  switch (input.kind) {
    case "daily":
      return input.weakSubjects?.length
        ? pickDailyQuestionsWeighted(
            input.ageBand,
            input.difficulty,
            dateKey,
            input.childKey,
            input.weakSubjects,
          )
        : pickDailyQuestions(input.ageBand, input.difficulty, dateKey, input.childKey);
    case "weekly":
      return pickWeeklyQuestions(input.ageBand, dateKey, input.childKey);
    case "practice":
      return pickPracticeQuestions(
        input.ageBand,
        input.subject ?? "math",
        input.difficulty,
        input.count,
      );
    case "track":
      return pickTrackQuestions(
        input.ageBand,
        input.trackId ?? "nso",
        input.difficulty,
        input.childKey,
        input.count,
      );
    case "mock":
      return pickMockExamQuestions(input.ageBand, dateKey, input.childKey, input.count);
    default:
      return [];
  }
}

router.post("/olympiad/next-questions", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = NextQuestionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const body = parsed.data;
  const count =
    body.count ??
    (body.kind === "daily" ? 5 : body.kind === "mock" ? 30 : body.kind === "weekly" ? 20 : 10);

  try {
    const child = await loadOwnedChild(body.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const country = await resolveUserCountry(userId, body.country);
    const sub = await getOrCreateSubscription(userId);
    const isPremium = isPremiumNow(sub);
    const exclude = new Set(body.excludeIds ?? []);
    const dateKey = body.dateKey ?? (body.kind === "daily" ? todayIsoUtc() : weekStartIso());

    let source: "ai" | "dataset" = "dataset";

    const staticQs = staticPick({
      kind: body.kind,
      ageBand: body.ageBand,
      difficulty: body.difficulty,
      childKey: body.childId,
      subject: body.subject,
      trackId: body.trackId,
      count,
      dateKey,
      weakSubjects: body.weakSubjects,
    }) as OlympiadQuestion[];

    const localized = finalizeLocalizedSet(
      staticQs,
      country,
      body.ageBand,
      body.difficulty,
      exclude,
    );

    let questions = filterExcluded(localized, exclude).slice(0, count);

    // AI top-up only when the local bank cannot fill the request (after exclusions).
    if (questions.length < count && isPremium) {
      const primarySubject: OlympiadSubject | "mixed" =
        body.kind === "daily"
          ? "mixed"
          : body.subject ??
            (body.trackId === "nso"
              ? "science"
              : body.trackId === "gk_olympiad"
                ? "gk"
                : body.trackId === "math_olympiad"
                  ? "math"
                  : "math");

      const aiRows = await generateOlympiadWithAi(
        {
          ageBand: body.ageBand,
          difficulty: body.difficulty,
          subject: primarySubject,
          country,
          ageYears: child.age ?? 8,
          count: count - questions.length,
          excludeIds: [...exclude, ...questions.map((q) => q.id)],
        },
        userId,
      );
      if (aiRows?.length) {
        const aiQs = aiRows
          .map((row, i) =>
            aiQuestionsToOlympiad(
              [row],
              row.subject,
              body.ageBand,
              body.difficulty,
              country,
              `${body.kind}-${body.childId}-topup-${i}`,
            )[0]!,
          )
          .filter(Boolean);
        const need = count - questions.length;
        questions = [...questions, ...aiQs.slice(0, need)];
        if (questions.length >= count && aiQs.length >= need) {
          source = "ai";
        }
      }
    }

    res.json({
      ok: true,
      source,
      isPremium,
      country,
      questions: questions.slice(0, count).map((q) => ({
        id: q.id,
        subject: q.subject,
        ageBand: q.ageBand,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
      })),
    });
  } catch (err) {
    logger.error(
      `olympiad next-questions failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

function todayIsoUtc(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// ─── GET/POST /api/olympiad/stats ────────────────────────────────────────────

const StatsBody = z.object({
  childId: z.number().int().positive(),
  stats: z.record(z.string(), z.unknown()),
  clientUpdatedAt: z.string().optional(),
});

router.get("/olympiad/stats", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = z
    .object({ childId: z.coerce.number().int().positive() })
    .safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const child = await loadOwnedChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const rows = await db
    .select()
    .from(olympiadChildStatsTable)
    .where(eq(olympiadChildStatsTable.childId, parsed.data.childId))
    .limit(1);

  const row = rows[0];
  res.json({
    ok: true,
    stats: row?.statsJson ?? null,
    clientUpdatedAt: row?.clientUpdatedAt ?? null,
    serverUpdatedAt: row?.updatedAt?.toISOString() ?? null,
  });
});

router.post("/olympiad/stats", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = StatsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const child = await loadOwnedChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const now = new Date();
  const existing = await db
    .select()
    .from(olympiadChildStatsTable)
    .where(eq(olympiadChildStatsTable.childId, parsed.data.childId))
    .limit(1);

  const incomingAt = parsed.data.clientUpdatedAt ?? now.toISOString();
  const existingAt = existing[0]?.clientUpdatedAt;

  if (existingAt && existingAt > incomingAt) {
    res.json({
      ok: true,
      merged: false,
      stats: existing[0]!.statsJson,
      clientUpdatedAt: existingAt,
    });
    return;
  }

  const [row] = await db
    .insert(olympiadChildStatsTable)
    .values({
      childId: parsed.data.childId,
      userId,
      statsJson: parsed.data.stats,
      clientUpdatedAt: incomingAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: olympiadChildStatsTable.childId,
      set: {
        statsJson: parsed.data.stats,
        clientUpdatedAt: incomingAt,
        updatedAt: now,
      },
    })
    .returning({
      statsJson: olympiadChildStatsTable.statsJson,
      clientUpdatedAt: olympiadChildStatsTable.clientUpdatedAt,
    });

  res.json({
    ok: true,
    merged: true,
    stats: row!.statsJson,
    clientUpdatedAt: row!.clientUpdatedAt,
  });
});

// ─── POST /api/olympiad/hint ─────────────────────────────────────────────────

const HintBody = z.object({
  childId: z.number().int().positive(),
  question: z.string().min(1).max(500),
  options: z.array(z.string()).min(2).max(4),
  explanation: z.string().optional(),
  correctOption: z.string().optional(),
  difficulty: difficultySchema.default("easy"),
});

router.post("/olympiad/hint", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = HintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const child = await loadOwnedChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const sub = await getOrCreateSubscription(userId);
  const isPremium = isPremiumNow(sub);

  let hint: string | null = null;
  let source: "ai" | "local" = "local";

  if (isPremium) {
    hint = await runOlympiadHint({
      question: parsed.data.question,
      options: parsed.data.options,
      difficulty: parsed.data.difficulty,
      ageYears: child.age ?? 8,
    });
    if (hint) source = "ai";
  }

  if (!hint) {
    hint = localOlympiadHint(
      parsed.data.explanation ?? "",
      parsed.data.correctOption ?? "",
    );
  }

  res.json({ ok: true, hint, source, isPremium });
});

// ─── POST /api/olympiad/insight ──────────────────────────────────────────────

const InsightBody = z.object({
  childId: z.number().int().positive(),
  totalPoints: z.number().int().min(0),
  streak: z.number().int().min(0),
  overallAccuracyPct: z.number().int().min(0).max(100),
  bySubject: z.record(
    z.string(),
    z.object({ correct: z.number().int().min(0), total: z.number().int().min(0) }),
  ),
});

router.post("/olympiad/insight", infantExploreMutationGate(), async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = InsightBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const child = await loadOwnedChild(parsed.data.childId, userId);
  if (!child) {
    res.status(404).json({ error: "child_not_found" });
    return;
  }

  const sub = await getOrCreateSubscription(userId);
  const isPremium = isPremiumNow(sub);

  const bySubject = parsed.data.bySubject as Record<
    OlympiadSubject,
    { correct: number; total: number }
  >;

  if (!isPremium) {
    res.json({ ok: true, source: "template", isPremium: false });
    return;
  }

  const ai = await runOlympiadInsight({
    childName: child.name,
    ageYears: child.age ?? 8,
    totalPoints: parsed.data.totalPoints,
    streak: parsed.data.streak,
    overallAccuracyPct: parsed.data.overallAccuracyPct,
    bySubject,
  });

  if (!ai) {
    res.json({ ok: true, source: "template", isPremium: true });
    return;
  }

  res.json({ ok: true, source: "ai", isPremium: true, ...ai });
});

export default router;
