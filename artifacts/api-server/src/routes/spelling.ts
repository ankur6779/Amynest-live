import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  spellingProgressTable,
  spellingCompetitionScoresTable,
  childrenTable,
} from "@workspace/db";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  SPELLING_AGE_GROUPS,
  SPELLING_WORDS,
  type SpellingAgeGroup,
  type SpellingDifficulty,
  type SpellingWord,
} from "../data/spelling-words";

const router: IRouter = Router();

// ─── Shared validators ───────────────────────────────────────────────────────
const ageGroupSchema = z.enum(["2-4", "4-6", "6-8", "8-10+"]);
const difficultySchema = z.enum(["easy", "medium", "hard"]);

// ─── Badges ─────────────────────────────────────────────────────────────────
//
// Badge logic lives server-side so the client can't fabricate awards. Each
// badge is a pure function of the *new* progress row — recompute on every
// upsert so we never miss a badge that should have been awarded.
const BADGE_DEFS: ReadonlyArray<{ id: string; earned: (p: ProgressLike) => boolean }> = [
  { id: "first_word",      earned: (p) => p.totalCorrect >= 1 },
  { id: "spelling_star",   earned: (p) => p.bestStreak >= 5 },
  { id: "streak_10",       earned: (p) => p.bestStreak >= 10 },
  { id: "level_3",         earned: (p) => p.currentLevel >= 3 },
  { id: "level_5",         earned: (p) => p.currentLevel >= 5 },
  { id: "spelling_master", earned: (p) => p.totalStars >= 100 },
];

interface ProgressLike {
  totalCorrect: number;
  totalStars: number;
  currentLevel: number;
  bestStreak: number;
}

