import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import crypto from "node:crypto";
import {
  db,
  spellingProgressTable,
  spellingCompetitionScoresTable,
  spellingSessionsTable,
  spellingTournamentsTable,
  childrenTable,
  type SpellingTournamentRow,
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
import { readCachedAudio, synthesize } from "../services/elevenLabsService";

const router: IRouter = Router();

// ─── Shared validators ───────────────────────────────────────────────────────
const ageGroupSchema = z.enum(["2-4", "4-6", "6-8", "8-10+"]);
const difficultySchema = z.enum(["easy", "medium", "hard"]);
/**
 * Trust source for POST /spelling/progress. Restricted to "parent" only
 * — the parent literally taps ✓/✗ in Parent Mode, so the assertion is
 * out-of-band of the tampered-client surface.
 *
 * Previously this endpoint also accepted "learn" and "practice", but
 * those are client-graded games where a scripted client could just post
 * `correct: true` repeatedly and inflate stars / level / badges. Learn
 * + Practice are now UI-only flows that do NOT write to progress; star
 * accumulation happens exclusively via Parent Mode and the server-graded
 * session flow (Dictation / Competition / Tournament / Battle).
 */
const legacySourceSchema = z.literal("parent");

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

/**
 * Server-side normalisation of a guess + target. Both sides are trimmed,
 * lowercased, and stripped of internal whitespace so trailing spaces or
 * accidental capitalisation don't fail a kid who actually got it right.
 *
 * Exported for the test suite — the v2 trust model lives or dies on this
 * function being right.
 */
export function normaliseSpellingGuess(s: string): string {
  return s.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Compute the competition score from server-graded results. Mirrors the
 * v1 formula so existing leaderboard rows remain comparable.
 *   score = 100 pts per correct word + speed bonus (decays with duration).
 */
export function computeCompetitionScore(
  wordsCorrect: number,
  durationSec: number,
): number {
  const speedBonus = Math.max(
    0,
    Math.round((wordsCorrect * 60) / Math.max(1, durationSec)) * 5,
  );
  return wordsCorrect * 100 + speedBonus;
}

/**
 * Apply a single attempt outcome to a progress row, returning the next
 * row + how many stars were earned. Pure — no DB I/O, no auth — so it
 * can be unit-tested in isolation.
 */
export function applyAttempt(
  prev: ProgressLike & {
    totalAttempts: number;
    currentStreak: number;
  },
  correct: boolean,
): {
  totalCorrect: number;
  totalAttempts: number;
  totalStars: number;
  currentLevel: number;
  currentStreak: number;
  bestStreak: number;
  badges: string[];
  starsEarnedThisAttempt: number;
} {
  const totalCorrect = prev.totalCorrect + (correct ? 1 : 0);
  const totalAttempts = prev.totalAttempts + 1;
  const currentStreak = correct ? prev.currentStreak + 1 : 0;
  const bestStreak = Math.max(prev.bestStreak, currentStreak);
  // Star economy: 1 star per correct, +1 streak bonus every 5 in a row.
  const earned = correct
    ? currentStreak > 0 && currentStreak % 5 === 0
      ? 2
      : 1
    : 0;
  const totalStars = prev.totalStars + earned;
  const currentLevel = Math.min(
    10,
    Math.max(1, Math.floor(totalStars / 10) + 1),
  );
  const badges = recomputeBadges({
    totalCorrect,
    totalStars,
    currentLevel,
    bestStreak,
  });
  return {
    totalCorrect,
    totalAttempts,
    totalStars,
    currentLevel,
    currentStreak,
    bestStreak,
    badges,
    starsEarnedThisAttempt: earned,
  };
}

// ─── Tournament Mode helpers ────────────────────────────────────────────────
//
// Tournament = 3-round elimination ladder. Round difficulty + word count
// + pass threshold are server-authored constants — the client cannot
// influence them. Each round runs as a normal v2 server-graded session
// (mode = "tournament") whose token is linked back to the tournament
// row via `spelling_sessions.parent_tournament_token`.

export const TOURNAMENT_ROUND_CONFIG: ReadonlyArray<{
  round: number;
  difficulty: SpellingDifficulty;
  wordCount: number;
  /** Min `wordsCorrect` to advance. R3 = 0 (final round always counts). */
  passThreshold: number;
}> = [
  { round: 1, difficulty: "easy",   wordCount: 5, passThreshold: 3 },
  { round: 2, difficulty: "medium", wordCount: 5, passThreshold: 3 },
  { round: 3, difficulty: "hard",   wordCount: 5, passThreshold: 0 },
];

export function getRoundConfig(round: number): {
  round: number;
  difficulty: SpellingDifficulty;
  wordCount: number;
  passThreshold: number;
} {
  const cfg = TOURNAMENT_ROUND_CONFIG[round - 1];
  if (!cfg) throw new Error(`invalid_round_${round}`);
  return cfg;
}

export interface TournamentRoundResult {
  round: number;
  difficulty: SpellingDifficulty;
  sessionToken: string;
  score: number;
  wordsCorrect: number;
  wordsAttempted: number;
  durationSec: number;
}

export interface TournamentStateForApply {
  rounds: Array<TournamentRoundResult & { passed: boolean }>;
  totalScore: number;
}

/**
 * Pure round-progression rule. Decides whether the just-finalized round
 * advances the player, eliminates them, or completes the tournament.
 * Score is added to `totalScore` ONLY when the round is passed — failed
 * round scores stay isolated to the rounds[] history.
 */
export function applyRoundResult(
  prev: TournamentStateForApply,
  result: TournamentRoundResult,
): {
  status: "active" | "eliminated" | "completed";
  currentRound: number;
  rounds: Array<TournamentRoundResult & { passed: boolean }>;
  totalScore: number;
  eliminatedAtRound: number | null;
  passed: boolean;
} {
  const cfg = getRoundConfig(result.round);
  const passed = result.wordsCorrect >= cfg.passThreshold;
  const stamped = { ...result, passed };
  const rounds = [...prev.rounds, stamped];
  const totalScore = prev.totalScore + (passed ? result.score : 0);

  if (!passed) {
    return {
      status: "eliminated",
      currentRound: result.round,
      rounds,
      totalScore,
      eliminatedAtRound: result.round,
      passed,
    };
  }
  if (result.round >= TOURNAMENT_ROUND_CONFIG.length) {
    return {
      status: "completed",
      currentRound: result.round,
      rounds,
      totalScore,
      eliminatedAtRound: null,
      passed,
    };
  }
  return {
    status: "active",
    currentRound: result.round + 1,
    rounds,
    totalScore,
    eliminatedAtRound: null,
    passed,
  };
}

// ─── Battle Mode (vs AI) helpers ────────────────────────────────────────────
//
// AI opponent is a deterministic per-word simulator seeded by the
// session token. We compute it once at session start and store it in
// `spelling_sessions.ai_results` so the AI's behaviour cannot be
// influenced by the client (e.g. by abandoning + retrying for a worse
// outcome — the seeded result would be the same).
//
// Profiles are tuned so the bots feel fair: easy is beatable by a
// patient kid, medium is honest competition, hard is a stretch goal.

export const AI_OPPONENTS = {
  ai_easy:   { label: "Beginner Bot", accuracy: 0.55, msMin: 3000, msMax: 7000 },
  ai_medium: { label: "Smart Bot",    accuracy: 0.75, msMin: 2500, msMax: 5000 },
  ai_hard:   { label: "Master Bot",   accuracy: 0.92, msMin: 1500, msMax: 3500 },
} as const;

export type AiOpponent = keyof typeof AI_OPPONENTS;

/** FNV-1a 32-bit hash — turns the session token into an RNG seed. */
function strHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Mulberry32 — small, deterministic RNG. */
function seededRng(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simulate the AI opponent's per-word result. Pure — no DB I/O.
 * Same `(wordCount, opponent, seed)` triple ALWAYS yields the same
 * results, so the AI is fixed at session-creation time.
 */
export function simulateAiOpponent(
  wordCount: number,
  opponent: AiOpponent,
  seed: string,
): Array<{ correct: boolean; ms: number }> {
  const profile = AI_OPPONENTS[opponent];
  const rng = seededRng(strHash(`${opponent}:${seed}`));
  const out: Array<{ correct: boolean; ms: number }> = [];
  for (let i = 0; i < wordCount; i++) {
    const correct = rng() < profile.accuracy;
    const ms = Math.round(profile.msMin + rng() * (profile.msMax - profile.msMin));
    out.push({ correct, ms });
  }
  return out;
}

/**
 * Compute the AI's competition score from its simulated per-word
 * results. Uses the same `computeCompetitionScore` formula as the
 * human side so the two scores are directly comparable.
 */
export function computeAiScore(
  aiResults: ReadonlyArray<{ correct: boolean; ms: number }>,
): { score: number; correct: number; durationSec: number } {
  const correct = aiResults.filter((r) => r.correct).length;
  const totalMs = aiResults.reduce((acc, r) => acc + r.ms, 0);
  const durationSec = Math.max(1, Math.ceil(totalMs / 1000));
  return {
    score: computeCompetitionScore(correct, durationSec),
    correct,
    durationSec,
  };
}

/**
 * Apply an attempt to (childId, ageGroup) inside a transaction with
 * proper row-locking so concurrent attempts serialize. Shared by the
 * legacy and session-based endpoints.
 */
async function recordAttemptTxn(
  userId: string,
  childId: number,
  ageGroup: SpellingAgeGroup,
  correct: boolean,
) {
  return db.transaction(async (tx) => {
    await tx
      .insert(spellingProgressTable)
      .values({
        childId,
        userId,
        ageGroup,
        totalCorrect: 0,
        totalAttempts: 0,
        totalStars: 0,
        currentLevel: 1,
        currentStreak: 0,
        bestStreak: 0,
        badges: [],
      })
      .onConflictDoNothing();

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
      .for("update")
      .limit(1);

    const prev = existing[0] ?? {
      id: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      totalStars: 0,
      currentLevel: 1,
      currentStreak: 0,
      bestStreak: 0,
      badges: [] as string[],
    };

    const next = applyAttempt(prev, correct);

    await tx
      .update(spellingProgressTable)
      .set({
        totalCorrect: next.totalCorrect,
        totalAttempts: next.totalAttempts,
        totalStars: next.totalStars,
        currentLevel: next.currentLevel,
        currentStreak: next.currentStreak,
        bestStreak: next.bestStreak,
        badges: next.badges,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(spellingProgressTable.childId, childId),
          eq(spellingProgressTable.ageGroup, ageGroup),
          eq(spellingProgressTable.userId, userId),
        ),
      );

    return {
      childId,
      userId,
      ageGroup,
      totalCorrect: next.totalCorrect,
      totalAttempts: next.totalAttempts,
      totalStars: next.totalStars,
      currentLevel: next.currentLevel,
      currentStreak: next.currentStreak,
      bestStreak: next.bestStreak,
      badges: next.badges,
      starsEarnedThisAttempt: next.starsEarnedThisAttempt,
    };
  });
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

async function generateAiWords(
  age: SpellingAgeGroup,
  difficulty: SpellingDifficulty,
  count: number,
): Promise<SpellingWord[]> {
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
  const parsedJson: unknown = JSON.parse(raw);
  const validated = aiResponseSchema.parse(parsedJson);
  return validated.words.map((w) => ({
    id: `ai-${w.word.toLowerCase()}`,
    word: w.word.toLowerCase(),
    ageGroup: age,
    difficulty,
    syllables: w.syllables,
    chunks: w.chunks,
    hint: w.hint,
  }));
}

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
    const words = await generateAiWords(age, difficulty, count);
    logger.info(
      { evt: "spelling.ai_generate", userId, age, difficulty, count: words.length },
      "ai words generated",
    );
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
// LEGACY endpoint — accepts client-asserted `correct` for modes where the
// trust model says it's acceptable: Parent Mode (parent grades), Learn
// (no real grading, just navigation credit), and Practice (client-side
// puzzles where the answer is locally derivable anyway).
//
// Competition + Dictation MUST use the session flow below. The required
// `source` field is what gates this — a tampered client posting blanket
// `correct: true` from Competition is rejected at the schema layer.
const recordAttemptSchema = z.object({
  childId: z.number().int().positive(),
  ageGroup: ageGroupSchema,
  correct: z.boolean(),
  source: legacySourceSchema,
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
  const { childId, ageGroup, correct, source } = parsed.data;

  if (!(await ownsChild(userId, childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const updated = await recordAttemptTxn(userId, childId, ageGroup, correct);
  logger.info(
    {
      evt: "spelling.legacy_progress",
      userId,
      childId,
      ageGroup,
      source,
      correct,
    },
    "legacy progress attempt recorded",
  );
  res.json({ ok: true, progress: updated });
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

// ─── v2: Server-verified session endpoints ──────────────────────────────────
//
// The trust model: server picks the words, server stamps the start time,
// server grades each typed guess, server computes the final score. The
// client only ever sees an opaque sessionToken + per-word audio URLs —
// never the answers.

const aiOpponentSchema = z.enum(["ai_easy", "ai_medium", "ai_hard"]);

/**
 * Public session start schema. Accepts Competition / Dictation / Battle.
 * Tournament-mode sessions are intentionally NOT creatable here — the
 * client must use POST /spelling/tournaments/start, which orchestrates
 * the round sessions internally with mode = "tournament".
 */
const sessionStartSchema = z
  .object({
    childId: z.number().int().positive(),
    ageGroup: ageGroupSchema,
    mode: z.enum(["competition", "dictation", "battle"]),
    difficulty: difficultySchema.default("easy"),
    count: z.number().int().min(1).max(20).default(10),
    source: z.enum(["curated", "ai"]).default("curated"),
    /** Required iff mode === "battle". Picks AI strength. */
    opponent: aiOpponentSchema.optional(),
  })
  .refine((v) => v.mode !== "battle" || !!v.opponent, {
    message: "battle_requires_opponent",
    path: ["opponent"],
  });

/**
 * Project a server-side word into a client-safe shape.
 *  - Always returns `id`, `ageGroup`, `difficulty` (non-revealing metadata).
 *  - Returns `audioUrl` so the client can play the word via the public
 *    session-token-scoped audio endpoint without ever holding the answer
 *    string in JS memory.
 *  - syllables / chunks / hint are deliberately omitted because each
 *    leaks the answer (chunks IS the answer for spelling).
 *  - The `word` field is omitted from the client payload entirely.
 */
function safeWordFor(
  sessionToken: string,
  index: number,
  word: SpellingWord,
): {
  id: string;
  ageGroup: string;
  difficulty: string;
  audioUrl: string;
  letterCount: number;
} {
  return {
    id: word.id,
    ageGroup: word.ageGroup,
    difficulty: word.difficulty,
    audioUrl: `/api/spelling/sessions/${sessionToken}/audio/${index}.mp3`,
    // Letter count is the only "shape hint" the client gets — needed to
    // render the input box width sensibly. Knowing the length doesn't
    // give away spelling.
    letterCount: word.word.length,
  };
}

/**
 * Pick words + prewarm TTS + insert a v2 session row. Shared between the
 * public start endpoint and the tournament endpoints (which create one
 * session per round). Returns either an `ok` payload with everything
 * the caller needs to respond, or an `error` discriminator the caller
 * can map to an HTTP status code.
 */
async function createSpellingSession(args: {
  userId: string;
  childId: number;
  ageGroup: SpellingAgeGroup;
  mode: "competition" | "dictation" | "tournament" | "battle";
  difficulty: SpellingDifficulty;
  count: number;
  source: "curated" | "ai";
  parentTournamentToken?: string | null;
  aiOpponent?: AiOpponent | null;
}): Promise<
  | {
      ok: true;
      sessionToken: string;
      startedAt: Date;
      safeWords: ReturnType<typeof safeWordFor>[];
      aiResults: Array<{ correct: boolean; ms: number }> | null;
    }
  | { ok: false; error: "no_words_available" | "audio_unavailable" }
> {
  let words: SpellingWord[] = [];
  if (args.source === "ai") {
    try {
      words = await generateAiWords(args.ageGroup, args.difficulty, args.count);
    } catch (err) {
      logger.warn(
        {
          evt: "spelling.session_ai_fallback",
          userId: args.userId,
          code: err instanceof Error ? err.message : "ai_failed",
        },
        "ai word generation failed, falling back to curated",
      );
    }
  }
  if (words.length === 0) {
    const pool = SPELLING_WORDS.filter(
      (w) => w.ageGroup === args.ageGroup && w.difficulty === args.difficulty,
    );
    words = sample(pool, args.count);
  }
  if (words.length === 0) {
    return { ok: false, error: "no_words_available" };
  }

  // Pre-warm TTS so the first audio request is a cache hit. Sequential
  // for backpressure against ElevenLabs quotas + a clear failure mode.
  const audioKeys: string[] = [];
  try {
    for (const w of words) {
      const r = await synthesize(w.word, {});
      audioKeys.push(r.cacheKey);
    }
  } catch (err) {
    const code = err instanceof Error ? err.message : "tts_failed";
    logger.error(
      { evt: "spelling.session_tts_failed", userId: args.userId, code },
      "session start failed: tts prewarm error",
    );
    return { ok: false, error: "audio_unavailable" };
  }

  const sessionToken = crypto.randomUUID();
  // Battle mode: simulate the AI opponent ONCE, deterministically
  // seeded by the (just-minted) sessionToken. Stored in the session
  // row so subsequent attempt/finalize calls return the same numbers.
  const aiResults = args.aiOpponent
    ? simulateAiOpponent(words.length, args.aiOpponent, sessionToken)
    : null;

  const inserted = await db
    .insert(spellingSessionsTable)
    .values({
      sessionToken,
      childId: args.childId,
      userId: args.userId,
      ageGroup: args.ageGroup,
      mode: args.mode,
      difficulty: args.difficulty,
      words: words.map((w) => ({
        id: w.id,
        word: w.word,
        ageGroup: w.ageGroup,
        difficulty: w.difficulty,
        syllables: w.syllables,
        chunks: w.chunks,
        hint: w.hint,
      })),
      audioKeys,
      attempts: {},
      parentTournamentToken: args.parentTournamentToken ?? null,
      aiOpponent: args.aiOpponent ?? null,
      aiResults,
    })
    .returning({ startedAt: spellingSessionsTable.startedAt });

  return {
    ok: true,
    sessionToken,
    startedAt: inserted[0]?.startedAt ?? new Date(),
    safeWords: words.map((w, i) => safeWordFor(sessionToken, i, w)),
    aiResults,
  };
}

router.post("/spelling/sessions/start", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = sessionStartSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const { childId, ageGroup, mode, difficulty, count, source, opponent } =
    parsed.data;

  if (!(await ownsChild(userId, childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const result = await createSpellingSession({
    userId,
    childId,
    ageGroup,
    mode,
    difficulty,
    count,
    source,
    aiOpponent: opponent ?? null,
  });

  if (!result.ok) {
    res
      .status(result.error === "no_words_available" ? 500 : 502)
      .json({ error: result.error });
    return;
  }

  logger.info(
    {
      evt: "spelling.session_start",
      userId,
      childId,
      mode,
      ageGroup,
      difficulty,
      count: result.safeWords.length,
      opponent: opponent ?? null,
    },
    "spelling session started",
  );

  res.json({
    ok: true,
    sessionToken: result.sessionToken,
    mode,
    ageGroup,
    difficulty,
    opponent: opponent ?? null,
    aiOpponentLabel: opponent ? AI_OPPONENTS[opponent].label : null,
    startedAt: result.startedAt,
    words: result.safeWords,
  });
});

const sessionAttemptSchema = z.object({
  wordIndex: z.number().int().min(0).max(50),
  guess: z.string().min(1).max(60),
});

const sessionTokenParamSchema = z.object({
  token: z.string().regex(/^[a-zA-Z0-9-]{8,128}$/),
});

router.post(
  "/spelling/sessions/:token/attempt",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const tokenParsed = sessionTokenParamSchema.safeParse(req.params);
    if (!tokenParsed.success) {
      res.status(400).json({ error: "invalid_token" });
      return;
    }

    const bodyParsed = sessionAttemptSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res
        .status(400)
        .json({ error: "invalid_body", issues: bodyParsed.error.flatten() });
      return;
    }

    const { token } = tokenParsed.data;
    const { wordIndex, guess } = bodyParsed.data;

    // Load session, verify ownership, verify not finalized, verify index.
    // Doing the read outside the txn keeps the lock window minimal — the
    // attempt write below uses a SELECT … FOR UPDATE for atomicity.
    const sessionRows = await db
      .select()
      .from(spellingSessionsTable)
      .where(eq(spellingSessionsTable.sessionToken, token))
      .limit(1);
    const session = sessionRows[0];
    if (!session || session.userId !== userId) {
      // Treat ownership mismatch as 404 to avoid leaking session existence.
      res.status(404).json({ error: "session_not_found" });
      return;
    }
    if (session.finalizedAt) {
      res.status(409).json({ error: "session_finalized" });
      return;
    }
    if (wordIndex < 0 || wordIndex >= session.words.length) {
      res.status(400).json({ error: "word_index_out_of_range" });
      return;
    }

    // Replay protection: if this index is already graded, return the
    // PREVIOUS verdict instead of re-grading. This means a tampered
    // client cannot keep retrying with different guesses.
    const existingAttempt = session.attempts?.[String(wordIndex)];
    if (existingAttempt) {
      res.status(409).json({
        error: "already_graded",
        previous: existingAttempt,
      });
      return;
    }

    const target = session.words[wordIndex]?.word ?? "";
    const correct =
      normaliseSpellingGuess(guess) === normaliseSpellingGuess(target);
    const ts = new Date().toISOString();

    // Atomic compare-and-set on attempts so two concurrent requests for
    // the same wordIndex don't both win. Postgres `jsonb_set` only writes
    // if the path is currently absent (we additionally guard with
    // `attempts ?? <key>` style checks via WHERE clause).
    const updated = await db
      .update(spellingSessionsTable)
      .set({
        attempts: sql`jsonb_set(${spellingSessionsTable.attempts}, ${`{${wordIndex}}`}::text[], ${JSON.stringify({ guess, correct, ts })}::jsonb, true)`,
      })
      .where(
        and(
          eq(spellingSessionsTable.sessionToken, token),
          // Refuse to write if the attempt slot is already populated —
          // belt-and-braces alongside the check above for the
          // concurrent-submission case.
          sql`NOT (${spellingSessionsTable.attempts} ? ${String(wordIndex)})`,
          // Refuse to write if a finalize raced ahead of us. Without
          // this guard, a finalize that started after the !finalizedAt
          // check above could commit between the read and this UPDATE,
          // letting an attempt slip in AFTER the session was finalized
          // — that attempt would not be reflected in the finalized
          // score / leaderboard row.
          isNull(spellingSessionsTable.finalizedAt),
        ),
      )
      .returning({ id: spellingSessionsTable.id });

    if (updated.length === 0) {
      // Lost the race — could be (a) another attempt for this index
      // landed first, or (b) a finalize raced ahead of us. Re-read and
      // disambiguate so the client gets a clear error.
      const reread = await db
        .select({
          attempts: spellingSessionsTable.attempts,
          finalizedAt: spellingSessionsTable.finalizedAt,
        })
        .from(spellingSessionsTable)
        .where(eq(spellingSessionsTable.sessionToken, token))
        .limit(1);
      if (reread[0]?.finalizedAt) {
        res.status(409).json({ error: "session_finalized" });
        return;
      }
      const winner = reread[0]?.attempts?.[String(wordIndex)];
      res
        .status(409)
        .json({ error: "already_graded", previous: winner ?? null });
      return;
    }

    // Update progress (stars / level / badges) per attempt for live UI.
    // Competition mode also increments per-attempt — the leaderboard
    // row gets written separately at finalize.
    const progress = await recordAttemptTxn(
      userId,
      session.childId,
      session.ageGroup as SpellingAgeGroup,
      correct,
    );

    // Battle mode: surface the AI's per-word result alongside the
    // child's own attempt so the UI can show "AI got it right in 3.2s"
    // immediately after the child submits. Null for non-battle modes.
    const aiResult = session.aiResults?.[wordIndex] ?? null;

    res.json({
      ok: true,
      correct,
      // Reveal the canonical spelling so Dictation can show "It's 'ship'"
      // on a wrong answer — Competition UI hides this until finalize.
      correctAnswer: target,
      progress,
      aiResult,
    });
  },
);

/** Discriminator returned by the finalize helper. */
type FinalizeOutcome =
  | { kind: "not_found" }
  | {
      kind: "finalized" | "already_finalized";
      mode: string;
      wordsAttempted: number;
      wordsCorrect: number;
      durationSec: number;
      accuracyPct: number;
      score: number | null;
      aiScore: number | null;
      winner: "you" | "ai" | "tie" | null;
      competitionScoreId: number | null;
      childId: number;
      ageGroup: string;
      parentTournamentToken: string | null;
    };

/**
 * Idempotent server-side session finalize. Pure of HTTP concerns so it
 * can be invoked from BOTH the public endpoint AND the tournament
 * `/advance` endpoint (which finalizes the active round before deciding
 * whether to start the next one). Always runs in a single transaction
 * with row-locking so concurrent calls don't double-insert leaderboard
 * rows.
 */
export async function finalizeSpellingSession(
  userId: string,
  token: string,
): Promise<FinalizeOutcome> {
  return db.transaction(async (tx): Promise<FinalizeOutcome> => {
    const rows = await tx
      .select()
      .from(spellingSessionsTable)
      .where(eq(spellingSessionsTable.sessionToken, token))
      .for("update")
      .limit(1);
    const session = rows[0];
    if (!session || session.userId !== userId) {
      return { kind: "not_found" };
    }

    const wordsAttempted = Object.keys(session.attempts).length;
    const wordsCorrect = (
      Object.values(session.attempts) as Array<{
        guess: string;
        correct: boolean;
        ts: string;
      }>
    ).filter((a) => a.correct).length;

    /** Decide winner from a (score, aiScore) pair. */
    const winnerOf = (s: number | null, a: number | null): "you" | "ai" | "tie" | null => {
      if (s === null || a === null) return null;
      if (s > a) return "you";
      if (s < a) return "ai";
      return "tie";
    };

    // Already finalized → recompute response from stored columns. NEVER
    // re-insert a leaderboard row.
    if (session.finalizedAt) {
      const fAttempted = session.finalWordsAttempted ?? wordsAttempted;
      const fCorrect = session.finalWordsCorrect ?? wordsCorrect;
      return {
        kind: "already_finalized",
        mode: session.mode,
        wordsAttempted: fAttempted,
        wordsCorrect: fCorrect,
        durationSec: session.finalDurationSec ?? 0,
        accuracyPct:
          fAttempted === 0 ? 0 : Math.round((fCorrect / fAttempted) * 100),
        score: session.finalScore,
        aiScore: session.aiFinalScore,
        winner: winnerOf(session.finalScore, session.aiFinalScore),
        competitionScoreId: session.competitionScoreId,
        childId: session.childId,
        ageGroup: session.ageGroup,
        parentTournamentToken: session.parentTournamentToken,
      };
    }

    // Server-stamped duration: now - startedAt, clamped to >= 1s so the
    // score formula can never divide by zero. The start time is
    // server-authored; there is no client-side duration to validate.
    const startedMs = session.startedAt.getTime();
    const elapsedSec = Math.max(
      1,
      Math.round((Date.now() - startedMs) / 1000),
    );
    const accuracyPct =
      wordsAttempted === 0
        ? 0
        : Math.round((wordsCorrect / wordsAttempted) * 100);

    let score: number | null = null;
    let aiScore: number | null = null;
    let competitionScoreId: number | null = null;

    if (
      (session.mode === "competition" ||
        session.mode === "tournament" ||
        session.mode === "battle") &&
      wordsAttempted > 0
    ) {
      score = computeCompetitionScore(wordsCorrect, elapsedSec);
    }

    // Only Competition mode writes the public leaderboard row.
    // Tournament + Battle keep their scores private to the run.
    if (session.mode === "competition" && score !== null) {
      const inserted = await tx
        .insert(spellingCompetitionScoresTable)
        .values({
          childId: session.childId,
          userId: session.userId,
          ageGroup: session.ageGroup,
          wordsAttempted,
          wordsCorrect,
          accuracyPct,
          durationSec: elapsedSec,
          score,
        })
        .returning({ id: spellingCompetitionScoresTable.id });
      competitionScoreId = inserted[0]?.id ?? null;
    }

    // Battle mode: AI score from its pre-stored simulated results.
    if (session.mode === "battle" && session.aiResults) {
      aiScore = computeAiScore(session.aiResults).score;
    }

    await tx
      .update(spellingSessionsTable)
      .set({
        finalizedAt: sql`now()`,
        finalScore: score,
        finalDurationSec: elapsedSec,
        finalWordsAttempted: wordsAttempted,
        finalWordsCorrect: wordsCorrect,
        competitionScoreId,
        aiFinalScore: aiScore,
      })
      .where(eq(spellingSessionsTable.sessionToken, token));

    return {
      kind: "finalized",
      mode: session.mode,
      wordsAttempted,
      wordsCorrect,
      durationSec: elapsedSec,
      accuracyPct,
      score,
      aiScore,
      winner: winnerOf(score, aiScore),
      competitionScoreId,
      childId: session.childId,
      ageGroup: session.ageGroup,
      parentTournamentToken: session.parentTournamentToken,
    };
  });
}

router.post(
  "/spelling/sessions/:token/finalize",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const tokenParsed = sessionTokenParamSchema.safeParse(req.params);
    if (!tokenParsed.success) {
      res.status(400).json({ error: "invalid_token" });
      return;
    }
    const { token } = tokenParsed.data;

    const result = await finalizeSpellingSession(userId, token);

    if (result.kind === "not_found") {
      res.status(404).json({ error: "session_not_found" });
      return;
    }

    logger.info(
      {
        evt: "spelling.session_finalize",
        userId,
        token,
        kind: result.kind,
        mode: result.mode,
        score: result.score,
        aiScore: result.aiScore,
      },
      "spelling session finalized",
    );

    res.json({
      ok: true,
      summary: {
        mode: result.mode,
        wordsAttempted: result.wordsAttempted,
        wordsCorrect: result.wordsCorrect,
        durationSec: result.durationSec,
        accuracyPct: result.accuracyPct,
        score: result.score,
        aiScore: result.aiScore,
        winner: result.winner,
      },
      competitionScoreId: result.competitionScoreId,
      alreadyFinalized: result.kind === "already_finalized",
    });
  },
);

// ─── Tournament endpoints ───────────────────────────────────────────────────
//
// A tournament is a wrapper around 3 ordinary v2 sessions (one per
// round). The client only ever holds the tournament's opaque token +
// the active round's session token. Round difficulty + word count are
// server-authored (TOURNAMENT_ROUND_CONFIG); the client cannot bias them.

const tournamentTokenParamSchema = z.object({
  tournamentToken: z.string().regex(/^[a-zA-Z0-9-]{8,128}$/),
});

const tournamentStartSchema = z.object({
  childId: z.number().int().positive(),
  ageGroup: ageGroupSchema,
});

/**
 * Project a tournament row into a client-safe shape. Strips internal
 * IDs but preserves the rounds array (which only contains scores +
 * counts, no actual answers).
 */
function serializeTournament(t: SpellingTournamentRow) {
  return {
    tournamentToken: t.tournamentToken,
    childId: t.childId,
    ageGroup: t.ageGroup,
    status: t.status,
    currentRound: t.currentRound,
    rounds: t.rounds,
    totalScore: t.totalScore,
    eliminatedAtRound: t.eliminatedAtRound,
    startedAt: t.startedAt,
    finalizedAt: t.finalizedAt,
  };
}

router.post(
  "/spelling/tournaments/start",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const parsed = tournamentStartSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid_body", issues: parsed.error.flatten() });
      return;
    }
    const { childId, ageGroup } = parsed.data;

    if (!(await ownsChild(userId, childId))) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const tournamentToken = crypto.randomUUID();
    const r1 = getRoundConfig(1);

    // Create the round-1 session FIRST. If the session can't be created
    // (e.g. TTS down), we never insert a tournament row at all so the
    // client just sees a clean failure with no orphan state.
    const sessionResult = await createSpellingSession({
      userId,
      childId,
      ageGroup,
      mode: "tournament",
      difficulty: r1.difficulty,
      count: r1.wordCount,
      source: "curated",
      parentTournamentToken: tournamentToken,
    });

    if (!sessionResult.ok) {
      res
        .status(sessionResult.error === "no_words_available" ? 500 : 502)
        .json({ error: sessionResult.error });
      return;
    }

    const inserted = await db
      .insert(spellingTournamentsTable)
      .values({
        tournamentToken,
        userId,
        childId,
        ageGroup,
        status: "active",
        currentRound: 1,
        rounds: [],
        totalScore: 0,
      })
      .returning();
    const tournament = inserted[0];
    if (!tournament) {
      res.status(500).json({ error: "tournament_create_failed" });
      return;
    }

    logger.info(
      {
        evt: "spelling.tournament_start",
        userId,
        childId,
        ageGroup,
        tournamentToken,
      },
      "tournament started",
    );

    res.json({
      ok: true,
      tournament: serializeTournament(tournament),
      session: {
        sessionToken: sessionResult.sessionToken,
        mode: "tournament" as const,
        ageGroup,
        difficulty: r1.difficulty,
        round: 1,
        passThreshold: r1.passThreshold,
        startedAt: sessionResult.startedAt,
        words: sessionResult.safeWords,
      },
    });
  },
);

router.post(
  "/spelling/tournaments/:tournamentToken/advance",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const parsed = tournamentTokenParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_token" });
      return;
    }
    const { tournamentToken } = parsed.data;

    // Race-safety: a double-tap on "Continue" can fire two /advance
    // requests in flight. Without serialization both could pass the
    // status === "active" check, both call finalize (fine — finalize is
    // idempotent), but then both proceed to createSpellingSession for
    // the next round — leaving an orphan round-session row. Wrap the
    // whole handler in a transaction and SELECT … FOR UPDATE on the
    // tournament row so the second caller blocks until the first
    // commits, then re-reads the now-non-active status and 409s.
    //
    // finalizeSpellingSession + createSpellingSession open their own
    // top-level transactions on a separate pooled connection — they
    // touch the spelling_sessions row (different row, no lock conflict),
    // not the tournament row, so they don't deadlock with our outer tx.
    const txResult = await db.transaction(async (tx) => {
      const tRows = await tx
        .select()
        .from(spellingTournamentsTable)
        .where(eq(spellingTournamentsTable.tournamentToken, tournamentToken))
        .for("update")
        .limit(1);
      const tournament = tRows[0];
      if (!tournament || tournament.userId !== userId) {
        return { kind: "not_found" as const };
      }
      if (tournament.status !== "active") {
        return {
          kind: "not_active" as const,
          tournament,
        };
      }

      // Find the most recent session linked to this tournament — that's
      // the active round to finalize.
      const sessionRows = await tx
        .select()
        .from(spellingSessionsTable)
        .where(
          and(
            eq(spellingSessionsTable.parentTournamentToken, tournamentToken),
            eq(spellingSessionsTable.userId, userId),
          ),
        )
        .orderBy(desc(spellingSessionsTable.startedAt))
        .limit(1);
      const activeSession = sessionRows[0];
      if (!activeSession) {
        return { kind: "no_session" as const };
      }

      const finalizeRes = await finalizeSpellingSession(
        userId,
        activeSession.sessionToken,
      );
      if (finalizeRes.kind === "not_found") {
        return { kind: "session_not_found" as const };
      }

      const currentRound = tournament.currentRound;
      const roundResult: TournamentRoundResult = {
        round: currentRound,
        difficulty: getRoundConfig(currentRound).difficulty,
        sessionToken: activeSession.sessionToken,
        score: finalizeRes.score ?? 0,
        wordsCorrect: finalizeRes.wordsCorrect,
        wordsAttempted: finalizeRes.wordsAttempted,
        durationSec: finalizeRes.durationSec,
      };

      const next = applyRoundResult(
        { rounds: tournament.rounds, totalScore: tournament.totalScore },
        roundResult,
      );

      await tx
        .update(spellingTournamentsTable)
        .set({
          status: next.status,
          currentRound: next.currentRound,
          rounds: next.rounds,
          totalScore: next.totalScore,
          eliminatedAtRound: next.eliminatedAtRound,
          finalizedAt: next.status === "active" ? null : sql`now()`,
        })
        .where(eq(spellingTournamentsTable.tournamentToken, tournamentToken));

      return {
        kind: "ok" as const,
        tournament,
        currentRound,
        roundResult,
        next,
      };
    });

    if (txResult.kind === "not_found") {
      res.status(404).json({ error: "tournament_not_found" });
      return;
    }
    if (txResult.kind === "not_active") {
      res.status(409).json({
        error: "tournament_not_active",
        tournament: serializeTournament(txResult.tournament),
      });
      return;
    }
    if (txResult.kind === "no_session") {
      res.status(500).json({ error: "no_active_round_session" });
      return;
    }
    if (txResult.kind === "session_not_found") {
      res.status(404).json({ error: "session_not_found" });
      return;
    }
    const { tournament, currentRound, roundResult, next } = txResult;

    // Start the next round's session if we advanced.
    let nextSession: {
      sessionToken: string;
      mode: "tournament";
      ageGroup: string;
      difficulty: SpellingDifficulty;
      round: number;
      passThreshold: number;
      startedAt: Date;
      words: ReturnType<typeof safeWordFor>[];
    } | null = null;
    if (next.status === "active") {
      const cfg = getRoundConfig(next.currentRound);
      const sessRes = await createSpellingSession({
        userId,
        childId: tournament.childId,
        ageGroup: tournament.ageGroup as SpellingAgeGroup,
        mode: "tournament",
        difficulty: cfg.difficulty,
        count: cfg.wordCount,
        source: "curated",
        parentTournamentToken: tournamentToken,
      });
      if (!sessRes.ok) {
        res.status(502).json({ error: sessRes.error });
        return;
      }
      nextSession = {
        sessionToken: sessRes.sessionToken,
        mode: "tournament",
        ageGroup: tournament.ageGroup,
        difficulty: cfg.difficulty,
        round: next.currentRound,
        passThreshold: cfg.passThreshold,
        startedAt: sessRes.startedAt,
        words: sessRes.safeWords,
      };
    }

    const refreshed = await db
      .select()
      .from(spellingTournamentsTable)
      .where(eq(spellingTournamentsTable.tournamentToken, tournamentToken))
      .limit(1);

    logger.info(
      {
        evt: "spelling.tournament_advance",
        userId,
        tournamentToken,
        fromRound: currentRound,
        status: next.status,
        passed: next.passed,
        roundScore: roundResult.score,
        totalScore: next.totalScore,
      },
      "tournament round advanced",
    );

    res.json({
      ok: true,
      tournament: refreshed[0]
        ? serializeTournament(refreshed[0])
        : serializeTournament(tournament),
      lastRound: { ...roundResult, passed: next.passed },
      nextSession,
    });
  },
);

router.get(
  "/spelling/tournaments/:tournamentToken",
  async (req, res): Promise<void> => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const parsed = tournamentTokenParamSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_token" });
      return;
    }
    const { tournamentToken } = parsed.data;

    const tRows = await db
      .select()
      .from(spellingTournamentsTable)
      .where(eq(spellingTournamentsTable.tournamentToken, tournamentToken))
      .limit(1);
    const t = tRows[0];
    if (!t || t.userId !== userId) {
      res.status(404).json({ error: "tournament_not_found" });
      return;
    }

    // For active tournaments, also include the in-flight round's
    // session shape so a refresh / new device can resume.
    let activeSession:
      | {
          sessionToken: string;
          mode: "tournament";
          ageGroup: string;
          difficulty: string;
          round: number;
          passThreshold: number;
          startedAt: Date;
          words: ReturnType<typeof safeWordFor>[];
        }
      | null = null;
    if (t.status === "active") {
      const sessionRows = await db
        .select()
        .from(spellingSessionsTable)
        .where(
          and(
            eq(spellingSessionsTable.parentTournamentToken, t.tournamentToken),
            eq(spellingSessionsTable.userId, userId),
          ),
        )
        .orderBy(desc(spellingSessionsTable.startedAt))
        .limit(1);
      const s = sessionRows[0];
      if (s && !s.finalizedAt) {
        activeSession = {
          sessionToken: s.sessionToken,
          mode: "tournament",
          ageGroup: s.ageGroup,
          difficulty: s.difficulty,
          round: t.currentRound,
          passThreshold: getRoundConfig(t.currentRound).passThreshold,
          startedAt: s.startedAt,
          words: (s.words as SpellingWord[]).map((w, i) =>
            safeWordFor(s.sessionToken, i, w),
          ),
        };
      }
    }

    res.json({
      ok: true,
      tournament: serializeTournament(t),
      activeSession,
    });
  },
);

// ─── Public router: session-scoped audio streaming ──────────────────────────
//
// The audio MUST be reachable from <audio> tags without juggling bearer
// tokens. The session token itself authenticates — it's an unguessable
// UUID handed out only to the parent who owns the child. Anyone with
// the token can fetch the audio (which they could already hear by
// playing the page), but they CAN'T fetch the answer string.
export const spellingPublicRouter: IRouter = Router();

spellingPublicRouter.get(
  "/spelling/sessions/:token/audio/:idx.mp3",
  async (req, res): Promise<void> => {
    const token = String(req.params.token ?? "");
    if (!/^[a-zA-Z0-9-]{8,128}$/.test(token)) {
      res.status(400).json({ error: "invalid_token" });
      return;
    }
    const idx = Number(req.params.idx);
    if (!Number.isInteger(idx) || idx < 0 || idx > 100) {
      res.status(400).json({ error: "invalid_idx" });
      return;
    }

    try {
      const rows = await db
        .select({ audioKeys: spellingSessionsTable.audioKeys })
        .from(spellingSessionsTable)
        .where(eq(spellingSessionsTable.sessionToken, token))
        .limit(1);
      const session = rows[0];
      if (!session || idx >= session.audioKeys.length) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const key = session.audioKeys[idx];
      if (!key) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const cached = await readCachedAudio(key);
      if (!cached) {
        res.status(404).json({ error: "audio_not_found" });
        return;
      }
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Length", String(cached.buffer.byteLength));
      // Per-session audio: short cache so a finalised / abandoned session
      // doesn't keep serving forever. Browsers + the proxy can still
      // cache the few MP3s a single run actually plays.
      res.setHeader("Cache-Control", "private, max-age=300");
      res.status(200).end(cached.buffer);
    } catch (err) {
      logger.error(
        {
          evt: "spelling.audio_stream_failed",
          token,
          idx,
          message: err instanceof Error ? err.message : String(err),
        },
        "spelling session audio stream failed",
      );
      res.status(500).json({ error: "server_error" });
    }
  },
);

// Re-export age-group constants so other routes / tests can stay in sync.
export { SPELLING_AGE_GROUPS };
export default router;
