import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  difficultyForAccuracy,
  recomputeWeakTopics,
  appendAttempt,
  buildDailyPlan,
  planCompletionPct,
} from "./adaptive";
import { BASIC_SUBJECTS, ADVANCED_SUBJECTS } from "./index";

describe("adaptive.difficultyForAccuracy", () => {
  it("starts easy when there's no history", () => {
    assert.equal(difficultyForAccuracy([]), "easy");
  });
  it("bumps to hard above 80% accuracy", () => {
    const a = Array.from({ length: 10 }, (_, i) => ({ correct: i < 9 })); // 90%
    assert.equal(difficultyForAccuracy(a), "hard");
  });
  it("drops to easy below 60% accuracy", () => {
    const a = Array.from({ length: 10 }, (_, i) => ({ correct: i < 5 })); // 50%
    assert.equal(difficultyForAccuracy(a), "easy");
  });
  it("stays medium between 60% and 80%", () => {
    const a = Array.from({ length: 10 }, (_, i) => ({ correct: i < 7 })); // 70%
    assert.equal(difficultyForAccuracy(a), "medium");
  });
  it("treats exactly 80% as medium (not yet > 80)", () => {
    const a = Array.from({ length: 10 }, (_, i) => ({ correct: i < 8 })); // 80%
    assert.equal(difficultyForAccuracy(a), "medium");
  });
  it("ignores attempts older than the 7-day window", () => {
    const now = new Date("2026-05-10T00:00:00Z");
    const old = new Date("2026-05-01T00:00:00Z").toISOString(); // 9 days ago
    const recent = new Date("2026-05-09T00:00:00Z").toISOString(); // within window
    // Old attempts are all wrong, recent are all right — engine should
    // see only "all right" → hard, not be dragged down by stale fails.
    const attempts = [
      ...Array.from({ length: 5 }, () => ({ correct: false, ts: old })),
      ...Array.from({ length: 5 }, () => ({ correct: true, ts: recent })),
    ];
    assert.equal(difficultyForAccuracy(attempts, now), "hard");
  });
  it("falls back to easy when every attempt is stale (window empty)", () => {
    const now = new Date("2026-05-10T00:00:00Z");
    const old = new Date("2026-04-01T00:00:00Z").toISOString();
    const attempts = Array.from({ length: 10 }, () => ({ correct: true, ts: old }));
    assert.equal(difficultyForAccuracy(attempts, now), "easy");
  });
});

describe("adaptive.recomputeWeakTopics", () => {
  it("flags topics with <60% per-topic accuracy and ≥2 attempts", () => {
    const a = [
      { topicId: "addition", correct: false },
      { topicId: "addition", correct: false },
      { topicId: "addition", correct: true },
      { topicId: "shapes", correct: true },
      { topicId: "shapes", correct: true },
    ];
    const weak = recomputeWeakTopics(a);
    assert.deepEqual(weak, ["addition"]);
  });
  it("ignores single-attempt topics (signal too weak)", () => {
    const a = [{ topicId: "x", correct: false }];
    assert.deepEqual(recomputeWeakTopics(a), []);
  });
  it("caps weak list at 5", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g"];
    const a = ids.flatMap((id) => [
      { topicId: id, correct: false },
      { topicId: id, correct: false },
    ]);
    assert.equal(recomputeWeakTopics(a).length, 5);
  });
});

describe("adaptive.appendAttempt", () => {
  it("keeps a rolling window of size 20", () => {
    let win: { topicId: string; correct: boolean; ts: string }[] = [];
    for (let i = 0; i < 25; i++) {
      win = appendAttempt(win, { topicId: `t${i}`, correct: i % 2 === 0, ts: `${i}` });
    }
    assert.equal(win.length, 20);
    assert.equal(win[0]?.topicId, "t5");
    assert.equal(win[19]?.topicId, "t24");
  });

  it("stays bounded at 20 across a per-question session burst", () => {
    // Simulate the new client behaviour: a single session posts one
    // attempt per question (e.g. 5 questions) — the rolling window must
    // never exceed 20 even when prior history is already full.
    let win: { topicId: string; correct: boolean; ts: string }[] = Array.from(
      { length: 20 },
      (_, i) => ({ topicId: "old", correct: true, ts: `${i}` }),
    );
    const session = Array.from({ length: 5 }, (_, i) => ({
      topicId: "addition", correct: false, ts: `s${i}`,
    }));
    for (const a of session) win = appendAttempt(win, a);
    assert.equal(win.length, 20);
    // Last 5 entries are the per-question session, in order.
    assert.deepEqual(
      win.slice(-5).map((a) => a.ts),
      ["s0", "s1", "s2", "s3", "s4"],
    );
  });
});