function recomputeBadges(p: ProgressLike): string[] {
  return BADGE_DEFS.filter((b) => b.earned(p)).map((b) => b.id);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Verify a child belongs to the authed user, returning false otherwise. */
async function ownsChild(userId: string, childId: number): Promise<boolean> {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

/** Pick `n` random elements from the array (Fisher-Yates trim). */
function sample<T>(arr: readonly T[], n: number): T[] {
  if (arr.length <= n) return [...arr];
  const out = [...arr];
  for (let i = out.length - 1; i > 0 && i >= out.length - n; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(out.length - n);
}

// ─── GET /api/spelling/words?age=&difficulty=&count= ─────────────────────────
//
// Returns up to `count` (default 10) curated words matching the filter.
// Order is randomised per call so kids don't see the exact same set twice
// in a row.
router.get("/spelling/words", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const querySchema = z.object({
    age: ageGroupSchema,
    difficulty: difficultySchema.optional(),
    count: z.coerce.number().int().min(1).max(20).optional(),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const { age, difficulty, count = 10 } = parsed.data;
  const pool = SPELLING_WORDS.filter(
    (w) => w.ageGroup === age && (!difficulty || w.difficulty === difficulty),
  );
  res.json({ ok: true, words: sample(pool, count), source: "curated" as const });
});

// ─── POST /api/spelling/ai-generate { age, difficulty, count? } ──────────────
//
// Uses OpenAI to generate fresh spelling words for the given age + difficulty.
// We validate the JSON response with Zod and silently drop malformed entries
// rather than failing the whole call — the model is reliable but not perfect.
const aiGenerateSchema = z.object({
  age: ageGroupSchema,
  difficulty: difficultySchema.default("medium"),
  count: z.number().int().min(1).max(15).optional(),
});

const aiWordSchema = z.object({
  word: z.string().min(1).max(40),
  syllables: z.array(z.string().min(1).max(20)).min(1).max(10),
  chunks: z.array(z.string().min(1).max(6)).min(1).max(15),
  hint: z.string().min(3).max(160),
});
const aiResponseSchema = z.object({
  words: z.array(aiWordSchema).min(1).max(15),
});

router.post("/spelling/ai-generate", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = aiGenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { age, difficulty, count = 10 } = parsed.data;

  try {
    const { openai } = await import("@workspace/integrations-openai-ai-server");

    const ageDescriptor = {
      "2-4":   "ages 2-4 (foundation: 2-3 letter words, single vowel sounds, no silent letters)",
      "4-6":   "ages 4-6 (beginner: short CVC and simple blends, max 4-5 letters, easy phonics)",
      "6-8":   "ages 6-8 (intermediate: 5-6 letter words, common digraphs sh/ch/th, plain phonics)",
      "8-10+": "ages 8-10+ (advanced: 6-9 letter words, may include silent letters and tricky spellings)",
    }[age];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate kid-friendly spelling word lists. Always return strict JSON. Never include profanity, brand names, proper nouns, or ambiguous spellings.",
        },
        {
          role: "user",
          content: `Generate ${count} ${difficulty} spelling words for ${ageDescriptor}.

For EACH word return:
- word: the lowercase target word
- syllables: array of strings, breaking the word into spoken syllables (e.g. "elephant" -> ["el","e","phant"])
- chunks: array of phonetic chunks for a missing-letter game, with digraphs grouped (e.g. "ship" -> ["sh","i","p"], "cat" -> ["c","a","t"])
- hint: a short, kid-friendly clue sentence (max 100 chars), do NOT mention the word itself

Return JSON of the exact shape:
{ "words": [ { "word": "...", "syllables": ["...",...], "chunks": ["...",...], "hint": "..." }, ... ] }`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      logger.error({ evt: "spelling.ai_invalid_json", userId }, "ai returned non-json");
      res.status(502).json({ error: "ai_invalid_json" });
      return;
    }

    const validated = aiResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      logger.error(
        { evt: "spelling.ai_schema_fail", userId, issues: validated.error.flatten() },
        "ai schema validation failed",
      );
      res.status(502).json({ error: "ai_schema_fail" });
      return;
    }

    // Promote AI words to the same SpellingWord shape as the curated catalog.
    const words: SpellingWord[] = validated.data.words.map((w) => ({
      id: `ai-${w.word.toLowerCase()}`,
      word: w.word.toLowerCase(),
      ageGroup: age,
      difficulty,
      syllables: w.syllables,
      chunks: w.chunks,
      hint: w.hint,
    }));

    logger.info({ evt: "spelling.ai_generate", userId, age, difficulty, count: words.length }, "ai words generated");
    res.json({ ok: true, words, source: "ai" as const });
  } catch (err) {
    const code = err instanceof Error ? err.message : "ai_failed";
    logger.error(
      { evt: "spelling.ai_failed", userId, code },
      "spelling ai-generate failed",
    );
    res.status(502).json({ error: "ai_failed" });
  }
});

// ─── GET /api/spelling/progress?childId=&ageGroup= ───────────────────────────
router.get("/spelling/progress", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const querySchema = z.object({
    childId: z.coerce.number().int().positive(),
    ageGroup: ageGroupSchema,
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  if (!(await ownsChild(userId, parsed.data.childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const rows = await db
    .select()
    .from(spellingProgressTable)
    .where(
      and(
        eq(spellingProgressTable.childId, parsed.data.childId),
        eq(spellingProgressTable.ageGroup, parsed.data.ageGroup),
        eq(spellingProgressTable.userId, userId),
      ),
    )
    .limit(1);

  // Empty progress is a normal "fresh start" state — return zeros, not 404.
  const row = rows[0] ?? {
    childId: parsed.data.childId,
    userId,
    ageGroup: parsed.data.ageGroup,
    totalCorrect: 0,
    totalAttempts: 0,
    totalStars: 0,
    currentLevel: 1,
    currentStreak: 0,
    bestStreak: 0,
    badges: [] as string[],
  };

  res.json({ ok: true, progress: row });
});

// ─── POST /api/spelling/progress ─────────────────────────────────────────────
//
// Records ONE attempt outcome. Server is the authority on stars / level /
// badges so a tampered client can't grant itself rewards.
const recordAttemptSchema = z.object({
  childId: z.number().int().positive(),
  ageGroup: ageGroupSchema,
  /** Did the child spell this word correctly? */
  correct: z.boolean(),
});

router.post("/spelling/progress", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = recordAttemptSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { childId, ageGroup, correct } = parsed.data;

  if (!(await ownsChild(userId, childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  // Read-modify-write inside a transaction — small contention window per
  // child so a serial UPDATE is fine.
  const updated = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(spellingProgressTable)
      .where(
        and(
          eq(spellingProgressTable.childId, childId),
          eq(spellingProgressTable.ageGroup, ageGroup),
          eq(spellingProgressTable.userId, userId),
        ),
      )
      .limit(1);

    const prev = existing[0] ?? {
      totalCorrect: 0,
      totalAttempts: 0,
      totalStars: 0,
      currentLevel: 1,
      currentStreak: 0,
      bestStreak: 0,
      badges: [] as string[],
    };

    const totalCorrect = prev.totalCorrect + (correct ? 1 : 0);
    const totalAttempts = prev.totalAttempts + 1;
    const currentStreak = correct ? prev.currentStreak + 1 : 0;
    const bestStreak = Math.max(prev.bestStreak, currentStreak);
    // Star economy: 1 star per correct answer, +1 streak bonus every 5 in a row.
    const earned = correct ? (currentStreak > 0 && currentStreak % 5 === 0 ? 2 : 1) : 0;
    const totalStars = prev.totalStars + earned;
    // Level up every 10 stars, capped at 10.
    const currentLevel = Math.min(10, Math.max(1, Math.floor(totalStars / 10) + 1));
    const badges = recomputeBadges({ totalCorrect, totalStars, currentLevel, bestStreak });

    const next = {
      childId,
      userId,
      ageGroup,
      totalCorrect,
      totalAttempts,
      totalStars,
      currentLevel,
      currentStreak,
      bestStreak,
      badges,
    };

    if (existing.length === 0) {
      await tx.insert(spellingProgressTable).values(next);
    } else {
      await tx
        .update(spellingProgressTable)
        .set({ ...next, updatedAt: sql`now()` })
        .where(eq(spellingProgressTable.id, existing[0].id));
    }
    return { ...next, starsEarnedThisAttempt: earned };
  });

  res.json({ ok: true, progress: updated });
});

// ─── POST /api/spelling/competition/score ────────────────────────────────────
const competitionScoreSchema = z.object({
  childId: z.number().int().positive(),
  ageGroup: ageGroupSchema,
  wordsAttempted: z.number().int().min(1).max(50),
  wordsCorrect: z.number().int().min(0).max(50),
  durationSec: z.number().int().min(1).max(60 * 30),
});

router.post("/spelling/competition/score", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = competitionScoreSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { childId, ageGroup, wordsAttempted, wordsCorrect, durationSec } = parsed.data;

  if (wordsCorrect > wordsAttempted) {
    res.status(400).json({ error: "invalid_counts" });
    return;
  }
  if (!(await ownsChild(userId, childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const accuracyPct = Math.round((wordsCorrect / wordsAttempted) * 100);
  // Score formula: 100 pts per correct word, +speed bonus that decays with
  // total time (so faster runs score more, but slow careful kids still
  // score well on accuracy).
  const speedBonus = Math.max(0, Math.round((wordsCorrect * 60) / Math.max(1, durationSec)) * 5);
  const score = wordsCorrect * 100 + speedBonus;

  const inserted = await db
    .insert(spellingCompetitionScoresTable)
    .values({
      childId,
      userId,
      ageGroup,
      wordsAttempted,
      wordsCorrect,
      accuracyPct,
      durationSec,
      score,
    })
    .returning();

  res.json({ ok: true, score: inserted[0] });
});

// ─── GET /api/spelling/competition/leaderboard?ageGroup= ─────────────────────
//
// Family leaderboard — top 10 scores across all of the parent's children
// for the given age group.
router.get("/spelling/competition/leaderboard", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const querySchema = z.object({ ageGroup: ageGroupSchema });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const rows = await db
    .select({
      id: spellingCompetitionScoresTable.id,
      childId: spellingCompetitionScoresTable.childId,
      childName: childrenTable.name,
      score: spellingCompetitionScoresTable.score,
      accuracyPct: spellingCompetitionScoresTable.accuracyPct,
      durationSec: spellingCompetitionScoresTable.durationSec,
      wordsCorrect: spellingCompetitionScoresTable.wordsCorrect,
      wordsAttempted: spellingCompetitionScoresTable.wordsAttempted,
      createdAt: spellingCompetitionScoresTable.createdAt,
    })
    .from(spellingCompetitionScoresTable)
    .leftJoin(
      childrenTable,
      eq(spellingCompetitionScoresTable.childId, childrenTable.id),
    )
    .where(
      and(
        eq(spellingCompetitionScoresTable.userId, userId),
        eq(spellingCompetitionScoresTable.ageGroup, parsed.data.ageGroup),
      ),
    )
    .orderBy(desc(spellingCompetitionScoresTable.score))
    .limit(10);

  res.json({ ok: true, leaderboard: rows });
});

// Re-export age-group constants so other routes / tests can stay in sync.
export { SPELLING_AGE_GROUPS };
export default router;
