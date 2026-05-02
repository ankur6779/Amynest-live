import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import crypto from "node:crypto";
import {
  db,
  spellingProgressTable,
  spellingCompetitionScoresTable,
  spellingSessionsTable,
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
import { readCachedAudio, synthesize } from "../services/elevenLabsService";

const router: IRouter = Router();

// ─── Shared validators ───────────────────────────────────────────────────────
const ageGroupSchema = z.enum(["2-4", "4-6", "6-8", "8-10+"]);
const difficultySchema = z.enum(["easy", "medium", "hard"]);
/**
 * Trust source for legacy POST /spelling/progress. Each value is a mode
 * where the per-attempt correctness is asserted by someone other than the
 * tampered-client surface:
 *  - "parent":   parent literally taps ✓/✗ in Parent Mode
 *  - "learn":    "I learned it" navigation in Learn mode (no real grading)
 *  - "practice": Missing-Letter / Jumbled-Letter games — client-graded but
 *                the puzzle structure makes inflation per-word effort
 *
 * Competition + Dictation now go through the server-graded session flow
 * (POST /spelling/sessions/...). Any caller posting to the legacy endpoint
 * MUST tag the source so we can reason about leaderboard integrity.
 */
const legacySourceSchema = z.enum(["parent", "learn", "practice"]);

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

const sessionStartSchema = z.object({
  childId: z.number().int().positive(),
  ageGroup: ageGroupSchema,
  mode: z.enum(["competition", "dictation"]),
  difficulty: difficultySchema.default("easy"),
  count: z.number().int().min(1).max(20).default(10),
  source: z.enum(["curated", "ai"]).default("curated"),
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
  const { childId, ageGroup, mode, difficulty, count, source } = parsed.data;

  if (!(await ownsChild(userId, childId))) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  // Pick words server-side. AI generation falls back to the curated
  // catalog on any failure so a flaky upstream doesn't break the run.
  let words: SpellingWord[] = [];
  if (source === "ai") {
    try {
      words = await generateAiWords(ageGroup, difficulty, count);
    } catch (err) {
      logger.warn(
        {
          evt: "spelling.session_ai_fallback",
          userId,
          code: err instanceof Error ? err.message : "ai_failed",
        },
        "ai word generation failed, falling back to curated",
      );
    }
  }
  if (words.length === 0) {
    const pool = SPELLING_WORDS.filter(
      (w) => w.ageGroup === ageGroup && w.difficulty === difficulty,
    );
    words = sample(pool, count);
  }
  if (words.length === 0) {
    res.status(500).json({ error: "no_words_available" });
    return;
  }

  // Pre-warm TTS so the client's first audio request is a cache hit. Also
  // gives us the deterministic cacheKeys we'll store in the session row.
  // Synthesise sequentially: we want backpressure against ElevenLabs
  // quotas + a clear failure mode if any single word fails.
  const audioKeys: string[] = [];
  try {
    for (const w of words) {
      const r = await synthesize(w.word, {});
      audioKeys.push(r.cacheKey);
    }
  } catch (err) {
    const code = err instanceof Error ? err.message : "tts_failed";
    logger.error(
      { evt: "spelling.session_tts_failed", userId, code },
      "session start failed: tts prewarm error",
    );
    res.status(502).json({ error: "audio_unavailable" });
    return;
  }

  const sessionToken = crypto.randomUUID();

  const inserted = await db
    .insert(spellingSessionsTable)
    .values({
      sessionToken,
      childId,
      userId,
      ageGroup,
      mode,
      difficulty,
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
    })
    .returning({ startedAt: spellingSessionsTable.startedAt });

  logger.info(
    {
      evt: "spelling.session_start",
      userId,
      childId,
      mode,
      ageGroup,
      difficulty,
      count: words.length,
    },
    "spelling session started",
  );

  res.json({
    ok: true,
    sessionToken,
    mode,
    ageGroup,
    difficulty,
    startedAt: inserted[0]?.startedAt ?? new Date().toISOString(),
    words: words.map((w, i) => safeWordFor(sessionToken, i, w)),
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
        ),
      )
      .returning({ id: spellingSessionsTable.id });

    if (updated.length === 0) {
      // Lost the race — re-read and return the winning attempt.
      const reread = await db
        .select({ attempts: spellingSessionsTable.attempts })
        .from(spellingSessionsTable)
        .where(eq(spellingSessionsTable.sessionToken, token))
        .limit(1);
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

    res.json({
      ok: true,
      correct,
      // Reveal the canonical spelling so Dictation can show "It's 'ship'"
      // on a wrong answer — Competition UI hides this until finalize.
      correctAnswer: target,
      progress,
    });
  },
);

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

    // Idempotent finalize: do everything inside a transaction with a row
    // lock so two concurrent finalize calls don't race to insert two
    // leaderboard rows. The first wins and stamps `finalizedAt`; the
    // second observes that and returns the same summary.
    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(spellingSessionsTable)
        .where(eq(spellingSessionsTable.sessionToken, token))
        .for("update")
        .limit(1);
      const session = rows[0];
      if (!session || session.userId !== userId) {
        return { kind: "not_found" as const };
      }

      const wordsAttempted = Object.keys(session.attempts).length;
      const wordsCorrect = (
        Object.values(session.attempts) as Array<{
          guess: string;
          correct: boolean;
          ts: string;
        }>
      ).filter((a) => a.correct).length;

      // If already finalized, recompute the response from stored fields
      // — never insert a new leaderboard row.
      if (session.finalizedAt) {
        return {
          kind: "already_finalized" as const,
          summary: {
            mode: session.mode,
            wordsAttempted: session.finalWordsAttempted ?? wordsAttempted,
            wordsCorrect: session.finalWordsCorrect ?? wordsCorrect,
            durationSec: session.finalDurationSec ?? 0,
            accuracyPct:
              (session.finalWordsAttempted ?? wordsAttempted) === 0
                ? 0
                : Math.round(
                    ((session.finalWordsCorrect ?? wordsCorrect) /
                      (session.finalWordsAttempted ?? wordsAttempted)) *
                      100,
                  ),
            score: session.finalScore,
          },
          competitionScoreId: session.competitionScoreId,
        };
      }

      // Server-stamped duration: now - startedAt. Clamp to >= 1s so
      // accidental sub-second runs don't divide-by-zero in the score
      // formula. We do NOT clamp to >= wordsAttempted here because the
      // start time is server-authored — there is no client-side
      // duration to validate.
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
      let competitionScoreId: number | null = null;

      // Only Competition mode writes a leaderboard row. Dictation just
      // closes out the session — its progress increments already
      // happened per-attempt.
      if (session.mode === "competition" && wordsAttempted > 0) {
        score = computeCompetitionScore(wordsCorrect, elapsedSec);
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

      await tx
        .update(spellingSessionsTable)
        .set({
          finalizedAt: sql`now()`,
          finalScore: score,
          finalDurationSec: elapsedSec,
          finalWordsAttempted: wordsAttempted,
          finalWordsCorrect: wordsCorrect,
          competitionScoreId,
        })
        .where(eq(spellingSessionsTable.sessionToken, token));

      return {
        kind: "finalized" as const,
        summary: {
          mode: session.mode,
          wordsAttempted,
          wordsCorrect,
          durationSec: elapsedSec,
          accuracyPct,
          score,
        },
        competitionScoreId,
      };
    });

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
        score: result.summary.score,
      },
      "spelling session finalized",
    );

    res.json({
      ok: true,
      summary: result.summary,
      competitionScoreId: result.competitionScoreId,
      alreadyFinalized: result.kind === "already_finalized",
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
