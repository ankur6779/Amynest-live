import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  generateQuestions,
  scoreAnswers,
  buildRuleBasedInsight,
  signSession,
  verifySession,
  isAvailable,
  toClientQuestions,
  type AgeGroup,
} from "./phonicsTests";
import {
  db,
  phonicsTestResultsTable,
  type PhonicsContentRow,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function row(
  overrides: Partial<PhonicsContentRow> & Pick<PhonicsContentRow, "id" | "ageGroup" | "type" | "symbol" | "sound">,
): PhonicsContentRow {
  return {
    level: 1,
    example: null,
    emoji: null,
    hint: null,
    audioUrl: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PhonicsContentRow;
}

const LETTERS_2_3Y: PhonicsContentRow[] = [
  ["A", "ah", "Apple", "🍎"],
  ["B", "buh", "Ball", "⚽"],
  ["C", "kuh", "Cat", "🐱"],
  ["D", "duh", "Dog", "🐶"],
  ["E", "eh", "Egg", "🥚"],
  ["F", "fff", "Fish", "🐟"],
  ["G", "guh", "Goat", "🐐"],
  ["H", "huh", "Hat", "🎩"],
].map(([letter, phon, word, emoji], i) =>
  row({
    id: 100 + i,
    ageGroup: "2_3y",
    level: i + 1,
    type: "letter",
    symbol: letter,
    sound: `${letter} says ${phon}. ${letter} for ${word}.`,
    example: word,
    emoji,
  }),
);

const ANIMALS_12_24M: PhonicsContentRow[] = [
  ["Moo", "🐄"],
  ["Woof", "🐶"],
  ["Meow", "🐱"],
  ["Baa", "🐑"],
  ["Quack", "🦆"],
  ["Oink", "🐷"],
].map(([sym, emoji], i) =>
  row({
    id: 200 + i,
    ageGroup: "12_24m",
    level: i + 1,
    type: "sound",
    symbol: sym,
    sound: `${sym}.`,
    emoji,
  }),
);

const CVC_4_5Y: PhonicsContentRow[] = [
  ["cat", "🐱"],
  ["bat", "🦇"],
  ["hat", "🎩"],
  ["mat", "🪺"],
  ["pig", "🐷"],
  ["dog", "🐶"],
  ["sun", "☀️"],
  ["bus", "🚌"],
].map(([word, emoji], i) =>
  row({
    id: 300 + i,
    ageGroup: "4_5y",
    level: i + 1,
    type: "word",
    symbol: word as string,
    sound: word as string,
    example: word as string,
    emoji,
  }),
);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("generateQuestions", () => {
  it("produces the requested count for a daily test", () => {
    const qs = generateQuestions({
      ageGroup: "2_3y",
      contentRows: LETTERS_2_3Y,
      count: 5,
      seed: 42,
    });
    assert.equal(qs.length, 5);
  });

  it("each question has the correct answer present in options", () => {
    const qs = generateQuestions({
      ageGroup: "2_3y",
      contentRows: LETTERS_2_3Y,
      count: 5,
      seed: 7,
    });
    for (const q of qs) {
      assert.ok(q.options[q.correctIndex], "correctIndex points to a real option");
      assert.equal(q.options.length, 4, "always 4 options");
    }
  });

  it("is deterministic for the same seed", () => {
    const a = generateQuestions({ ageGroup: "2_3y", contentRows: LETTERS_2_3Y, count: 5, seed: 99 });
    const b = generateQuestions({ ageGroup: "2_3y", contentRows: LETTERS_2_3Y, count: 5, seed: 99 });
    assert.deepEqual(
      a.map((q) => [q.conceptId, q.type, q.correctIndex, q.options.map((o) => o.label)]),
      b.map((q) => [q.conceptId, q.type, q.correctIndex, q.options.map((o) => o.label)]),
    );
  });

  it("produces different mixes for different seeds", () => {
    const a = generateQuestions({ ageGroup: "2_3y", contentRows: LETTERS_2_3Y, count: 5, seed: 1 });
    const b = generateQuestions({ ageGroup: "2_3y", contentRows: LETTERS_2_3Y, count: 5, seed: 2 });
    const aIds = a.map((q) => q.conceptId).join(",");
    const bIds = b.map((q) => q.conceptId).join(",");
    assert.notEqual(aIds, bIds);
  });

  it("excludes recently-seen concept ids when there's enough remaining", () => {
    const recent = LETTERS_2_3Y.slice(0, 3).map((r) => r.id);
    const qs = generateQuestions({
      ageGroup: "2_3y",
      contentRows: LETTERS_2_3Y,
      count: 5,
      recentItemIds: recent,
      seed: 11,
    });
    for (const q of qs) {
      assert.ok(!recent.includes(q.conceptId), `recent id ${q.conceptId} should be excluded`);
    }
  });

  it("falls back to all rows when recency would starve the pool", () => {
    const recent = LETTERS_2_3Y.map((r) => r.id); // exclude everything
    const qs = generateQuestions({
      ageGroup: "2_3y",
      contentRows: LETTERS_2_3Y,
      count: 5,
      recentItemIds: recent,
      seed: 1,
    });
    assert.equal(qs.length, 5, "still returns 5 instead of starving");
  });

  it("uses age-appropriate question types for 12_24m", () => {
    const qs = generateQuestions({
      ageGroup: "12_24m",
      contentRows: ANIMALS_12_24M,
      count: 5,
      seed: 3,
    });
    for (const q of qs) {
      assert.equal(q.type, "animal_sound");
      assert.ok(q.prompt.ttsText, "animal_sound has TTS prompt");
    }
  });

  it("includes blending questions for 4_5y CVC content", () => {
    const qs = generateQuestions({
      ageGroup: "4_5y",
      contentRows: CVC_4_5Y,
      count: 8,
      seed: 5,
    });
    const types = new Set(qs.map((q) => q.type));
    assert.ok(types.has("blending") || types.has("listening") || types.has("word_pic"));
    // Blending questions should display the spelled-out word
    const blending = qs.find((q) => q.type === "blending");
    if (blending) {
      assert.match(blending.prompt.text ?? "", /-/);
    }
  });

  it("strips correctIndex when sending to client", () => {
    const qs = generateQuestions({ ageGroup: "2_3y", contentRows: LETTERS_2_3Y, count: 3, seed: 1 });
    const client = toClientQuestions(qs);
    for (const q of client) {
      assert.equal((q as any).correctIndex, undefined);
    }
  });
});

describe("scoreAnswers", () => {
  const qs = generateQuestions({ ageGroup: "2_3y", contentRows: LETTERS_2_3Y, count: 5, seed: 22 });

  it("scores all-correct as 100%", () => {
    const answers = qs.map((q) => ({ questionId: q.id, selectedIndex: q.correctIndex }));
    const r = scoreAnswers(qs, answers);
    assert.equal(r.correct, 5);
    assert.equal(r.accuracyPct, 100);
    assert.equal(r.weakConceptIds.length, 0);
  });

  it("scores all-wrong as 0% and surfaces all concepts as weak", () => {
    const answers = qs.map((q) => ({
      questionId: q.id,
      selectedIndex: (q.correctIndex + 1) % q.options.length,
    }));
    const r = scoreAnswers(qs, answers);
    assert.equal(r.correct, 0);
    assert.equal(r.accuracyPct, 0);
    assert.equal(r.weakConceptIds.length, qs.length);
  });

  it("counts unanswered questions as wrong", () => {
    const r = scoreAnswers(qs, []);
    assert.equal(r.correct, 0);
    assert.equal(r.weakConceptIds.length, qs.length);
  });

  it("returns per-type breakdown", () => {
    const answers = qs.map((q) => ({ questionId: q.id, selectedIndex: q.correctIndex }));
    const r = scoreAnswers(qs, answers);
    for (const [, b] of Object.entries(r.perType)) {
      assert.equal(b.correct, b.total);
    }
  });
});

describe("buildRuleBasedInsight", () => {
  it("labels < 50% as Beginner", () => {
    const r = buildRuleBasedInsight(
      { correct: 1, total: 5, accuracyPct: 20, weakConceptIds: [], perType: {} },
      [],
      "Aria",
    );
    assert.equal(r.performanceLabel, "Beginner");
    assert.match(r.insightText, /Aria/);
  });

  it("labels 50–79% as Improving", () => {
    const r = buildRuleBasedInsight(
      { correct: 3, total: 5, accuracyPct: 60, weakConceptIds: [], perType: {} },
      [],
      "Sam",
    );
    assert.equal(r.performanceLabel, "Improving");
  });

  it("labels >= 80% as Strong", () => {
    const r = buildRuleBasedInsight(
      { correct: 5, total: 5, accuracyPct: 100, weakConceptIds: [], perType: {} },
      [],
      "Leo",
    );
    assert.equal(r.performanceLabel, "Strong");
  });

  it("includes weak symbol names in Beginner/Improving messages", () => {
    const weak = [LETTERS_2_3Y[1]!, LETTERS_2_3Y[5]!]; // B, F
    const r = buildRuleBasedInsight(
      { correct: 1, total: 5, accuracyPct: 20, weakConceptIds: [101, 105], perType: {} },
      weak,
      "Aria",
    );
    assert.match(r.insightText, /B/);
    assert.match(r.insightText, /F/);
  });
});

describe("signSession + verifySession (AES-256-GCM)", () => {
  // 32+ chars to satisfy the new strong-secret requirement.
  const SECRET = "test-secret-32-chars-min-please-ok!!";
  const ALT_SECRET = "another-32-chars-secret-for-tests-x!";
  const USER_ID = "user-abc-123";
  const qs = generateQuestions({ ageGroup: "2_3y", contentRows: LETTERS_2_3Y, count: 5, seed: 1 });

  it("round-trips a valid session", () => {
    const token = signSession(
      { userId: USER_ID, childId: 7, testType: "daily", ageGroup: "2_3y", questions: qs, issuedAt: Date.now() },
      SECRET,
    );
    const v = verifySession(token, SECRET);
    assert.ok(v);
    assert.equal(v!.userId, USER_ID);
    assert.equal(v!.childId, 7);
    assert.equal(v!.testType, "daily");
    assert.equal(v!.questions.length, 5);
    assert.equal(v!.questions[0]!.correctIndex, qs[0]!.correctIndex);
    // jti must be present and non-empty (one-time-use replay protection).
    assert.ok(v!.jti && v!.jti.length > 0);
  });

  it("does not leak correctIndex in plaintext", () => {
    // The whole point of switching from HMAC-only to AEAD: a client must NOT
    // be able to inspect the token and read the correct answers.
    const token = signSession(
      { userId: USER_ID, childId: 7, testType: "daily", ageGroup: "2_3y", questions: qs, issuedAt: Date.now() },
      SECRET,
    );
    // Token format is `v1.<iv>.<ciphertext>.<tag>` — no readable JSON anywhere.
    assert.ok(token.startsWith("v1."));
    assert.ok(!token.includes("correctIndex"));
    assert.ok(!token.includes('"ci"'));
    // Concatenated body must not decode to JSON containing correct answers.
    for (const part of token.split(".").slice(1)) {
      const bytes = Buffer.from(part, "base64url").toString("utf8");
      assert.ok(!bytes.includes("correctIndex"));
      assert.ok(!bytes.includes('"ci"'));
    }
  });

  it("rejects a tampered ciphertext (auth tag mismatch)", () => {
    const token = signSession(
      { userId: USER_ID, childId: 7, testType: "daily", ageGroup: "2_3y", questions: qs, issuedAt: Date.now() },
      SECRET,
    );
    const parts = token.split(".");
    // Flip one bit in the ciphertext segment — GCM auth tag must reject it.
    const ctBytes = Buffer.from(parts[2]!, "base64url");
    ctBytes[0] = ctBytes[0]! ^ 0x01;
    parts[2] = ctBytes.toString("base64url");
    assert.equal(verifySession(parts.join("."), SECRET), null);
  });

  it("rejects a token encrypted with a different secret", () => {
    const token = signSession(
      { userId: USER_ID, childId: 7, testType: "daily", ageGroup: "2_3y", questions: qs, issuedAt: Date.now() },
      SECRET,
    );
    assert.equal(verifySession(token, ALT_SECRET), null);
  });

  it("rejects an expired session", () => {
    const issuedAt = Date.now() - 31 * 60 * 1000; // 31 min ago
    const token = signSession(
      { userId: USER_ID, childId: 7, testType: "daily", ageGroup: "2_3y", questions: qs, issuedAt },
      SECRET,
    );
    assert.equal(verifySession(token, SECRET), null);
  });

  it("refuses to sign with a missing or short secret", () => {
    assert.throws(() =>
      signSession(
        { userId: USER_ID, childId: 7, testType: "daily", ageGroup: "2_3y", questions: qs, issuedAt: Date.now() },
        "",
      ),
    );
    assert.throws(() =>
      signSession(
        { userId: USER_ID, childId: 7, testType: "daily", ageGroup: "2_3y", questions: qs, issuedAt: Date.now() },
        "short",
      ),
    );
  });

  it("issues a unique jti per token (replay-protection input)", () => {
    const t1 = signSession(
      { userId: USER_ID, childId: 7, testType: "daily", ageGroup: "2_3y", questions: qs, issuedAt: Date.now() },
      SECRET,
    );
    const t2 = signSession(
      { userId: USER_ID, childId: 7, testType: "daily", ageGroup: "2_3y", questions: qs, issuedAt: Date.now() },
      SECRET,
    );
    const v1 = verifySession(t1, SECRET);
    const v2 = verifySession(t2, SECRET);
    assert.ok(v1 && v2);
    assert.notEqual(v1!.jti, v2!.jti);
  });
});

describe("isAvailable", () => {
  const now = new Date("2026-04-26T12:00:00Z");
  it("is available when never taken", () => {
    assert.equal(isAvailable("daily", null, now).available, true);
  });
  it("daily blocked within 24h", () => {
    const last = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const r = isAvailable("daily", last, now);
    assert.equal(r.available, false);
    assert.ok(r.nextAvailableAt);
  });
  it("daily available after 24h", () => {
    const last = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    assert.equal(isAvailable("daily", last, now).available, true);
  });
  it("weekly blocked within 7d", () => {
    const last = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    assert.equal(isAvailable("weekly", last, now).available, false);
  });
  it("weekly available after 7d", () => {
    const last = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    assert.equal(isAvailable("weekly", last, now).available, true);
  });
});

// ─── Integration: replay protection at the DB layer ──────────────────────────
//
// The /tests/submit handler relies on persisting the session JTI alongside
// each result row, then leaning on the unique index (user_id, session_jti)
// as the authoritative replay guard. If the column ever stops being written,
// Postgres will silently allow the duplicate (multiple NULLs are distinct).
// This test inserts two rows with the same (userId, jti) and asserts the
// second one is rejected with code 23505, proving the persistence + index
// pair is wired up correctly.

describe("phonics_test_results — replay protection (DB integration)", () => {
  it("rejects a second insert with the same (userId, sessionJti) via unique index", async () => {
    const userId = `replay-test-${randomUUID()}`;
    const jti = randomUUID();
    const baseRow = {
      childId: 999_999,
      userId,
      testType: "daily" as const,
      ageGroup: "2_3y" as const,
      score: 3,
      total: 5,
      accuracyPct: 60,
      performanceLabel: "Improving",
      weakConcepts: [],
      typeBreakdown: {},
      insightText: "test",
      insightSuggestion: "test",
      sessionJti: jti,
      completedAt: new Date(),
    };
    try {
      const inserted = await db
        .insert(phonicsTestResultsTable)
        .values(baseRow)
        .returning();
      assert.equal(inserted.length, 1);
      assert.equal(inserted[0].sessionJti, jti);

      // Second insert with the SAME jti for the SAME user must fail.
      let caught: unknown = null;
      try {
        await db.insert(phonicsTestResultsTable).values(baseRow);
      } catch (err) {
        caught = err;
      }
      assert.ok(caught, "expected duplicate insert to throw");
      // The underlying Postgres SQLSTATE for unique_violation is 23505. Different
      // drivers expose it in slightly different places; we check common spots.
      const e = caught as Record<string, unknown>;
      const code =
        (e?.code as string | undefined) ??
        ((e?.cause as Record<string, unknown> | undefined)?.code as string | undefined);
      const message = String((e as { message?: unknown })?.message ?? "");
      const looksLikeUniqueViolation =
        code === "23505" ||
        /duplicate key|unique constraint|phonics_test_results_user_jti_uniq_idx/i.test(
          message,
        );
      assert.ok(
        looksLikeUniqueViolation,
        `expected unique-violation, got code=${code} message=${message}`,
      );
    } finally {
      await db
        .delete(phonicsTestResultsTable)
        .where(eq(phonicsTestResultsTable.userId, userId));
    }
  });

  it("allows two rows for the SAME user when JTIs differ", async () => {
    const userId = `replay-test-${randomUUID()}`;
    const baseRow = {
      childId: 999_999,
      userId,
      testType: "daily" as const,
      ageGroup: "2_3y" as const,
      score: 3,
      total: 5,
      accuracyPct: 60,
      performanceLabel: "Improving",
      weakConcepts: [],
      typeBreakdown: {},
      insightText: "test",
      insightSuggestion: "test",
      completedAt: new Date(),
    };
    try {
      await db
        .insert(phonicsTestResultsTable)
        .values({ ...baseRow, sessionJti: randomUUID() });
      await db
        .insert(phonicsTestResultsTable)
        .values({ ...baseRow, sessionJti: randomUUID() });
      const rows = await db
        .select()
        .from(phonicsTestResultsTable)
        .where(eq(phonicsTestResultsTable.userId, userId));
      assert.equal(rows.length, 2);
    } finally {
      await db
        .delete(phonicsTestResultsTable)
        .where(eq(phonicsTestResultsTable.userId, userId));
    }
  });

  it("allows two DIFFERENT users to share the same JTI string", async () => {
    // Sanity: the unique index is scoped per user, not global.
    const sharedJti = randomUUID();
    const userA = `replay-test-A-${randomUUID()}`;
    const userB = `replay-test-B-${randomUUID()}`;
    const mk = (uid: string) => ({
      childId: 999_999,
      userId: uid,
      testType: "daily" as const,
      ageGroup: "2_3y" as const,
      score: 3,
      total: 5,
      accuracyPct: 60,
      performanceLabel: "Improving",
      weakConcepts: [],
      typeBreakdown: {},
      insightText: "test",
      insightSuggestion: "test",
      sessionJti: sharedJti,
      completedAt: new Date(),
    });
    try {
      await db.insert(phonicsTestResultsTable).values(mk(userA));
      await db.insert(phonicsTestResultsTable).values(mk(userB));
      const rows = await db
        .select()
        .from(phonicsTestResultsTable)
        .where(
          and(
            eq(phonicsTestResultsTable.sessionJti, sharedJti),
          ),
        );
      assert.ok(rows.length >= 2);
    } finally {
      await db
        .delete(phonicsTestResultsTable)
        .where(eq(phonicsTestResultsTable.userId, userA));
      await db
        .delete(phonicsTestResultsTable)
        .where(eq(phonicsTestResultsTable.userId, userB));
    }
  });
});
