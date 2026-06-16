import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SmartStudyLesson } from "./types.js";
import {
  FRESH_LESSON_WINDOW_MS,
  buildFreshLessonSequence,
  resolveFreshLessonOnLogin,
  shouldAdvanceFreshLesson,
  assignFreshLesson,
  emptyFreshLessonState,
} from "./fresh-lesson-state.js";
import {
  emptyLessonVisibility,
  recordLessonViewed,
  smartStudyActivityId,
} from "./lesson-visibility.js";

function lesson(id: string, subject: string): SmartStudyLesson {
  return {
    id,
    ageBand: "6-8",
    subject,
    difficulty: "easy",
    learningLevel: 2,
    title: `Lesson ${id}`,
    description: "Short description",
    lessonContent: "Word ".repeat(40).trim(),
    questions: ["Q1?", "Q2?"],
    answers: ["A1", "A2"],
    funFact: "Fun",
    amyExplanation: "Amy",
    audioText: "Listen",
  };
}

const POOL = [
  lesson("ss-a", "Addition"),
  lesson("ss-b", "Subtraction"),
  lesson("ss-c", "Counting"),
];

describe("fresh-lesson-state progression", () => {
  it("assigns first unseen lesson on first login", () => {
    const sequence = buildFreshLessonSequence(POOL, emptyLessonVisibility(), []);
    const out = resolveFreshLessonOnLogin({
      state: emptyFreshLessonState(),
      sequence,
      nowMs: Date.parse("2026-06-16T10:00:00Z"),
    });
    assert.equal(out.event, "assigned");
    assert.equal(out.lessonId, "ss-a");
    assert.equal(out.state.currentFreshLessonId, "ss-a");
  });

  it("keeps same lesson on multiple logins within 24h", () => {
    const assignedAt = "2026-06-16T10:00:00Z";
    const state = assignFreshLesson(["ss-a", "ss-b", "ss-c"], "ss-a", assignedAt);
    const sequence = buildFreshLessonSequence(POOL, emptyLessonVisibility(), []);

    const login2 = resolveFreshLessonOnLogin({
      state,
      sequence,
      nowMs: Date.parse("2026-06-16T14:00:00Z"),
    });
    assert.equal(login2.event, "reopened");
    assert.equal(login2.lessonId, "ss-a");

    const login3 = resolveFreshLessonOnLogin({
      state: login2.state,
      sequence,
      nowMs: Date.parse("2026-06-16T20:00:00Z"),
    });
    assert.equal(login3.event, "reopened");
    assert.equal(login3.lessonId, "ss-a");
  });

  it("advances exactly one lesson after 24h even when child skipped days", () => {
    const assignedAt = "2026-06-16T10:00:00Z";
    const state = assignFreshLesson(["ss-a", "ss-b", "ss-c"], "ss-a", assignedAt);
    const sequence = buildFreshLessonSequence(POOL, emptyLessonVisibility(), []);

    const afterTwoDays = resolveFreshLessonOnLogin({
      state,
      sequence,
      nowMs: Date.parse("2026-06-18T09:00:00Z"),
    });
    assert.equal(afterTwoDays.event, "advanced");
    assert.equal(afterTwoDays.lessonId, "ss-b");
  });

  it("advances only one step after 7 days away", () => {
    const assignedAt = "2026-06-09T10:00:00Z";
    const state = assignFreshLesson(["ss-a", "ss-b", "ss-c"], "ss-a", assignedAt);
    const sequence = buildFreshLessonSequence(POOL, emptyLessonVisibility(), []);

    const afterWeek = resolveFreshLessonOnLogin({
      state,
      sequence,
      nowMs: Date.parse("2026-06-16T10:00:00Z"),
    });
    assert.equal(afterWeek.event, "advanced");
    assert.equal(afterWeek.lessonId, "ss-b");
    assert.notEqual(afterWeek.lessonId, "ss-c");
  });

  it("does not advance before 24h even when lesson is completed", () => {
    const assignedAt = "2026-06-16T10:00:00Z";
    const state = assignFreshLesson(["ss-a", "ss-b", "ss-c"], "ss-a", assignedAt);
    const completed = [smartStudyActivityId("ss-a")];
    const sequence = buildFreshLessonSequence(POOL, emptyLessonVisibility(), completed);

    assert.equal(shouldAdvanceFreshLesson(state, Date.parse("2026-06-16T18:00:00Z")), false);

    const out = resolveFreshLessonOnLogin({
      state,
      sequence,
      nowMs: Date.parse("2026-06-16T18:00:00Z"),
    });
    assert.equal(out.event, "reopened");
    assert.equal(out.lessonId, "ss-a");
  });

  it("progresses through unseen lessons in catalog id order", () => {
    let state = emptyFreshLessonState();
    const sequence = buildFreshLessonSequence(POOL, emptyLessonVisibility(), []);
    const t0 = Date.parse("2026-06-01T10:00:00Z");

    const first = resolveFreshLessonOnLogin({ state, sequence, nowMs: t0 });
    assert.equal(first.lessonId, "ss-a");
    state = first.state;

    const second = resolveFreshLessonOnLogin({
      state,
      sequence,
      nowMs: t0 + FRESH_LESSON_WINDOW_MS + 1000,
    });
    assert.equal(second.lessonId, "ss-b");

    const third = resolveFreshLessonOnLogin({
      state: second.state,
      sequence,
      nowMs: t0 + 2 * FRESH_LESSON_WINDOW_MS + 2000,
    });
    assert.equal(third.lessonId, "ss-c");
  });

  it("falls back to least-recently-viewed when no unseen lessons remain", () => {
    let vis = emptyLessonVisibility();
    vis = recordLessonViewed(vis, "ss-a", "2026-06-10T10:00:00Z");
    vis = recordLessonViewed(vis, "ss-b", "2026-06-15T10:00:00Z");
    vis = recordLessonViewed(vis, "ss-c", "2026-06-12T10:00:00Z");
    const completed = [
      smartStudyActivityId("ss-a"),
      smartStudyActivityId("ss-b"),
      smartStudyActivityId("ss-c"),
    ];
    const sequence = buildFreshLessonSequence(POOL, vis, completed);
    assert.deepEqual(sequence, ["ss-a", "ss-c", "ss-b"]);

    const out = resolveFreshLessonOnLogin({
      state: emptyFreshLessonState(),
      sequence,
      nowMs: Date.parse("2026-06-16T10:00:00Z"),
    });
    assert.equal(out.lessonId, "ss-a");
  });

  it("reopens last lesson when sequence exhausted at end", () => {
    const assignedAt = "2026-06-01T10:00:00Z";
    const state = assignFreshLesson(["ss-a", "ss-b", "ss-c"], "ss-c", assignedAt);
    const sequence = buildFreshLessonSequence(POOL, emptyLessonVisibility(), [
      smartStudyActivityId("ss-a"),
      smartStudyActivityId("ss-b"),
      smartStudyActivityId("ss-c"),
    ]);

    const out = resolveFreshLessonOnLogin({
      state,
      sequence,
      nowMs: Date.parse("2026-06-03T10:00:00Z"),
    });
    assert.equal(out.event, "reopened");
    assert.equal(out.lessonId, "ss-c");
  });
});