describe("adaptive: per-question attempt shape", () => {
  it("flags a topic as weak after a single bad session (per-question writes)", () => {
    // Before per-question logging the client posted ONE aggregate
    // attempt per session, so two losing sessions were needed before
    // recomputeWeakTopics fired (≥2 attempts on the topic). With
    // per-question writes a single 5-question Practice run on a topic
    // produces 5 attempts, so a sub-60% session flips the topic to weak
    // immediately — which is the whole point of the change.
    const session = [
      { topicId: "addition", correct: false },
      { topicId: "addition", correct: false },
      { topicId: "addition", correct: false },
      { topicId: "addition", correct: true },
      { topicId: "addition", correct: false },
    ]; // 1/5 = 20% accuracy
    assert.deepEqual(recomputeWeakTopics(session), ["addition"]);
  });

  it("does NOT flag a passing per-question session as weak", () => {
    const session = [
      { topicId: "addition", correct: true },
      { topicId: "addition", correct: true },
      { topicId: "addition", correct: false },
      { topicId: "addition", correct: true },
      { topicId: "addition", correct: true },
    ]; // 4/5 = 80% accuracy
    assert.deepEqual(recomputeWeakTopics(session), []);
  });

  it("difficultyForAccuracy reacts within one per-question session", () => {
    // Five wrong question-attempts in a single session is enough signal
    // to drop difficulty to easy without waiting for a second session.
    const attempts = Array.from({ length: 5 }, () => ({ correct: false }));
    assert.equal(difficultyForAccuracy(attempts), "easy");
  });

  it("today's plan picks up a topic newly weak from this session's per-question writes", () => {
    const mathPack = BASIC_SUBJECTS.find((s) => s.id === "math")!;
    const weakTopic = mathPack.topics[0]!.id;
    // Five per-question writes from one Practice run, mostly wrong.
    const sessionAttempts = [
      { topicId: weakTopic, correct: false },
      { topicId: weakTopic, correct: false },
      { topicId: weakTopic, correct: true },
      { topicId: weakTopic, correct: false },
      { topicId: weakTopic, correct: false },
    ];
    const weak = recomputeWeakTopics(sessionAttempts);
    const plan = buildDailyPlan({
      childAge: 8, dateIso: "2026-05-01",
      subjects: [{ subject: "math", attempts: sessionAttempts, weakTopics: weak }],
    });
    const has = plan.items.some((i) =>
      i.subject === "math" && i.topicId === weakTopic && i.source === "weak",
    );
    assert.ok(has, "expected newly-weak topic from this session to appear in today's plan");
  });
});

describe("adaptive.buildDailyPlan", () => {
  it("returns an empty plan for play-mode (under 6) since no study topics exist", () => {
    const plan = buildDailyPlan({
      childAge: 4, dateIso: "2026-05-01", subjects: [],
    });
    assert.equal(plan.items.length, 0);
  });
  it("returns 3–5 items for a basic-mode child with no history", () => {
    const plan = buildDailyPlan({
      childAge: 8, dateIso: "2026-05-01", subjects: [],
    });
    assert.ok(plan.items.length >= 3 && plan.items.length <= 5, `got ${plan.items.length}`);
    assert.equal(plan.mode, "basic");
    // All items should map to real subjects/topics from BASIC_SUBJECTS.
    for (const it of plan.items) {
      const pack = BASIC_SUBJECTS.find((s) => s.id === it.subject);
      assert.ok(pack, `unknown subject ${it.subject}`);
      assert.ok(pack!.topics.find((t) => t.id === it.topicId), `unknown topic ${it.topicId}`);
    }
  });
  it("is deterministic per (date + child)", () => {
    const a = buildDailyPlan({ childAge: 8, dateIso: "2026-05-01", subjects: [] });
    const b = buildDailyPlan({ childAge: 8, dateIso: "2026-05-01", subjects: [] });
    assert.deepEqual(a.items.map((i) => i.id), b.items.map((i) => i.id));
  });
  it("carries over weak topics from yesterday", () => {
    const mathPack = BASIC_SUBJECTS.find((s) => s.id === "math")!;
    const weakTopic = mathPack.topics[0]!.id;
    const plan = buildDailyPlan({
      childAge: 8, dateIso: "2026-05-01",
      subjects: [{
        subject: "math",
        attempts: [
          { topicId: weakTopic, correct: false },
          { topicId: weakTopic, correct: false },
        ],
        weakTopics: [weakTopic],
      }],
    });
    const has = plan.items.some((i) => i.subject === "math" && i.topicId === weakTopic && i.source === "weak");
    assert.ok(has, "expected weak topic to appear in plan");
  });
  it("bumps difficulty for high-accuracy subjects", () => {
    const attempts = Array.from({ length: 10 }, () => ({ topicId: "x", correct: true }));
    const plan = buildDailyPlan({
      childAge: 12, dateIso: "2026-05-01",
      subjects: [{ subject: "math", attempts, weakTopics: [] }],
    });
    const mathItem = plan.items.find((i) => i.subject === "math" && i.source === "fresh");
    assert.ok(mathItem);
    assert.equal(mathItem!.difficulty, "hard");
  });
  it("uses advanced mode for class 6+ kids", () => {
    const plan = buildDailyPlan({ childAge: 12, dateIso: "2026-05-01", subjects: [] });
    assert.equal(plan.mode, "advanced");
    for (const it of plan.items) {
      assert.ok(ADVANCED_SUBJECTS.find((s) => s.id === it.subject));
    }
  });
});

describe("adaptive.planCompletionPct", () => {
  it("returns 0 for empty plans", () => {
    assert.equal(
      planCompletionPct({ date: "x", mode: "basic", items: [] }, new Set()),
      0,
    );
  });
  it("counts items whose topicId is in the done set", () => {
    const plan = buildDailyPlan({ childAge: 8, dateIso: "2026-05-01", subjects: [] });
    const halfDone = new Set(plan.items.slice(0, Math.ceil(plan.items.length / 2)).map((i) => i.topicId));
    const pct = planCompletionPct(plan, halfDone);
    assert.ok(pct >= 40 && pct <= 60, `got ${pct}`);
  });
});
