import { Router, type IRouter } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { hubModuleGate } from "../middlewares/hubModuleGate.js";
import { infantExploreMutationGate } from "../middlewares/infantExploreMutationGate.js";
import { logger } from "../lib/logger";
import { submitRouteAiJob } from "../lib/route-ai-queue.js";
import { enqueueAiJob } from "../queue/ai-job-queue.js";
import {
  db,
  childrenTable,
  childLearningProgressTable,
  parentProfilesTable,
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
  SMART_SUBJECTS,
  bumpLevel,
  levelForAge,
  pickPracticeQuestions,
  profileFor,
  normalizeStudyCountry,
  getBasicSubjectsForCountry,
  getAdvancedSubjectsForCountry,
  lookupPracticeTitle,
  isTopicPracticeSubject,
  isBasicMathPracticeSubject,
  practicePackForSubject,
  TOPIC_PRACTICE_SUBJECTS,
  type Level,
  type SmartQuestion,
  type SmartSubjectId,
} from "@workspace/study-zone";
import {
  loadStudyZoneRecommendationContext,
  resolveAndPersistFreshLesson,
  getRecommendedNextLessonForTopic,
  getUnseenLessonsForChild,
  completedContentBankLessonIds,
  recordContentBankLessonViewed,
  loadSmartStudyLessonItem,
} from "../services/studyZoneRecommendationService.js";
import { enrichWithAudio } from "../services/contentBankAudio.js";

const router: IRouter = Router();

const VALID_SUBJECTS = new Set<string>([
  ...BASIC_SUBJECTS.map((s) => s.id),
  ...ADVANCED_SUBJECTS.map((s) => s.id),
  ...TOPIC_PRACTICE_SUBJECTS,
]);

const PRACTICE_SUBJECT_IDS = TOPIC_PRACTICE_SUBJECTS;
const SMART_STUDY_PREMIUM_GATE = hubModuleGate("hub_smart_study", {
  premiumOnly: true,
  denyStatus: 403,
});

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
const StoredSeenIdsSchema = z.array(z.string()).catch([]);

function parseAttempts(raw: unknown): { topicId: string; correct: boolean; ts: string }[] {
  return StoredAttemptsSchema.parse(Array.isArray(raw) ? raw : []);
}
function parseWeakTopics(raw: unknown): string[] {
  return StoredWeakTopicsSchema.parse(Array.isArray(raw) ? raw : []);
}
function parseSeenIds(raw: unknown): string[] {
  return StoredSeenIdsSchema.parse(Array.isArray(raw) ? raw : []);
}

const SMART_SUBJECT_IDS = PRACTICE_SUBJECT_IDS;
/** Cap so the seen-set never balloons past ~200 ids (~6 KB) per row. */
const SEEN_ID_CAP = 200;

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

