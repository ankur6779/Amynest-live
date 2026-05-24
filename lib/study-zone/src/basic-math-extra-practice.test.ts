import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pickBasicMathExtraQuestions,
  isBasicMathExtraPracticeSubject,
  BASIC_MATH_EXTRA_PRACTICE_SUBJECTS,
} from "./basic-math-extra-practice.js";
import { pickPracticeQuestions, isTopicPracticeSubject } from "./topic-practice.js";
import { getPracticePickerTopics } from "./advanced-math-practice.js";

describe("basic-math-extra-practice", () => {
  it("generates geometry questions", () => {
    const qs = pickBasicMathExtraQuestions({
      level: 2,
      subject: "geometry-basics",
      count: 4,
      seed: 42,
    });
    assert.equal(qs.length, 4);
    for (const q of qs) {
      assert.ok(q.options.includes(q.answer));
    }
  });

  it("generates time & calendar questions", () => {
    const qs = pickBasicMathExtraQuestions({
      level: 3,
      subject: "time-calendar",
      count: 3,
      seed: 7,
    });
    assert.equal(qs.length, 3);
  });

  it("registers topics for adaptive practice", () => {
    for (const id of BASIC_MATH_EXTRA_PRACTICE_SUBJECTS) {
      assert.ok(isBasicMathExtraPracticeSubject(id));
      assert.ok(isTopicPracticeSubject(id));
    }
  });

  it("routes through pickPracticeQuestions", () => {
    const qs = pickPracticeQuestions({ level: 2, subject: "geometry-basics", count: 3, seed: 1 });
    assert.equal(qs.length, 3);
  });

  it("appears in basic mode practice picker", () => {
    const topics = getPracticePickerTopics("basic");
    assert.equal(topics.length, 8);
    assert.ok(topics.some((t) => t.id === "geometry-basics"));
    assert.ok(topics.some((t) => t.id === "time-calendar"));
  });
});
