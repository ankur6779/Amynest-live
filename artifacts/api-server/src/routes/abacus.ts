import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  db,
  childrenTable,
  abacusProgressTable,
  referralsTable,
  type AbacusBestScores,
} from "@workspace/db";
import {
  buildAbacusTutorPrompt,
  getLevel,
  highestUnlockedLevel,
  isAbacusEligible,
  LEVELS,
  type LevelId,
} from "@workspace/abacus";
import { buildAbacusWeeklySummary } from "../services/abacusWeeklySummary";

const router: IRouter = Router();

/**
 * Returns the start (Monday 00:00 UTC) of the leaderboard week containing
 * `now`. We pin to UTC so users in different timezones see the same window
 * roll over at the same moment — important for "weekly" social mechanics.
 */
function currentWeekStartUtc(now: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  // getUTCDay(): 0 = Sun … 6 = Sat. Convert to 0 = Mon … 6 = Sun.
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

/** Verify the child belongs to the authenticated user. Returns row or null.
 *  Mirrors the helper used in `phonics.ts` so auth behaviour is consistent
 *  across learning modules. */
async function loadOwnedChild(childId: number, userId: string) {
  const rows = await db
    .select({
      id: childrenTable.id,
      name: childrenTable.name,
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Coerce the jsonb completedLevels column into a strongly-typed list. */
function asLevelList(raw: unknown): LevelId[] {
  if (!Array.isArray(raw)) return [];
  const valid: LevelId[] = [];
  for (const v of raw) {
    if (typeof v !== "number") continue;
    if (v < 1 || v > LEVELS.length) continue;
    valid.push(v as LevelId);
  }
  return Array.from(new Set(valid)).sort((a, b) => a - b) as LevelId[];
}

/** Read a child's progress row, or fabricate a fresh-zeroed one. */
async function loadOrInitProgress(childId: number, userId: string) {
  const rows = await db
    .select()
    .from(abacusProgressTable)
    .where(eq(abacusProgressTable.childId, childId))
    .limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db
    .insert(abacusProgressTable)
    .values({
      childId,
      userId,
      currentLevel: 1,
      lastMode: "learn",
      completedLevels: [],
      bestScores: {},
      totalCorrect: 0,
      totalAttempts: 0,
      totalPoints: 0,
    })
    .returning();
  return created;
}

// ─── GET /api/abacus/progress?childId=123 ────────────────────────────────

const GetQuery = z.object({
  childId: z.coerce.number().int().positive(),
});

router.get("/abacus/progress", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = GetQuery.safeParse(req.query);
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

    if (!isAbacusEligible(child.age ?? 0)) {
      res.json({
        eligible: false,
        child: { id: child.id, name: child.name, age: child.age },
      });
      return;
    }

    const row = await loadOrInitProgress(childId, userId);
    const completed = asLevelList(row.completedLevels);
    const highest = highestUnlockedLevel(completed);

    res.json({
      eligible: true,
      child: { id: child.id, name: child.name, age: child.age },
      progress: {
        currentLevel: row.currentLevel,
        lastMode: row.lastMode,
        completedLevels: completed,
        highestUnlocked: highest,
        bestScores: (row.bestScores as AbacusBestScores) ?? {},
        totalCorrect: row.totalCorrect,
        totalAttempts: row.totalAttempts,
        totalPoints: row.totalPoints,
        updatedAt: row.updatedAt,
      },
    });
  } catch (err) {
    logger.error(
      `abacus GET failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── GET /api/abacus/weekly-summary ──────────────────────────────────────
//
// Per-child weekly Abacus stats for the Parent Insights view + weekly
// recap email. Aggregates across every eligible child the user owns; safe
// to call even when no children are eligible (returns empty arrays).

router.get("/abacus/weekly-summary", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const summary = await buildAbacusWeeklySummary({ userId });
    res.json(summary);
  } catch (err) {
    logger.error(
      `abacus weekly-summary failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/abacus/progress ───────────────────────────────────────────
//
// Body: { childId, action: "set_mode" | "complete_level" | "log_session" }
//
// `set_mode`        — { mode } updates `lastMode` & `currentLevel?`. Cheap.
// `complete_level`  — { level, accuracyPct, points } adds `level` to
//                     `completedLevels`, refreshes `bestScores[level]` if the
//                     new score is higher, and unlocks the next level by
//                     bumping `currentLevel` to `level + 1` when applicable.
// `log_session`     — { totalCorrect, totalAttempts, totalPoints } accumulates
//                     lifetime totals (used for badges + tile previews).

const PostBodyBase = z.object({
  childId: z.number().int().positive(),
});

const SetModeBody = PostBodyBase.extend({
  action: z.literal("set_mode"),
  mode: z.enum(["learn", "practice", "challenge", "mental", "tutor"]),
  level: z.number().int().min(1).max(LEVELS.length).optional(),
});

const CompleteLevelBody = PostBodyBase.extend({
  action: z.literal("complete_level"),
  level: z.number().int().min(1).max(LEVELS.length),
  accuracyPct: z.number().int().min(0).max(100),
  points: z.number().int().min(0).max(1000),
});

const LogSessionBody = PostBodyBase.extend({
  action: z.literal("log_session"),
  totalCorrect: z.number().int().min(0).max(1000),
  totalAttempts: z.number().int().min(0).max(1000),
  totalPoints: z.number().int().min(0).max(10000),
});

const PostBody = z.discriminatedUnion("action", [
  SetModeBody,
  CompleteLevelBody,
  LogSessionBody,
]);

router.post("/abacus/progress", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = PostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;

  try {
    const child = await loadOwnedChild(body.childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    if (!isAbacusEligible(child.age ?? 0)) {
      res.status(400).json({ error: "child_age_not_eligible" });
      return;
    }

    const row = await loadOrInitProgress(body.childId, userId);
    const now = sql`now()`;

    if (body.action === "set_mode") {
      const update: Record<string, unknown> = { lastMode: body.mode, updatedAt: now };
      if (typeof body.level === "number") update.currentLevel = body.level;
      const [updated] = await db
        .update(abacusProgressTable)
        .set(update)
        .where(eq(abacusProgressTable.childId, body.childId))
        .returning();
      res.json({ ok: true, progress: updated });
      return;
    }

    if (body.action === "complete_level") {
      const completed = asLevelList(row.completedLevels);
      const next = new Set<LevelId>(completed);
      next.add(body.level as LevelId);
      const newCompleted = Array.from(next).sort((a, b) => a - b);

      const prevBest = (row.bestScores as AbacusBestScores) ?? {};
      const key = String(body.level);
      const existing = prevBest[key];
      const isNewBest = !existing || body.points > existing.points;
      const newBestScores: AbacusBestScores = {
        ...prevBest,
        [key]: isNewBest
          ? {
              points: body.points,
              accuracyPct: body.accuracyPct,
              completedAt: new Date().toISOString(),
            }
          : existing,
      };

      // Auto-advance currentLevel to the just-unlocked next level (capped
      // at the highest defined level).
      const advancedTo = Math.min(LEVELS.length, body.level + 1);

      const [updated] = await db
        .update(abacusProgressTable)
        .set({
          completedLevels: newCompleted,
          bestScores: newBestScores,
          currentLevel: advancedTo,
          updatedAt: now,
        })
        .where(eq(abacusProgressTable.childId, body.childId))
        .returning();

      res.json({
        ok: true,
        progress: updated,
        unlocked: advancedTo > body.level ? advancedTo : null,
        newBest: isNewBest,
      });
      return;
    }

    // log_session — also accumulates weekly leaderboard points. If the
    // child's stored `weekStartedAt` is older than the current week, we
    // start a fresh window from `body.totalPoints`; otherwise we add to
    // the existing weekly bucket. Done as a single SQL CASE to avoid a
    // read-modify-write race when two sessions land in the same instant.
    const weekStart = currentWeekStartUtc();
    const weekStartSql = sql`${weekStart.toISOString()}::timestamptz`;
    const [updated] = await db
      .update(abacusProgressTable)
      .set({
        totalCorrect: sql`${abacusProgressTable.totalCorrect} + ${body.totalCorrect}`,
        totalAttempts: sql`${abacusProgressTable.totalAttempts} + ${body.totalAttempts}`,
        totalPoints: sql`${abacusProgressTable.totalPoints} + ${body.totalPoints}`,
        weeklyPoints: sql`CASE WHEN ${abacusProgressTable.weekStartedAt} < ${weekStartSql} THEN ${body.totalPoints} ELSE ${abacusProgressTable.weeklyPoints} + ${body.totalPoints} END`,
        weekStartedAt: sql`CASE WHEN ${abacusProgressTable.weekStartedAt} < ${weekStartSql} THEN ${weekStartSql} ELSE ${abacusProgressTable.weekStartedAt} END`,
        updatedAt: now,
      })
      .where(eq(abacusProgressTable.childId, body.childId))
      .returning();
    res.json({ ok: true, progress: updated });
  } catch (err) {
    logger.error(
      `abacus POST failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── POST /api/abacus/tutor ─────────────────────────────────────────────
//
// Body: { childId, level, language, question }
//
// Returns Amy's short, kid-friendly answer for the AI Tutor sub-mode. We
// keep responses tight (≤200 tokens) so they're snappy and TTS-friendly.

const TutorBody = z.object({
  childId: z.number().int().positive(),
  level: z.number().int().min(1).max(LEVELS.length),
  language: z.literal("en"),
  question: z.string().min(1).max(500),
});

router.post("/abacus/tutor", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = TutorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { childId, level, language, question } = parsed.data;

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }
    if (!isAbacusEligible(child.age ?? 0)) {
      res.status(400).json({ error: "child_age_not_eligible" });
      return;
    }

    const { system, user } = buildAbacusTutorPrompt({
      level: level as LevelId,
      ageYears: child.age ?? 6,
      language,
      question,
    });

    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.6,
      max_tokens: 220,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!reply) {
      res.status(502).json({ error: "empty_ai_reply" });
      return;
    }

    res.json({ ok: true, reply });
  } catch (err) {
    logger.error(
      `abacus tutor failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

// ─── GET /api/abacus/leaderboard?childId=123 ─────────────────────────────
//
// Returns a weekly leaderboard scoped to the requesting user's "family"
// pool — defined as: themselves + their referrer + every user they've
// referred (regardless of referral status). Each user contributes ALL of
// their children's abacus scores. The leaderboard auto-resets every
// Monday 00:00 UTC: any row whose `weekStartedAt` is older than the
// current week boundary is treated as 0 weekly points without a write.
//
// Response: { weekStart, top: [{rank,name,points,childId,isMe}], me: {rank,points,total} }
// `me` is included separately because the requesting child may rank
// outside the top 5 — the UI shows both the leader strip + the child's
// own rank pill.

const LeaderboardQuery = z.object({
  childId: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
});

router.get("/abacus/leaderboard", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = LeaderboardQuery.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }
  const { childId, limit } = parsed.data;

  try {
    const child = await loadOwnedChild(childId, userId);
    if (!child) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    // Build the family/referral pool of userIds.
    const refRows = await db
      .select({
        referrerUserId: referralsTable.referrerUserId,
        referredUserId: referralsTable.referredUserId,
      })
      .from(referralsTable)
      .where(
        or(
          eq(referralsTable.referrerUserId, userId),
          eq(referralsTable.referredUserId, userId),
        ),
      );

    const pool = new Set<string>([userId]);
    for (const r of refRows) {
      pool.add(r.referrerUserId);
      pool.add(r.referredUserId);
    }
    const poolIds = Array.from(pool);

    const weekStart = currentWeekStartUtc();
    const weekStartIso = weekStart.toISOString();

    // Pull every child in the pool with their effective weekly score.
    // The CASE expression handles auto-reset on read so stale rows from
    // last week silently contribute 0 until their next `log_session`.
    // COALESCE both the weekly points and the tie-breaker `totalPoints`
    // because the LEFT JOIN yields NULLs for children who have never
    // played. Without this, Postgres' `ORDER BY ... DESC` puts NULLs
    // FIRST and unplayed children would rank above real scorers.
    const effectivePoints = sql<number>`CASE WHEN ${abacusProgressTable.weekStartedAt} IS NULL OR ${abacusProgressTable.weekStartedAt} < ${weekStartIso}::timestamptz THEN 0 ELSE COALESCE(${abacusProgressTable.weeklyPoints}, 0) END`;
    const tiebreakTotal = sql<number>`COALESCE(${abacusProgressTable.totalPoints}, 0)`;

    const rows = await db
      .select({
        childId: childrenTable.id,
        name: childrenTable.name,
        userId: childrenTable.userId,
        points: effectivePoints,
        totalPoints: tiebreakTotal,
      })
      .from(childrenTable)
      .leftJoin(
        abacusProgressTable,
        eq(abacusProgressTable.childId, childrenTable.id),
      )
      .where(inArray(childrenTable.userId, poolIds))
      .orderBy(desc(effectivePoints), desc(tiebreakTotal));

    // Materialise rank using points-then-totalPoints ordering. Children
    // without a progress row yet show as 0 / 0 so the strip still feels
    // alive when only the requester has played this week.
    const ranked = rows.map((r, i) => ({
      rank: i + 1,
      childId: r.childId,
      name: r.name,
      points: Number(r.points ?? 0),
      isMe: r.childId === childId,
    }));

    const me = ranked.find((r) => r.isMe) ?? {
      rank: ranked.length + 1,
      childId,
      name: child.name,
      points: 0,
      isMe: true,
    };

    res.json({
      weekStart: weekStartIso,
      top: ranked.slice(0, limit),
      me: { rank: me.rank, points: me.points, total: ranked.length },
    });
  } catch (err) {
    logger.error(
      `abacus leaderboard failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
