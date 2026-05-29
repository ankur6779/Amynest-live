import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildItemPromptLines,
  buildListeningEncouragement,
  buildSessionClosing,
  buildSessionGreeting,
  buildStreakCelebration,
  createCoachDialogueContext,
  evaluateCoachResponse,
} from "../coach-dialogue";
import type { PronouncePrompt } from "../types";

const baseCtx = createCoachDialogueContext({
  childName: "Maya",
  ageMonths: 48,
  promptKind: "word",
  sessionIndex: 0,
  sessionTotal: 6,
  streak: 0,
  sessionSeed: 42_001,
  turnIndex: 0,
});

const wordPrompt: PronouncePrompt = {
  id: "test_cat",
  kind: "word",
  text: "cat",
  ageBands: ["3y"],
  i18nKeyHint: "",
  difficulty: "easy",
};

describe("coach-dialogue session opening", () => {
  it("builds a multi-line greeting with the child name", () => {
    const lines = buildSessionGreeting(baseCtx);
    assert.ok(lines.length >= 4);
    assert.ok(lines.some((l) => l.includes("Maya") || l.includes("Amy")));
  });

  it("varies greeting templates by session seed", () => {
    const a = buildSessionGreeting({ ...baseCtx, sessionSeed: 1 });
    const b = buildSessionGreeting({ ...baseCtx, sessionSeed: 999 });
    assert.notDeepEqual(a, b);
  });
});

describe("coach-dialogue item turns", () => {
  it("includes an invite before the spoken prompt", () => {
    const lines = buildItemPromptLines(baseCtx, wordPrompt);
    assert.equal(lines.length, 2);
    assert.ok(lines[0]!.length > 0);
    assert.match(lines[1]!, /cat/i);
  });
});

describe("coach-dialogue feedback", () => {
  it("rewards correct answers with praise", () => {
    const result = evaluateCoachResponse(wordPrompt, "cat", baseCtx);
    assert.equal(result.correct, true);
    assert.equal(result.feedback, "great");
    assert.ok(result.spokenLines.length >= 1);
    assert.ok(result.spokenLines[0]!.length > 0);
  });

  it("coaches incorrect answers without negative language", () => {
    const result = evaluateCoachResponse(wordPrompt, "dog", baseCtx);
    assert.equal(result.correct, false);
    const combined = result.spokenLines.join(" ").toLowerCase();
    assert.ok(!combined.includes("wrong"));
    assert.ok(!combined.includes("incorrect"));
    assert.ok(combined.includes("try") || combined.includes("listen") || combined.includes("again"));
  });

  it("celebrates a streak of three", () => {
    const ctx = { ...baseCtx, streak: 2 };
    const result = evaluateCoachResponse(wordPrompt, "cat", ctx);
    assert.equal(result.streakLine, buildStreakCelebration(3, ctx));
  });
});

describe("coach-dialogue listening encouragement", () => {
  it("returns null on most turns", () => {
    let nulls = 0;
    for (let i = 0; i < 20; i++) {
      const line = buildListeningEncouragement({ ...baseCtx, turnIndex: i });
      if (line === null) nulls++;
    }
    assert.ok(nulls >= 10);
  });
});

describe("coach-dialogue session closing", () => {
  it("builds a warm multi-line closing", () => {
    const lines = buildSessionClosing(baseCtx, 50, 3);
    assert.ok(lines.length >= 4);
    assert.ok(lines.some((l) => /see you|next time|again|soon/i.test(l)));
  });
});