function answerSecret(): string {
  return process.env["SMART_STUDY_ANSWER_SECRET"]
    ?? process.env["SESSION_SECRET"]
    ?? "amynest-smart-study-dev-secret";
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function signAnswerPayload(payload: Record<string, unknown>): string {
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", answerSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyAnswerToken(token: string): Record<string, unknown> | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", answerSecret()).update(body).digest("base64url");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(sig);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function answerMac(questionId: string, answer: string): string {
  return createHmac("sha256", answerSecret())
    .update(`${questionId}:${normalizeAnswer(answer)}`)
    .digest("base64url");
}

function buildAnswerToken(opts: {
  userId: string;
  childId: number;
  subject: string;
  questionId: string;
  answer: string;
}): string {
  return signAnswerPayload({
    userId: opts.userId,
    childId: opts.childId,
    subject: opts.subject,
    questionId: opts.questionId,
    answerMac: answerMac(opts.questionId, opts.answer),
    issuedAt: Date.now(),
  });
}

function gradeAnswerToken(opts: {
  token: string;
  userId: string;
  childId: number;
  subject: string;
  questionId: string;
  selectedAnswer: string;
}): boolean | null {
  const payload = verifyAnswerToken(opts.token);
  if (!payload) return null;
  if (payload["userId"] !== opts.userId) return null;
  if (payload["childId"] !== opts.childId) return null;
  if (payload["subject"] !== opts.subject) return null;
  if (payload["questionId"] !== opts.questionId) return null;
  if (typeof payload["answerMac"] !== "string") return null;
  const expected = answerMac(opts.questionId, opts.selectedAnswer);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(payload["answerMac"]);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
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

// ─── POST /api/smart-study/daily-plan ────────────────────────────────────────

const PlanBody = z.object({
  childId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.post(
  "/smart-study/daily-plan",
  SMART_STUDY_PREMIUM_GATE,
  async (req, res): Promise<void> => {
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
    const country = await resolveUserCountry(userId);

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

    const recCtx = await loadStudyZoneRecommendationContext(userId, childId, dateIso);
    const freshResult = await resolveAndPersistFreshLesson(userId, childId, dateIso);
    const dailyFreshLesson = freshResult?.lesson ?? null;
    const completedBankIds = recCtx
      ? completedContentBankLessonIds(recCtx.completedActivityIds)
      : new Set<string>();

    const plan = buildDailyPlan({
      childAge: child.age ?? 0,
      childClass: child.childClass,
      country,
      dateIso,
      subjects,
      discoveryLesson: dailyFreshLesson
        ? {
            lessonId: dailyFreshLesson.id,
            title: dailyFreshLesson.title,
            subject: dailyFreshLesson.subject,
            subjectEmoji: dailyFreshLesson.subjectEmoji,
            estimatedMinutes: dailyFreshLesson.estimatedMinutes,
          }
        : null,
    });

    // Today's done-set: curriculum attempts today + completed content-bank lessons.
    const doneTopicIds = new Set<string>();
    for (const r of rows) {
      const attempts = parseAttempts(r.accuracyRecent);
      for (const a of attempts) {
        if (a.ts.slice(0, 10) === dateIso) doneTopicIds.add(a.topicId);
      }
    }
    const completionPct = planCompletionPct(plan, doneTopicIds, completedBankIds);

    res.json({
      child: { id: child.id, name: child.name, age: child.age, mode },
      country,
      plan,
      dailyFreshLesson,
      completionPct,
      doneTopicIds: Array.from(doneTopicIds),
      doneContentBankLessonIds: Array.from(completedBankIds),
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
  correct: z.boolean().optional(),
  // Optional client-side timestamp — used when replaying a queued attempt
  // so the rolling 7-day accuracy window stays accurate even if delivery
  // is delayed (offline mobile sessions). Falls back to server `now()`.
  ts: z.string().datetime().optional(),
  // Smart Study v2: stable question id from the adaptive picker — when
  // present, it's appended to seenQuestionIds (capped at SEEN_ID_CAP)
  // so the same question never reappears for this child.
  questionId: z.string().min(1).max(120).optional(),
  selectedAnswer: z.string().min(1).max(120).optional(),
  answerToken: z.string().min(10).max(1200).optional(),
});
// Clients may post one attempt or a batch (one per question). The cap
// keeps a single request bounded — a Practice/Test session is at most
// ~20 questions, so 50 leaves headroom without inviting abuse.
const AttemptBody = z.union([SingleAttempt, z.array(SingleAttempt).min(1).max(50)]);

router.post(
  "/smart-study/attempt",
  SMART_STUDY_PREMIUM_GATE,
  infantExploreMutationGate(),
  async (req, res): Promise<void> => {
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
    const hasServerGrade = Boolean(a.answerToken && a.selectedAnswer && a.questionId);
    if (a.correct == null && !hasServerGrade) {
      res.status(400).json({ error: "missing_grade" });
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
    const bySubject = new Map<string, (LearningAttempt & { questionId?: string })[]>();
    for (const a of incoming) {
      const graded =
        a.answerToken && a.selectedAnswer && a.questionId
          ? gradeAnswerToken({
              token: a.answerToken,
              userId,
              childId,
              subject: a.subject,
              questionId: a.questionId,
              selectedAnswer: a.selectedAnswer,
            })
          : null;
      if (a.answerToken && graded == null) {
        res.status(400).json({ error: "invalid_answer_token" });
        return;
      }
      const list = bySubject.get(a.subject) ?? [];
      list.push({
        topicId: a.topicId,
        correct: graded ?? a.correct ?? false,
        ts: a.ts ?? new Date().toISOString(),
        questionId: a.questionId,
      });
      bySubject.set(a.subject, list);
    }

    const result: { subject: string; weakTopics: string[]; attemptsCount: number }[] = [];

    // Wrap each per-(child, subject) read-modify-write in a transaction with
    // SELECT … FOR UPDATE so concurrent /attempt calls (e.g. an offline queue
    // flush colliding with a fresh attempt) don't lose updates on
    // accuracyRecent / seenQuestionIds / currentLevel — last-write-wins on
    // these jsonb columns would silently corrupt the adaptive state.
    for (const [subject, attempts] of bySubject.entries()) {
      const txOut = await db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(childLearningProgressTable)
          .where(
            and(
              eq(childLearningProgressTable.childId, childId),
              eq(childLearningProgressTable.subject, subject),
            ),
          )
          .for("update")
          .limit(1);
        const row: ChildLearningProgressRow | undefined = existing[0];

        let merged = parseAttempts(row?.accuracyRecent);
        for (const next of attempts) merged = appendAttempt(merged, next);
        const weak = recomputeWeakTopics(
          merged.map((a) => ({ topicId: a.topicId, correct: a.correct })),
        );

        // Smart Study v2: track seenQuestionIds (anti-repetition) and bump
        // currentLevel based on the trailing correct/wrong streak.
        const incomingForSubject = attempts;
        const newlySeen = incomingForSubject
          .map((a) => a.questionId)
          .filter((id): id is string => typeof id === "string" && id.length > 0);
        const prevSeen = parseSeenIds(row?.seenQuestionIds);
        const seenAll = [...prevSeen, ...newlySeen];
        const seenDeduped: string[] = [];
        const seenSet = new Set<string>();
        for (const id of seenAll) {
          if (!seenSet.has(id)) { seenSet.add(id); seenDeduped.push(id); }
        }
        const seenCapped = seenDeduped.length > SEEN_ID_CAP
          ? seenDeduped.slice(seenDeduped.length - SEEN_ID_CAP)
          : seenDeduped;

        const baseLevel = (row?.currentLevel ?? levelForAge(child.age ?? 0)) as Level;
        // Streak detection over the rolling window (not just this request) —
        // clients POST one attempt per question, so feeding only the current
        // request would never accumulate a 3-correct streak. Last 5 entries
        // is enough for both the 3-correct-up and 2-wrong-down rules.
        const recentForBump = merged.slice(-5).map((a) => a.correct);
        const nextLevel: Level = SMART_SUBJECT_IDS.has(subject)
          ? bumpLevel({
              currentLevel: baseLevel,
              ageYears: child.age ?? 0,
              recentResults: recentForBump,
            })
          : baseLevel;

        if (row) {
          await tx
            .update(childLearningProgressTable)
            .set({
              accuracyRecent: merged,
              weakTopics: weak,
              seenQuestionIds: seenCapped,
              currentLevel: nextLevel,
              lastActiveAt: new Date(),
              updatedAt: sql`now()`,
            })
            .where(eq(childLearningProgressTable.id, row.id));
        } else {
          await tx.insert(childLearningProgressTable).values({
            childId,
            userId,
            subject,
            accuracyRecent: merged,
            weakTopics: weak,
            seenQuestionIds: seenCapped,
            currentLevel: nextLevel,
            lastActiveAt: new Date(),
          });
        }
        return { weak, attemptsCount: merged.length };
      });
      result.push({ subject, weakTopics: txOut.weak, attemptsCount: txOut.attemptsCount });
    }

    // Back-compat: a single-attempt request returns the original flat
    // shape so existing clients keep working unchanged.
    if (!Array.isArray(parsed.data)) {
      const r = result[0]!;
      const single = incoming[0]!;
      const graded =
        single.answerToken && single.selectedAnswer && single.questionId
          ? gradeAnswerToken({
              token: single.answerToken,
              userId,
              childId,
              subject: single.subject,
              questionId: single.questionId,
              selectedAnswer: single.selectedAnswer,
            })
          : null;
      res.json({
        ok: true,
        weakTopics: r.weakTopics,
        attemptsCount: r.attemptsCount,
        ...(graded != null ? { correct: graded } : {}),
      });
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

router.get(
  "/smart-study/insights",
  SMART_STUDY_PREMIUM_GATE,
  async (req, res): Promise<void> => {
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
    const country = await resolveUserCountry(userId);

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
    const planMode = mode === "advanced" ? "advanced" : "basic";
    const packs = planMode === "advanced"
      ? getAdvancedSubjectsForCountry(country)
      : getBasicSubjectsForCountry(country);
    const lookupTopicTitle = (subjectId: string, topicId: string): string => {
      const pack = packs.find((p) => p.id === subjectId)
        ?? (planMode === "advanced" ? getAdvancedSubject(subjectId) : getBasicSubject(subjectId));
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
      const yRecCtx = await loadStudyZoneRecommendationContext(userId, childId, yIso);
      const yPlan = buildDailyPlan({
        childAge: child.age ?? 0,
        childClass: child.childClass,
        country,
        dateIso: yIso,
        subjects: subjectsForPlan,
        discoveryLesson: null,
      });
      const doneIds = new Set<string>();
      for (const r of rows) {
        for (const a of parseAttempts(r.accuracyRecent)) {
          if (a.ts.slice(0, 10) === yIso) doneIds.add(a.topicId);
        }
      }
      const yCompletedBank = yRecCtx
        ? completedContentBankLessonIds(yRecCtx.completedActivityIds)
        : new Set<string>();
      const doneCount = yPlan.items.filter((it) =>
        it.source === "discovery" && it.contentBankLessonId
          ? yCompletedBank.has(it.contentBankLessonId)
          : doneIds.has(it.topicId),
      ).length;
      yesterday = {
        date: yIso,
        planSize: yPlan.items.length,
        doneCount,
        completionPct: planCompletionPct(yPlan, doneIds, yCompletedBank),
      };
    }

    const baseLevel = levelForAge(child.age ?? 0);
    const adaptiveTopics = rows
      .filter((r) => isTopicPracticeSubject(r.subject))
      .map((r) => {
        const meta = lookupPracticeTitle(r.subject, planMode);
        return {
          topicId: r.subject,
          topicTitle: meta?.title ?? r.subject,
          subjectPack: meta?.packId ?? practicePackForSubject(r.subject),
          subjectEmoji: meta?.emoji ?? "✨",
          currentLevel: (r.currentLevel ?? baseLevel) as Level,
        };
      })
      .sort((a, b) => a.topicTitle.localeCompare(b.topicTitle));

    const hasData = rows.length > 0;

    res.json({
      childId: child.id,
      childName: child.name,
      mode,
      country,
      baseLevel,
      adaptiveTopics,
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

// ─── POST /api/smart-study/next-questions ────────────────────────────────────
//
// Smart Study Zone v2 — adaptive, country-localized, anti-repetition question
// stream. Tries OpenAI generation first (with a tight timeout) and falls back
// to the deterministic dataset whenever AI is slow, errors out, or returns a
// malformed shape. Either way, the response shape is identical so the client
// doesn't need to care which path served it.

const NextQuestionsBody = z.object({
  childId: z.number().int().positive(),
  subject: z.string().min(1).max(40).refine(
    (s) => isTopicPracticeSubject(s),
    { message: "unknown_practice_subject" },
  ),
  count: z.number().int().min(1).max(10).optional(),
  country: z.string().min(2).max(8).optional(),
});

const AiQuestionSchema = z.object({
  question: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(80)).min(2).max(6),
  answer: z.string().min(1).max(80),
});
const AiResponseSchema = z.object({
  questions: z.array(AiQuestionSchema).min(1).max(10),
});

/** Wrap a promise with a timeout; rejects with the timeout error. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

async function generateWithAi(
  level: Level,
  subject: string,
  country: string,
  ageYears: number,
  count: number,
  excludeIds: Set<string>,
  userId: string,
): Promise<SmartQuestion[] | null> {
  if (!isBasicMathPracticeSubject(subject)) return null;
  try {
    const { wrapJobInput } = await import("../queue/ai-job-payload.js");
    const enqueued = await enqueueAiJob(
      "smart-study.next_questions",
      userId,
      wrapJobInput("smart-study/next-questions", {
        level,
        subject,
        country,
        ageYears,
        count,
        excludeIds: [...excludeIds],
      }),
    );
    if (!enqueued.jobId) return null;
    const { waitForJobResult } = await import("../queue/index.js");
    const { isBullMqActive } = await import("../queue/ai-job-queue.js");
    const { waitForJob } = await import("../queue/ai-job-store.js");
    const finished = isBullMqActive()
      ? await waitForJobResult(enqueued.jobId, 8000)
      : await waitForJob(enqueued.jobId, 8000);
    if (finished?.status !== "completed" || !finished.result) return null;
    const body = finished.result as { questions: SmartQuestion[] };
    return body.questions?.length ? body.questions : null;
  } catch (err) {
    logger.warn(
      `smart-study AI generation failed (falling back to dataset): ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

router.post(
  "/smart-study/next-questions",
  SMART_STUDY_PREMIUM_GATE,
  infantExploreMutationGate(),
  async (req, res): Promise<void> => {
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
  const { childId, subject } = parsed.data;
  const count = parsed.data.count ?? 10;
  const country = await resolveUserCountry(userId, parsed.data.country);

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    // Per-(child, subject) row holds adaptive state. Smart Study v2 maps
    // each Smart subject to its own row even though the legacy /attempt
    // path groups everything under "math" — that keeps levels independent
    // per subject so a strong addition kid isn't auto-bumped on fractions.
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
    const row = existing[0];
    const level = (row?.currentLevel ?? levelForAge(child.age ?? 0)) as Level;
    const seenIds = new Set<string>(parseSeenIds(row?.seenQuestionIds));

    const aiQuestions = await generateWithAi(
      level, subject, country, child.age ?? 0, count, seenIds, userId,
    );
    let questions: SmartQuestion[] = aiQuestions ?? [];
    let source: "ai" | "dataset" = aiQuestions && aiQuestions.length >= count ? "ai" : "dataset";
    if (questions.length < count) {
      // Top up with dataset — guarantees we always return `count` items.
      const need = count - questions.length;
      const fill = pickPracticeQuestions({
        level, subject, country, count: need, exclude: seenIds, seed: Date.now(),
      });
      questions = [...questions, ...fill];
      if (aiQuestions && aiQuestions.length > 0) source = "ai";
      else source = "dataset";
    }

    res.json({
      level,
      source,
      country,
      questions: questions.slice(0, count).map((q) => ({
        id: q.id,
        q: q.q,
        options: q.options,
        answerToken: buildAnswerToken({
          userId,
          childId,
          subject,
          questionId: q.id,
          answer: q.answer,
        }),
      })),
    });
  } catch (err) {
    logger.error(
      `smart-study next-questions failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── GET /api/smart-study/daily-fresh-lesson ─────────────────────────────────

const FreshLessonQuery = z.object({
  childId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.get(
  "/smart-study/daily-fresh-lesson",
  SMART_STUDY_PREMIUM_GATE,
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const parsed = FreshLessonQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
      return;
    }
    const dateIso = parsed.data.date ?? todayIsoUtc();
    try {
      const result = await resolveAndPersistFreshLesson(
        userId,
        parsed.data.childId,
        dateIso,
      );
      if (!result && !(await loadStudyZoneRecommendationContext(userId, parsed.data.childId, dateIso))) {
        res.status(404).json({ error: "child_not_found" });
        return;
      }
      res.json({
        ok: true,
        date: dateIso,
        lesson: result?.lesson ?? null,
        event: result?.event ?? null,
        contentBankAvailable: Boolean(result?.lesson),
      });
    } catch (err) {
      logger.error(
        `smart-study daily-fresh-lesson failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      res.status(500).json({ error: "server_error" });
    }
  },
);

// ─── GET /api/smart-study/unseen-lessons ─────────────────────────────────────

router.get(
  "/smart-study/unseen-lessons",
  SMART_STUDY_PREMIUM_GATE,
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const parsed = FreshLessonQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
      return;
    }
    const dateIso = parsed.data.date ?? todayIsoUtc();
    try {
      const items = await getUnseenLessonsForChild(userId, parsed.data.childId, dateIso);
      res.json({ ok: true, date: dateIso, items, count: items.length });
    } catch (err) {
      logger.error(
        `smart-study unseen-lessons failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      res.status(500).json({ error: "server_error" });
    }
  },
);

// ─── GET /api/smart-study/recommended-next ───────────────────────────────────

const RecommendedQuery = z.object({
  childId: z.coerce.number().int().positive(),
  topicId: z.string().min(1).max(80),
  subjectId: z.string().min(1).max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.get(
  "/smart-study/recommended-next",
  SMART_STUDY_PREMIUM_GATE,
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const parsed = RecommendedQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
      return;
    }
    const dateIso = parsed.data.date ?? todayIsoUtc();
    try {
      const lesson = await getRecommendedNextLessonForTopic(
        userId,
        parsed.data.childId,
        dateIso,
        parsed.data.subjectId,
        parsed.data.topicId,
      );
      res.json({ ok: true, lesson });
    } catch (err) {
      logger.error(
        `smart-study recommended-next failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      res.status(500).json({ error: "server_error" });
    }
  },
);

// ─── GET /api/smart-study/lesson/:lessonId ───────────────────────────────────

router.get(
  "/smart-study/lesson/:lessonId",
  SMART_STUDY_PREMIUM_GATE,
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const childParsed = z.coerce.number().int().positive().safeParse(req.query.childId);
    const lessonIdRaw = req.params.lessonId;
    const lessonId = typeof lessonIdRaw === "string" ? lessonIdRaw : lessonIdRaw?.[0];
    if (!childParsed.success || !lessonId) {
      res.status(400).json({ error: "invalid_query" });
      return;
    }
    const dateIso = typeof req.query.date === "string"
      ? req.query.date
      : todayIsoUtc();
    try {
      const lesson = await loadSmartStudyLessonItem(
        userId,
        childParsed.data,
        lessonId,
        dateIso,
      );
      if (!lesson) {
        res.status(404).json({ error: "lesson_not_found" });
        return;
      }
      const [enriched] = enrichWithAudio("smart-study", [lesson]);
      res.json({
        ok: true,
        item: enriched ?? lesson,
        progressActivityId: `cb:smart-study:${lesson.id}`,
      });
    } catch (err) {
      logger.error(
        `smart-study lesson fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      res.status(500).json({ error: "server_error" });
    }
  },
);

// ─── POST /api/smart-study/lesson-view ────────────────────────────────────────

const LessonViewBody = z.object({
  childId: z.number().int().positive(),
  lessonId: z.string().min(1).max(120),
});

router.post(
  "/smart-study/lesson-view",
  SMART_STUDY_PREMIUM_GATE,
  infantExploreMutationGate(),
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const parsed = LessonViewBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
      return;
    }
    try {
      const ok = await recordContentBankLessonViewed(
        userId,
        parsed.data.childId,
        parsed.data.lessonId,
      );
      if (!ok) {
        res.status(404).json({ error: "child_not_found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      logger.error(
        `smart-study lesson-view failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      res.status(500).json({ error: "server_error" });
    }
  },
);

export default router;
