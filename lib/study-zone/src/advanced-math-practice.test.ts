import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pickAdvancedMathQuestions,
  isAdvancedMathPracticeSubject,
  getPracticePickerTopics,
  ADVANCED_MATH_PRACTICE_SUBJECTS,
} from "./advanced-math-practice.js";
import { pickPracticeQuestions, isTopicPracticeSubject } from "./topic-practice.js";

describe("advanced-math-practice", () => {
  it("generates varied algebra questions", () => {
    const qs = pickAdvancedMathQuestions({
      level: 4,
      subject: "algebra-basics",
      count: 5,
      seed: 123,
    });
    assert.equal(qs.length, 5);
    const ids = new Set(qs.map((q) => q.id));
    assert.equal(ids.size, 5);
    for (const q of qs) {
      assert.ok(q.options.includes(q.answer));
    }
  });

  it("generates quadratic and statistics questions", () => {
    const q1 = pickAdvancedMathQuestions({ level: 5, subject: "quadratic-equations", count: 2, seed: 1 });
    const q2 = pickAdvancedMathQuestions({ level: 6, subject: "statistics-basics", count: 2, seed: 2 });
    assert.equal(q1.length, 2);
    assert.equal(q2.length, 2);
  });

  it("registers all advanced math topics for adaptive practice", () => {
    for (const id of ADVANCED_MATH_PRACTICE_SUBJECTS) {
      assert.ok(isAdvancedMathPracticeSubject(id));
      assert.ok(isTopicPracticeSubject(id));
    }
  });

  it("routes advanced math through pickPracticeQuestions", () => {
    const qs = pickPracticeQuestions({ level: 5, subject: "linear-equations", count: 3, seed: 9 });
    assert.equal(qs.length, 3);
  });

  it("returns mode-specific picker topics", () => {
    assert.equal(getPracticePickerTopics("basic").length, 8);
    assert.equal(getPracticePickerTopics("advanced").length, 7);
    assert.ok(getPracticePickerTopics("advanced").some((t) => t.id === "algebra-basics"));
  });
});
