import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SmartStudyLesson } from "./types.js";
import {
  dailyFreshSeed,
  estimateLessonDurationMinutes,
  getRecommendedNextLesson,
  getUnseenLessons,
  mapCurriculumTopicToBankSubjects,
  pickDailyFreshLesson,
} from "./recommendations.js";
import {
  emptyLessonVisibility,
  extractCompletedSmartStudyIds,
  recordLessonViewed,
  smartStudyActivityId,
} from "./lesson-visibility.js";

function lesson(id: string, subject: string, ageBand: SmartStudyLesson["ageBand"] = "6-8"): SmartStudyLesson {
  return {
    id,
    ageBand,
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

describe("content-bank recommendations", () => {
  it("extracts completed smart-study ids from activity log", () => {
    const ids = extractCompletedSmartStudyIds([
      smartStudyActivityId("ss-4-6-addition-1"),
      "play_alphabets_A",
    ]);
    assert.deepEqual([...ids], ["ss-4-6-addition-1"]);
  });

  it("returns unseen lessons excluding viewed and completed", () => {
    const pool = [lesson("a", "Addition"), lesson("b", "Subtraction")];
    const vis = recordLessonViewed(emptyLessonVisibility(), "a", "2026-06-15T10:00:00Z");
    const unseen = getUnseenLessons(pool, vis, [smartStudyActivityId("b")]);
    assert.equal(unseen.length, 0);
    const unseen2 = getUnseenLessons(pool, emptyLessonVisibility(), []);
    assert.equal(unseen2.length, 2);
  });

  it("pickDailyFreshLesson (legacy date seed) is stable per child+date", () => {
    const pool = [
      lesson("ss-1", "Addition"),
      lesson("ss-2", "Subtraction"),
      lesson("ss-3", "Counting"),
    ];
    const first = pickDailyFreshLesson(42, "2026-06-16", pool, emptyLessonVisibility(), []);
    const again = pickDailyFreshLesson(42, "2026-06-16", pool, emptyLessonVisibility(), []);
    assert.ok(first);
    assert.equal(first!.id, again!.id);
    assert.equal(first!.isUnseen, true);

    const otherDay = pickDailyFreshLesson(42, "2026-06-17", pool, emptyLessonVisibility(), []);
    assert.ok(otherDay);
  });

  it("pickDailyFreshLesson falls back to least recently viewed", () => {
    const pool = [lesson("old", "Addition"), lesson("new", "Subtraction")];
    let vis = emptyLessonVisibility();
    vis = recordLessonViewed(vis, "old", "2026-06-10T10:00:00Z");
    vis = recordLessonViewed(vis, "new", "2026-06-15T10:00:00Z");
    const picked = pickDailyFreshLesson(7, "2026-06-16", pool, vis, [
      smartStudyActivityId("old"),
      smartStudyActivityId("new"),
    ]);
    assert.ok(picked);
    assert.equal(picked!.isUnseen, false);
  });

  it("getRecommendedNextLesson matches curriculum topic subjects", () => {
    const subjects = mapCurriculumTopicToBankSubjects("math", "addition");
    assert.ok(subjects.includes("Addition"));
    const pool = [
      lesson("add-1", "Addition"),
      lesson("geo-1", "Geography Basics"),
    ];
    const rec = getRecommendedNextLesson(
      5,
      "2026-06-16",
      "math",
      "addition",
      pool,
      emptyLessonVisibility(),
      [],
    );
    assert.ok(rec);
    assert.equal(rec!.subject, "Addition");
  });

  it("estimateLessonDurationMinutes returns bounded value", () => {
    const mins = estimateLessonDurationMinutes(lesson("x", "Numbers"));
    assert.ok(mins >= 3 && mins <= 12);
  });

  it("dailyFreshSeed differs by child and date", () => {
    assert.notEqual(dailyFreshSeed(1, "2026-06-16"), dailyFreshSeed(2, "2026-06-16"));
    assert.notEqual(dailyFreshSeed(1, "2026-06-16"), dailyFreshSeed(1, "2026-06-17"));
  });
});
