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
  AI_OPPONENTS,
  TOURNAMENT_ROUND_CONFIG,
  type TournamentRoundResult,
} from "./spelling";
import {
  db,
  spellingSessionsTable,
  spellingCompetitionScoresTable,
} from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";

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
});
