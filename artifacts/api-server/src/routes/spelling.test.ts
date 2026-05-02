/**
 * Spelling Mastery v2 — pure-logic regression tests.
 *
 * The session endpoints themselves require Firebase auth + a live DB row
 * for the child, which our test rig can't easily produce. So we cover
 * the logic that the trust model depends on:
 *
 *   - normaliseSpellingGuess: must accept benign casing/whitespace
 *     differences but reject anything that isn't actually the same word.
 *   - computeCompetitionScore: deterministic from (correct, duration);
 *     a tampered client posting a faster duration must produce a
 *     bounded, predictable score change.
 *   - applyAttempt: stars / level / streak / badges progress correctly
 *     on a sequence of attempts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  normaliseSpellingGuess,
  computeCompetitionScore,
  applyAttempt,
  getRoundConfig,
  applyRoundResult,
  simulateAiOpponent,
  computeAiScore,
  finalizeSpellingSession,
  _safeWordForTest,
  AI_OPPONENTS,
  TOURNAMENT_ROUND_CONFIG,
  type TournamentRoundResult,
  _advanceTournamentTxForTest,
} from "./spelling";
import {
  db,
  spellingSessionsTable,
  spellingCompetitionScoresTable,
  spellingTournamentsTable,
} from "@workspace/db";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

describe("normaliseSpellingGuess", () => {
  it("treats trailing whitespace as equal", () => {
    assert.equal(normaliseSpellingGuess("ship "), normaliseSpellingGuess("ship"));
    assert.equal(normaliseSpellingGuess("  ship\n"), normaliseSpellingGuess("ship"));
  });

  it("treats casing as equal", () => {
    assert.equal(normaliseSpellingGuess("Ship"), normaliseSpellingGuess("ship"));
    assert.equal(normaliseSpellingGuess("SHIP"), normaliseSpellingGuess("ship"));
  });

  it("strips internal whitespace (a kid typing 'sh ip')", () => {
    assert.equal(normaliseSpellingGuess("sh ip"), normaliseSpellingGuess("ship"));
    assert.equal(normaliseSpellingGuess("s h i p"), normaliseSpellingGuess("ship"));
  });

  it("rejects an actually-different word", () => {
    assert.notEqual(
      normaliseSpellingGuess("shop"),
      normaliseSpellingGuess("ship"),
    );
    assert.notEqual(
      normaliseSpellingGuess("ships"),
      normaliseSpellingGuess("ship"),
    );
  });

  it("normalises NFKC so visually identical unicode matches", () => {
    // Full-width 's' (U+FF53) should normalise to ASCII 's' under NFKC.
    assert.equal(
      normaliseSpellingGuess("\uFF53hip"),
      normaliseSpellingGuess("ship"),
    );
  });
});

describe("computeCompetitionScore", () => {
  it("awards 100 points per correct word as the base", () => {
    // 0 correct -> 0 score regardless of duration
    assert.equal(computeCompetitionScore(0, 30), 0);
    // 10 correct, very long duration -> just the base 1000 (speed bonus = 0)
    assert.equal(computeCompetitionScore(10, 6000), 1000);
  });

  it("adds a speed bonus that decays with duration", () => {
    const fast = computeCompetitionScore(10, 30);
    const slow = computeCompetitionScore(10, 120);
    assert.ok(fast > slow, `fast (${fast}) should beat slow (${slow})`);
    assert.ok(fast >= 1000, "fast run still includes the 100×correct base");
  });

  it("clamps duration so a sub-second run can't divide-by-zero", () => {
    // Even a 0s duration must be a finite number, not Infinity.
    const score = computeCompetitionScore(10, 0);
    assert.ok(Number.isFinite(score));
    assert.ok(score >= 1000);
  });

  it("is deterministic — same inputs, same output", () => {
    assert.equal(
      computeCompetitionScore(7, 45),
      computeCompetitionScore(7, 45),
    );
  });
});

describe("applyAttempt — stars/level/streak progression", () => {
  type Attempt = ReturnType<typeof applyAttempt>;
  const zero: Attempt = {
    totalCorrect: 0,
    totalAttempts: 0,
    totalStars: 0,
    currentLevel: 1,
    currentStreak: 0,
    bestStreak: 0,
    badges: [],
    starsEarnedThisAttempt: 0,
  };

  it("awards 1 star for a correct attempt, 0 for wrong", () => {
    const ok = applyAttempt(zero, true);
    assert.equal(ok.starsEarnedThisAttempt, 1);
    assert.equal(ok.totalStars, 1);
    const bad = applyAttempt(zero, false);
    assert.equal(bad.starsEarnedThisAttempt, 0);
    assert.equal(bad.totalStars, 0);
  });

  it("breaks streak on a wrong answer", () => {
    let s: Attempt = zero;
    s = applyAttempt(s, true);
    s = applyAttempt(s, true);
    assert.equal(s.currentStreak, 2);
    s = applyAttempt(s, false);
    assert.equal(s.currentStreak, 0);
    assert.equal(s.bestStreak, 2);
  });

  it("awards a 2-star bonus on a streak-of-5 boundary", () => {
    let s: Attempt = zero;
    for (let i = 0; i < 4; i++) s = applyAttempt(s, true);
    assert.equal(s.currentStreak, 4);
    // 5th correct: bonus
    s = applyAttempt(s, true);
    assert.equal(s.currentStreak, 5);
    assert.equal(s.starsEarnedThisAttempt, 2);
    // 6th correct: back to 1
    s = applyAttempt(s, true);
    assert.equal(s.starsEarnedThisAttempt, 1);
  });

  it("levels up at 10 stars (1 per level)", () => {
    let s: Attempt = zero;
    // 9 correct, no streak bonus alignment yet -> stars climb but level stays
    for (let i = 0; i < 9; i++) s = applyAttempt(s, true);
    // After 9 correct in a row we got the 5-bonus once: 8 + 2 = 10 stars
    assert.equal(s.totalStars, 10);
    assert.equal(s.currentLevel, 2);
  });

  it("awards milestone badges deterministically", () => {
    let s: Attempt = zero;
    s = applyAttempt(s, true);
    assert.ok(s.badges.includes("first_word"), "first correct -> first_word");
    // Build a 5-streak
    let t: Attempt = zero;
    for (let i = 0; i < 5; i++) t = applyAttempt(t, true);
    assert.ok(t.badges.includes("spelling_star"), "streak 5 -> spelling_star");
  });
});

// ─── Tournament: getRoundConfig ─────────────────────────────────────────────

describe("getRoundConfig", () => {
  it("returns easy/5/3 for round 1", () => {
    const r = getRoundConfig(1);
    assert.equal(r.difficulty, "easy");
    assert.equal(r.wordCount, 5);
    assert.equal(r.passThreshold, 3);
  });

  it("returns medium/5/3 for round 2", () => {
    const r = getRoundConfig(2);
    assert.equal(r.difficulty, "medium");
    assert.equal(r.wordCount, 5);
    assert.equal(r.passThreshold, 3);
  });

  it("returns hard/5/0 for round 3 (final round always counts)", () => {
    const r = getRoundConfig(3);
    assert.equal(r.difficulty, "hard");
    assert.equal(r.wordCount, 5);
    assert.equal(r.passThreshold, 0);
  });

  it("throws for round 0 / negative / past R3", () => {
    assert.throws(() => getRoundConfig(0));
    assert.throws(() => getRoundConfig(-1));
    assert.throws(() => getRoundConfig(4));
  });

  it("config is exactly 3 rounds", () => {
    assert.equal(TOURNAMENT_ROUND_CONFIG.length, 3);
  });
});

// ─── Tournament: applyRoundResult state machine ─────────────────────────────

describe("applyRoundResult", () => {
  const empty = { rounds: [], totalScore: 0 };

  function roundResult(
    round: 1 | 2 | 3,
    wordsCorrect: number,
    score = 100,
  ): TournamentRoundResult {
    return {
      round,
      difficulty: getRoundConfig(round).difficulty,
      sessionToken: `session-r${round}`,
      score,
      wordsCorrect,
      wordsAttempted: 5,
      durationSec: 30,
    };
  }

  it("R1 pass (>=3 correct) → status active, currentRound=2, totalScore added", () => {
    const next = applyRoundResult(empty, roundResult(1, 4, 120));
    assert.equal(next.status, "active");
    assert.equal(next.currentRound, 2);
    assert.equal(next.totalScore, 120);
    assert.equal(next.eliminatedAtRound, null);
    assert.equal(next.passed, true);
    assert.equal(next.rounds.length, 1);
    assert.equal(next.rounds[0]!.passed, true);
  });

  it("R1 fail (<3 correct) → status eliminated, NO totalScore added", () => {
    const next = applyRoundResult(empty, roundResult(1, 2, 90));
    assert.equal(next.status, "eliminated");
    assert.equal(next.currentRound, 1);
    assert.equal(next.totalScore, 0, "failed round score is NOT added to total");
    assert.equal(next.eliminatedAtRound, 1);
    assert.equal(next.passed, false);
    assert.equal(next.rounds[0]!.passed, false);
  });

  it("R2 pass → status active, currentRound=3, total accumulates", () => {
    const afterR1 = applyRoundResult(empty, roundResult(1, 5, 150));
    const afterR2 = applyRoundResult(
      { rounds: afterR1.rounds, totalScore: afterR1.totalScore },
      roundResult(2, 3, 100),
    );
    assert.equal(afterR2.status, "active");
    assert.equal(afterR2.currentRound, 3);
    assert.equal(afterR2.totalScore, 250);
    assert.equal(afterR2.rounds.length, 2);
  });

  it("R2 fail → eliminated, R1 score preserved, R2 score discarded", () => {
    const afterR1 = applyRoundResult(empty, roundResult(1, 5, 150));
    const afterR2 = applyRoundResult(
      { rounds: afterR1.rounds, totalScore: afterR1.totalScore },
      roundResult(2, 1, 80),
    );
    assert.equal(afterR2.status, "eliminated");
    assert.equal(afterR2.eliminatedAtRound, 2);
    assert.equal(afterR2.totalScore, 150, "only R1 contributed");
    assert.equal(afterR2.passed, false);
  });

  it("R3 always passes (threshold=0) → status completed even with 0 correct", () => {
    const afterR1 = applyRoundResult(empty, roundResult(1, 5, 150));
    const afterR2 = applyRoundResult(
      { rounds: afterR1.rounds, totalScore: afterR1.totalScore },
      roundResult(2, 4, 110),
    );
    const afterR3 = applyRoundResult(
      { rounds: afterR2.rounds, totalScore: afterR2.totalScore },
      roundResult(3, 0, 50),
    );
    assert.equal(afterR3.status, "completed");
    assert.equal(afterR3.passed, true, "R3 threshold is 0");
    assert.equal(afterR3.totalScore, 310);
    assert.equal(afterR3.eliminatedAtRound, null);
  });

  it("R3 with full score → completed, totalScore = sum of all", () => {
    const afterR1 = applyRoundResult(empty, roundResult(1, 5, 150));
    const afterR2 = applyRoundResult(
      { rounds: afterR1.rounds, totalScore: afterR1.totalScore },
      roundResult(2, 5, 130),
    );
    const afterR3 = applyRoundResult(
      { rounds: afterR2.rounds, totalScore: afterR2.totalScore },
      roundResult(3, 5, 200),
    );
    assert.equal(afterR3.status, "completed");
    assert.equal(afterR3.totalScore, 480);
    assert.equal(afterR3.rounds.length, 3);
  });
});

// ─── Battle: simulateAiOpponent determinism + difficulty curve ──────────────

describe("simulateAiOpponent", () => {
  it("is deterministic given the same (count, opponent, seed) triple", () => {
    const a = simulateAiOpponent(10, "ai_medium", "seed-abc-123");
    const b = simulateAiOpponent(10, "ai_medium", "seed-abc-123");
    assert.deepEqual(a, b);
  });

  it("produces the requested word count", () => {
    const r = simulateAiOpponent(7, "ai_easy", "seed-xyz");
    assert.equal(r.length, 7);
  });

  it("returns plausible per-word ms within profile range", () => {
    const profile = AI_OPPONENTS.ai_hard;
    const r = simulateAiOpponent(50, "ai_hard", "seed-range-check");
    for (const item of r) {
      assert.ok(
        item.ms >= profile.msMin && item.ms <= profile.msMax,
        `ms ${item.ms} out of range`,
      );
      assert.equal(typeof item.correct, "boolean");
    }
  });

  it("different seeds produce different result sequences", () => {
    const a = simulateAiOpponent(20, "ai_medium", "seed-A");
    const b = simulateAiOpponent(20, "ai_medium", "seed-B");
    assert.notDeepEqual(a, b);
  });

  it("harder difficulty → higher average accuracy (over many runs)", () => {
    // Average accuracy across many seeds should track the configured
    // profile probability. 200 runs × 10 words per opponent gives
    // tight enough convergence to assert ordering.
    const accuracyOf = (op: keyof typeof AI_OPPONENTS): number => {
      let total = 0;
      let correct = 0;
      for (let s = 0; s < 200; s++) {
        const r = simulateAiOpponent(10, op, `seed-${s}`);
        total += r.length;
        correct += r.filter((x) => x.correct).length;
      }
      return correct / total;
    };
    const easy = accuracyOf("ai_easy");
    const medium = accuracyOf("ai_medium");
    const hard = accuracyOf("ai_hard");
    assert.ok(easy < medium, `easy ${easy} should be < medium ${medium}`);
    assert.ok(medium < hard, `medium ${medium} should be < hard ${hard}`);
    // Sanity: each within ~0.1 of its configured profile.
    assert.ok(Math.abs(easy - AI_OPPONENTS.ai_easy.accuracy) < 0.1);
    assert.ok(Math.abs(medium - AI_OPPONENTS.ai_medium.accuracy) < 0.1);
    assert.ok(Math.abs(hard - AI_OPPONENTS.ai_hard.accuracy) < 0.1);
  });
});

// ─── Battle: computeAiScore is pure + matches competition formula ───────────

describe("computeAiScore", () => {
  it("computes score using the same formula as the human side", () => {
    const aiResults = [
      { correct: true, ms: 2000 },
      { correct: true, ms: 3000 },
      { correct: false, ms: 4000 },
      { correct: true, ms: 1500 },
      { correct: true, ms: 2500 },
    ];
    const r = computeAiScore(aiResults);
    assert.equal(r.correct, 4);
    assert.equal(r.durationSec, Math.ceil(13000 / 1000));
    assert.equal(
      r.score,
      computeCompetitionScore(r.correct, r.durationSec),
      "AI score must use the SAME formula as the human side",
    );
  });

  it("clamps duration to >= 1s so an instantaneous run doesn't divide by zero", () => {
    const r = computeAiScore([{ correct: true, ms: 0 }]);
    assert.ok(r.durationSec >= 1);
    assert.ok(Number.isFinite(r.score));
  });

  it("0 correct → score reflects formula (no special-case)", () => {
    const r = computeAiScore([
      { correct: false, ms: 5000 },
      { correct: false, ms: 5000 },
    ]);
    assert.equal(r.correct, 0);
    assert.equal(r.score, computeCompetitionScore(0, r.durationSec));
  });
});

// ─── Integration tests against the live DB ──────────────────────────────────
//
// These exercise the actual SQL guards that the trust model depends on:
//
//   1. Replay protection — a tampered client retrying the SAME wordIndex
//      with a different guess must not be able to overwrite a stored
//      verdict. Tested by running the same WHERE-clause-guarded UPDATE
//      twice and asserting the second run affects 0 rows.
//   2. Concurrent same-word attempts — two requests arriving at the same
//      moment for the same wordIndex must serialize to exactly one
//      winner. Tested with Promise.all on the same UPDATE.
//   3. Attempt-after-finalize — once the session is finalized, no
//      subsequent attempt may be persisted (or its score would not be
//      reflected in the leaderboard row written at finalize). Tested by
//      stamping finalizedAt and re-running the attempt UPDATE.
//   4. Finalize replay idempotency — finalizeSpellingSession() called
//      twice for the same competition session must NOT insert a second
//      leaderboard row. Tested by direct insert + double-finalize +
//      counting leaderboard rows for the test userId.
//
// All tests use a randomly generated userId per test and clean up after
// themselves to avoid polluting the dev DB.
describe("spelling sessions — DB integration (trust + concurrency)", () => {
  // Helper: build a minimally-valid session row for inserts. Uses a
  // throwaway userId per test so cleanup is easy.
  function freshSessionRow(opts: {
    userId: string;
    sessionToken: string;
    mode: "competition" | "dictation" | "tournament" | "battle";
    finalized?: boolean;
  }) {
    const words = [
      {
        id: "w0",
        word: "ship",
        ageGroup: "4-6",
        difficulty: "easy",
        syllables: ["ship"],
        chunks: ["sh", "ip"],
        hint: "boat that floats",
      },
      {
        id: "w1",
        word: "cat",
        ageGroup: "4-6",
        difficulty: "easy",
        syllables: ["cat"],
        chunks: ["c", "at"],
        hint: "meow animal",
      },
    ];
    return {
      sessionToken: opts.sessionToken,
      childId: 999_999,
      userId: opts.userId,
      ageGroup: "4-6",
      mode: opts.mode,
      difficulty: "easy",
      words,
      audioKeys: ["k0", "k1"],
      attempts: {} as Record<
        string,
        { guess: string; correct: boolean; ts: string }
      >,
      finalizedAt: opts.finalized ? new Date() : null,
    };
  }

  // Mirror the WHERE-clause-guarded UPDATE the route runs. Returns the
  // number of rows affected so tests can assert on it. Keeping this
  // inline rather than exporting from spelling.ts so the test exercises
  // the guards exactly as the route composes them.
  async function attemptUpdate(
    token: string,
    wordIndex: number,
    guess: string,
    correct: boolean,
  ): Promise<number> {
    const ts = new Date().toISOString();
    const updated = await db
      .update(spellingSessionsTable)
      .set({
        attempts: sql`jsonb_set(${spellingSessionsTable.attempts}, ${`{${wordIndex}}`}::text[], ${JSON.stringify({ guess, correct, ts })}::jsonb, true)`,
      })
      .where(
        and(
          eq(spellingSessionsTable.sessionToken, token),
          sql`NOT (${spellingSessionsTable.attempts} ? ${String(wordIndex)})`,
          isNull(spellingSessionsTable.finalizedAt),
        ),
      )
      .returning({ id: spellingSessionsTable.id });
    return updated.length;
  }

  it("rejects a replayed attempt for the same wordIndex (replay protection)", async () => {
    const userId = `spelling-test-${randomUUID()}`;
    const token = `tok_${randomUUID()}`;
    try {
      await db
        .insert(spellingSessionsTable)
        .values(freshSessionRow({ userId, sessionToken: token, mode: "competition" }));

      // First attempt at index 0 → wins.
      const first = await attemptUpdate(token, 0, "ship", true);
      assert.equal(first, 1, "first attempt must succeed");

      // Tampered replay — same index, different guess. Must NOT overwrite.
      const second = await attemptUpdate(token, 0, "wrong", false);
      assert.equal(second, 0, "replayed attempt must be rejected");

      // Verify the stored attempt is still the FIRST verdict.
      const rows = await db
        .select()
        .from(spellingSessionsTable)
        .where(eq(spellingSessionsTable.sessionToken, token))
        .limit(1);
      assert.equal(rows[0]?.attempts["0"]?.guess, "ship");
      assert.equal(rows[0]?.attempts["0"]?.correct, true);
    } finally {
      await db
        .delete(spellingSessionsTable)
        .where(eq(spellingSessionsTable.userId, userId));
    }
  });

  it("serializes concurrent attempts on the same wordIndex to exactly one winner", async () => {
    const userId = `spelling-test-${randomUUID()}`;
    const token = `tok_${randomUUID()}`;
    try {
      await db
        .insert(spellingSessionsTable)
        .values(freshSessionRow({ userId, sessionToken: token, mode: "competition" }));

      // Race two attempts for the same index.
      const [a, b] = await Promise.all([
        attemptUpdate(token, 0, "ship", true),
        attemptUpdate(token, 0, "boat", false),
      ]);

      // Exactly one wins — Postgres guarantees one of the UPDATEs sees
      // the slot empty and the other sees it populated.
      assert.equal(a + b, 1, `expected exactly one winner, got a=${a} b=${b}`);

      // The DB has exactly one verdict for index 0.
      const rows = await db
        .select()
        .from(spellingSessionsTable)
        .where(eq(spellingSessionsTable.sessionToken, token))
        .limit(1);
      const stored = rows[0]?.attempts["0"];
      assert.ok(stored, "exactly one attempt must be persisted");
      assert.ok(
        stored.guess === "ship" || stored.guess === "boat",
        `unexpected guess persisted: ${stored.guess}`,
      );
    } finally {
      await db
        .delete(spellingSessionsTable)
        .where(eq(spellingSessionsTable.userId, userId));
    }
  });

  it("rejects an attempt that races in after finalize (finalized_at guard)", async () => {
    const userId = `spelling-test-${randomUUID()}`;
    const token = `tok_${randomUUID()}`;
    try {
      // Insert ALREADY-finalized session — simulates a finalize that
      // committed between the route's read and the attempt UPDATE.
      await db
        .insert(spellingSessionsTable)
        .values(
          freshSessionRow({
            userId,
            sessionToken: token,
            mode: "competition",
            finalized: true,
          }),
        );

      const affected = await attemptUpdate(token, 0, "ship", true);
      assert.equal(
        affected,
        0,
        "attempt UPDATE must not write after finalize",
      );

      // Confirm attempts is still empty — no slot was written.
      const rows = await db
        .select()
        .from(spellingSessionsTable)
        .where(eq(spellingSessionsTable.sessionToken, token))
        .limit(1);
      assert.deepEqual(rows[0]?.attempts, {});
    } finally {
      await db
        .delete(spellingSessionsTable)
        .where(eq(spellingSessionsTable.userId, userId));
    }
  });

  it("finalize is idempotent — second call inserts no extra leaderboard row", async () => {
    const userId = `spelling-test-${randomUUID()}`;
    const token = `tok_${randomUUID()}`;
    try {
      // Insert competition session with one CORRECT attempt pre-baked.
      const row = freshSessionRow({ userId, sessionToken: token, mode: "competition" });
      row.attempts = {
        "0": { guess: "ship", correct: true, ts: new Date().toISOString() },
      };
      await db.insert(spellingSessionsTable).values(row);

      const r1 = await finalizeSpellingSession(userId, token);
      assert.equal(r1.kind, "finalized", "first call must finalize");

      const r2 = await finalizeSpellingSession(userId, token);
      assert.equal(
        r2.kind,
        "already_finalized",
        "second call must short-circuit",
      );

      // The leaderboard table must hold EXACTLY one row for this userId.
      const lbRows = await db
        .select({ id: spellingCompetitionScoresTable.id })
        .from(spellingCompetitionScoresTable)
        .where(eq(spellingCompetitionScoresTable.userId, userId));
      assert.equal(
        lbRows.length,
        1,
        `expected exactly one leaderboard row, got ${lbRows.length}`,
      );

      // And the response from both calls reports the same competitionScoreId.
      if (r1.kind === "finalized" && r2.kind === "already_finalized") {
        assert.equal(r1.competitionScoreId, r2.competitionScoreId);
        assert.equal(r1.competitionScoreId, lbRows[0]!.id);
      }
    } finally {
      await db
        .delete(spellingCompetitionScoresTable)
        .where(eq(spellingCompetitionScoresTable.userId, userId));
      await db
        .delete(spellingSessionsTable)
        .where(eq(spellingSessionsTable.userId, userId));
    }
  });

  it("safeWordFor never leaks the answer (no word/syllables/chunks/hint, opaque id)", () => {
    // Trip-wire test for the trust boundary: if anyone ever changes
    // safeWordFor to surface the answer (or an answer-derived id), this
    // test must fail. The curated catalog uses `id = word.toLowerCase()`
    // and AI words use `id = "ai-${word}"` — both would directly leak
    // the answer if surfaced verbatim.
    const word = {
      id: "ship", // ← answer-derived id from curated catalog
      word: "ship",
      ageGroup: "4-6" as const,
      difficulty: "easy" as const,
      syllables: ["ship"],
      chunks: ["sh", "ip"],
      hint: "boat that floats",
    };
    const safe = _safeWordForTest("session-token-xyz", 0, word);
    const safeKeys = Object.keys(safe).sort();
    assert.deepEqual(
      safeKeys,
      ["ageGroup", "audioUrl", "difficulty", "id", "letterCount"].sort(),
      "safeWord shape must be exactly the documented surface — no extra leaky fields",
    );
    // None of the answer-bearing strings may appear ANYWHERE in the
    // serialized payload (defends against future fields that might
    // accidentally include the word).
    const blob = JSON.stringify(safe).toLowerCase();
    assert.ok(!blob.includes("ship"), `safe payload leaks 'ship': ${blob}`);
    assert.ok(!blob.includes("sh\""), `safe payload contains chunk 'sh': ${blob}`);
    assert.ok(!blob.includes("ip\""), `safe payload contains chunk 'ip': ${blob}`);
    assert.ok(!blob.includes("boat"), `safe payload contains hint: ${blob}`);
    // The opaque id is positional — same word at a different index
    // gets a different id; same index across words gets the same id.
    assert.equal(safe.id, "w0");
    const safe1 = _safeWordForTest("session-token-xyz", 7, word);
    assert.equal(safe1.id, "w7");
    // Letter count IS exposed — needed for input box width — but is
    // not by itself enough to recover the spelling.
    assert.equal(safe.letterCount, 4);
  });

  it("safeWordFor never leaks the answer for an AI-generated word", () => {
    // AI-generated words use `id = "ai-${word.toLowerCase()}"` — same
    // leakage risk. Verify the projection scrubs that too.
    const word = {
      id: "ai-elephant",
      word: "elephant",
      ageGroup: "6-8" as const,
      difficulty: "medium" as const,
      syllables: ["el", "e", "phant"],
      chunks: ["el", "e", "ph", "ant"],
      hint: "big grey animal",
    };
    const safe = _safeWordForTest("token", 3, word);
    const blob = JSON.stringify(safe).toLowerCase();
    assert.ok(!blob.includes("elephant"), `leaks 'elephant': ${blob}`);
    assert.ok(!blob.includes("ai-"), `leaks ai- prefix: ${blob}`);
    assert.equal(safe.id, "w3");
    assert.equal(safe.letterCount, 8);
  });

  it("finalize on a non-competition session does NOT touch the leaderboard", async () => {
    const userId = `spelling-test-${randomUUID()}`;
    const token = `tok_${randomUUID()}`;
    try {
      // Tournament round session — must not write to leaderboard.
      const row = freshSessionRow({ userId, sessionToken: token, mode: "tournament" });
      row.attempts = {
        "0": { guess: "ship", correct: true, ts: new Date().toISOString() },
      };
      await db.insert(spellingSessionsTable).values(row);

      const r = await finalizeSpellingSession(userId, token);
      assert.equal(r.kind, "finalized");

      const lbRows = await db
        .select({ id: spellingCompetitionScoresTable.id })
        .from(spellingCompetitionScoresTable)
        .where(eq(spellingCompetitionScoresTable.userId, userId));
      assert.equal(
        lbRows.length,
        0,
        "tournament-round finalize must NOT write a leaderboard row",
      );
    } finally {
      await db
        .delete(spellingCompetitionScoresTable)
        .where(eq(spellingCompetitionScoresTable.userId, userId));
      await db
        .delete(spellingSessionsTable)
        .where(eq(spellingSessionsTable.userId, userId));
    }
  });

  // ─── /advance state-machine integration tests ──────────────────────
  // These exercise the in-tx state machine (the function the handler
  // wraps in db.transaction) so we cover every branch of
  // `advanceTournamentTxImpl`: legacy-recovery, audio-pending,
  // drift/inconsistent_state, and the prewarm-failure → retry path.
  //
  // Helper: insert a tournament + session in a target stuck/pending shape.
  async function seedTournament(opts: {
    userId: string;
    tournamentToken: string;
    sessionToken: string;
    rounds: Array<TournamentRoundResult & { passed: boolean }>;
    currentRound: number;
    finalizedSession: boolean;
    audioKeys?: string[];
  }) {
    await db.insert(spellingTournamentsTable).values({
      tournamentToken: opts.tournamentToken,
      userId: opts.userId,
      childId: 999_999,
      ageGroup: "4-6",
      status: "active",
      currentRound: opts.currentRound,
      rounds: opts.rounds,
      totalScore: opts.rounds.reduce(
        (acc, r) => acc + (r.passed ? r.score : 0),
        0,
      ),
      eliminatedAtRound: null,
      finalizedAt: null,
    });
    const sessionRow = freshSessionRow({
      userId: opts.userId,
      sessionToken: opts.sessionToken,
      mode: "tournament",
      finalized: opts.finalizedSession,
    });
    await db.insert(spellingSessionsTable).values({
      ...sessionRow,
      audioKeys: opts.audioKeys ?? sessionRow.audioKeys,
      parentTournamentToken: opts.tournamentToken,
    });
  }

  async function readTournament(token: string) {
    const rows = await db
      .select()
      .from(spellingTournamentsTable)
      .where(eq(spellingTournamentsTable.tournamentToken, token))
      .limit(1);
    return rows[0]!;
  }

  async function readLatestSession(token: string, userId: string) {
    const rows = await db
      .select()
      .from(spellingSessionsTable)
      .where(
        and(
          eq(spellingSessionsTable.parentTournamentToken, token),
          eq(spellingSessionsTable.userId, userId),
        ),
      )
      .orderBy(desc(spellingSessionsTable.startedAt))
      .limit(1);
    return rows[0]!;
  }

  // BRANCH 3 (legacy recovery): tournament stranded by the pre-fix
  // split-commit code path — outer tx applied the round, but post-tx
  // createSpellingSession failed, so the next-round session row never
  // landed. /advance must heal: skip finalize/applyRoundResult
  // (already done) and INSERT the missing next-round session inside
  // the SAME tx as the recovery select, so a TTS failure in the
  // post-tx prewarm leaves a recoverable audio_pending state — NOT
  // a permanently stuck tournament.
  it("/advance heals a legacy stuck state without double-applying the round", async () => {
    const userId = `spelling-test-${randomUUID()}`;
    const tournamentToken = `tour_${randomUUID()}`;
    const r1SessionToken = `tok_${randomUUID()}`;
    try {
      const r1: TournamentRoundResult & { passed: boolean } = {
        round: 1,
        difficulty: "easy",
        sessionToken: r1SessionToken,
        score: 100,
        wordsCorrect: 4,
        wordsAttempted: 5,
        durationSec: 60,
        passed: true,
      };
      await seedTournament({
        userId,
        tournamentToken,
        sessionToken: r1SessionToken,
        rounds: [r1],
        currentRound: 2,
        finalizedSession: true,
      });

      const result = await db.transaction((tx) =>
        _advanceTournamentTxForTest(tx, { tournamentToken, userId }),
      );

      assert.equal(result.kind, "ok");
      if (result.kind !== "ok") return;
      assert.equal(
        result.isRecovery,
        true,
        "must take recovery branch, NOT normal flow",
      );
      assert.equal(
        result.roundResult.sessionToken,
        r1SessionToken,
        "roundResult mirrors the already-applied R1 from rounds[last]",
      );
      assert.ok(
        result.nextSessionData !== null,
        "must INSERT the missing R2 session inside the recovery tx",
      );

      // Tournament state must NOT be re-applied: rounds[] unchanged,
      // currentRound unchanged, totalScore unchanged.
      const tournamentAfter = await readTournament(tournamentToken);
      assert.equal(tournamentAfter.status, "active");
      assert.equal(tournamentAfter.currentRound, 2);
      assert.equal(tournamentAfter.totalScore, 100);
      assert.equal(
        (tournamentAfter.rounds as unknown[]).length,
        1,
        "rounds[] must not gain a duplicate R1 entry",
      );

      // Latest session is now the freshly-INSERTed R2, unfinalized,
      // audioKeys empty (TTS prewarm runs after the tx commits).
      const latest = await readLatestSession(tournamentToken, userId);
      assert.notEqual(latest.sessionToken, r1SessionToken);
      assert.equal(latest.finalizedAt, null);
      assert.equal(latest.audioKeys.length, 0);
    } finally {
      await db
        .delete(spellingSessionsTable)
        .where(eq(spellingSessionsTable.userId, userId));
      await db
        .delete(spellingTournamentsTable)
        .where(eq(spellingTournamentsTable.userId, userId));
    }
  });

  // BRANCH 2 (audio_pending): a previous /advance committed the
  // next-round session row in-tx and then post-tx TTS prewarm
  // failed. The retry of /advance MUST detect this (unfinalized
  // session + empty audioKeys) and return audio_pending — it must
  // NOT enter the normal flow and finalize the unplayed session
  // (which would apply a 0-attempt round and wrongly eliminate).
  it("/advance returns audio_pending on TTS-prewarm-failed retry, NOT finalize-with-zero", async () => {
    const userId = `spelling-test-${randomUUID()}`;
    const tournamentToken = `tour_${randomUUID()}`;
    const r1SessionToken = `tok_${randomUUID()}`;
    const r2SessionToken = `tok_${randomUUID()}`;
    try {
      const r1: TournamentRoundResult & { passed: boolean } = {
        round: 1,
        difficulty: "easy",
        sessionToken: r1SessionToken,
        score: 100,
        wordsCorrect: 4,
        wordsAttempted: 5,
        durationSec: 60,
        passed: true,
      };
      // Tournament already advanced past R1 (rounds=[R1],
      // currentRound=2). The R2 session row exists (pre-fix
      // would not have, but we now atomically insert it) but
      // audioKeys is empty — TTS prewarm previously failed.
      await db.insert(spellingTournamentsTable).values({
        tournamentToken,
        userId,
        childId: 999_999,
        ageGroup: "4-6",
        status: "active",
        currentRound: 2,
        rounds: [r1],
        totalScore: 100,
        eliminatedAtRound: null,
        finalizedAt: null,
      });
      // R1 session (finalized, audio populated).
      await db.insert(spellingSessionsTable).values({
        ...freshSessionRow({
          userId,
          sessionToken: r1SessionToken,
          mode: "tournament",
          finalized: true,
        }),
        parentTournamentToken: tournamentToken,
      });
      // R2 session (unfinalized, empty audioKeys ⇒ audio_pending).
      // Insert this one slightly later so it sorts as "latest" by
      // startedAt.
      await new Promise((r) => setTimeout(r, 5));
      const r2Row = freshSessionRow({
        userId,
        sessionToken: r2SessionToken,
        mode: "tournament",
        finalized: false,
      });
      await db.insert(spellingSessionsTable).values({
        ...r2Row,
        audioKeys: [],
        parentTournamentToken: tournamentToken,
      });

      const result = await db.transaction((tx) =>
        _advanceTournamentTxForTest(tx, { tournamentToken, userId }),
      );

      assert.equal(
        result.kind,
        "audio_pending",
        "must return audio_pending — not 'ok' (would have finalized R2 with 0 attempts!)",
      );
      if (result.kind !== "audio_pending") return;
      assert.equal(result.session.sessionToken, r2SessionToken);
      assert.equal(
        result.session.finalizedAt,
        null,
        "session must remain unfinalized so the kid can still play it",
      );

      // Tournament state untouched: currentRound still 2, rounds
      // still [R1], no R2 result applied. The R2 session is still
      // unfinalized.
      const tournamentAfter = await readTournament(tournamentToken);
      assert.equal(tournamentAfter.currentRound, 2);
      assert.equal(tournamentAfter.totalScore, 100);
      assert.equal((tournamentAfter.rounds as unknown[]).length, 1);
      const r2After = await readLatestSession(tournamentToken, userId);
      assert.equal(r2After.sessionToken, r2SessionToken);
      assert.equal(
        r2After.finalizedAt,
        null,
        "audio_pending branch must NOT finalize the session",
      );
    } finally {
      await db
        .delete(spellingSessionsTable)
        .where(eq(spellingSessionsTable.userId, userId));
      await db
        .delete(spellingTournamentsTable)
        .where(eq(spellingTournamentsTable.userId, userId));
    }
  });

  // BRANCH 4 (drift): latest session is finalized but its token does
  // NOT match `tournament.rounds[last].sessionToken` — e.g. session
  // was finalized via the public /sessions/:token/finalize path
  // without /advance ever applying it. The tightened recovery
  // predicate (`lastApplied.sessionToken === activeSession.sessionToken`)
  // must REFUSE rather than wrongly skip apply + double-allocate
  // a session for the same round.
  it("/advance refuses inconsistent_state when a finalized session does not match rounds[last]", async () => {
    const userId = `spelling-test-${randomUUID()}`;
    const tournamentToken = `tour_${randomUUID()}`;
    const r1RecordedToken = `tok_${randomUUID()}`;
    const r1ActualToken = `tok_${randomUUID()}`;
    try {
      // rounds[] thinks R1 was sessionToken=r1RecordedToken, but the
      // ACTUAL session row in the DB has a different token (drift).
      const r1: TournamentRoundResult & { passed: boolean } = {
        round: 1,
        difficulty: "easy",
        sessionToken: r1RecordedToken,
        score: 100,
        wordsCorrect: 4,
        wordsAttempted: 5,
        durationSec: 60,
        passed: true,
      };
      await seedTournament({
        userId,
        tournamentToken,
        sessionToken: r1ActualToken,
        rounds: [r1],
        currentRound: 2,
        finalizedSession: true,
      });

      const result = await db.transaction((tx) =>
        _advanceTournamentTxForTest(tx, { tournamentToken, userId }),
      );

      assert.equal(
        result.kind,
        "inconsistent_state",
        "must refuse with inconsistent_state — must NOT enter recovery and double-allocate",
      );

      // Tournament state untouched.
      const tournamentAfter = await readTournament(tournamentToken);
      assert.equal(tournamentAfter.currentRound, 2);
      assert.equal((tournamentAfter.rounds as unknown[]).length, 1);
      // No new session row created.
      const sessionsAfter = await db
        .select()
        .from(spellingSessionsTable)
        .where(eq(spellingSessionsTable.userId, userId));
      assert.equal(
        sessionsAfter.length,
        1,
        "drift branch must NOT insert a new session row",
      );
    } finally {
      await db
        .delete(spellingSessionsTable)
        .where(eq(spellingSessionsTable.userId, userId));
      await db
        .delete(spellingTournamentsTable)
        .where(eq(spellingTournamentsTable.userId, userId));
    }
  });
});

// ─── Public audio route mount integration test ──────────────────────────────
//
// Regression guard: spellingPublicRouter MUST be mounted on the top-level
// app router BEFORE requireAuth — otherwise <audio> tags can't fetch
// session-scoped MP3s and Dictation/Competition/Tournament/Battle playback
// silently breaks. Hits the route through the actual express app to prove:
//   1. The route is reachable (not 404)
//   2. It is NOT behind requireAuth (we'd see 401/403 if it were)
//   3. The handler's own validation runs (invalid_token, not_found)
//
// We deliberately DON'T test the success path here — that requires a
// matching ttsCache row + GCS object, which the test rig can't produce.
// The handler-internal logic is covered by the route's branch tests above.
describe("spellingPublicRouter mount (integration)", () => {
  it("serves /api/spelling/sessions/:token/audio/:idx.mp3 publicly through the app", async () => {
    const http = await import("node:http");
    const { default: app } = await import("../app");

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      server.close();
      throw new Error("test server failed to bind");
    }
    const base = `http://127.0.0.1:${addr.port}`;

    const userId = `spelling-pub-test-${randomUUID()}`;
    const token = `tok${randomUUID().replace(/-/g, "")}`;
    try {
      // 1. Invalid token format → handler-side 400 (proves we're past auth).
      const badTok = await fetch(`${base}/api/spelling/sessions/!!!/audio/0.mp3`);
      assert.notEqual(
        badTok.status,
        401,
        "invalid-token request must NOT be auth-gated",
      );
      assert.notEqual(
        badTok.status,
        403,
        "invalid-token request must NOT be auth-gated",
      );
      assert.notEqual(badTok.status, 404, "route must be mounted (not 404)");
      assert.equal(badTok.status, 400, "invalid token must hit handler 400");
      const badTokBody = (await badTok.json()) as { error?: string };
      assert.equal(badTokBody.error, "invalid_token");

      // 2. Invalid idx → handler-side 400 (also proves past-auth + handler).
      const badIdx = await fetch(
        `${base}/api/spelling/sessions/${token}/audio/abc.mp3`,
      );
      assert.equal(badIdx.status, 400);
      const badIdxBody = (await badIdx.json()) as { error?: string };
      assert.equal(badIdxBody.error, "invalid_idx");

      // 3. Valid token format but no DB row → handler-side 404 not_found.
      // (This is the handler's own 404, distinct from a "route not mounted"
      // 404 — the body's `error` field proves we reached the handler.)
      await db.insert(spellingSessionsTable).values({
        sessionToken: token,
        childId: 999_998,
        userId,
        ageGroup: "4-6",
        mode: "dictation",
        difficulty: "easy",
        words: [
          {
            id: "w0",
            word: "ship",
            ageGroup: "4-6",
            difficulty: "easy",
            syllables: ["ship"],
            chunks: ["sh", "ip"],
            hint: "boat that floats",
          },
        ],
        audioKeys: [], // empty — index 0 must 404 with handler's not_found
      });
      const valid = await fetch(`${base}/api/spelling/sessions/${token}/audio/0.mp3`);
      assert.equal(valid.status, 404);
      const validBody = (await valid.json()) as { error?: string };
      // Handler returns one of: not_found (no key) or audio_not_found (no GCS).
      // Both prove we reached the handler, not Express's default 404.
      assert.ok(
        validBody.error === "not_found" || validBody.error === "audio_not_found",
        `expected handler 404 body, got: ${JSON.stringify(validBody)}`,
      );
    } finally {
      await db
        .delete(spellingSessionsTable)
        .where(eq(spellingSessionsTable.userId, userId));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
