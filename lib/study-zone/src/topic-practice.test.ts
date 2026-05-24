import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pickPracticeQuestions,
  pickTopicPracticeQuestions,
  isTopicPracticeSubject,
  practicePackForSubject,
} from "./topic-practice.js";

describe("topic-practice", () => {
  it("generates science questions for plants", () => {
    const qs = pickTopicPracticeQuestions({
      level: 2,
      subject: "plants",
      count: 4,
      seed: 42,
    });
    assert.equal(qs.length, 4);
    for (const q of qs) {
      assert.ok(q.options.includes(q.answer));
      assert.match(q.q, /plant|food|soil|seed|sun/i);
    }
  });

  it("generates english questions for nouns", () => {
    const qs = pickPracticeQuestions({
      level: 3,
      subject: "nouns",
      count: 3,
      seed: 99,
    });
    assert.equal(qs.length, 3);
  });

  it("routes math through pickAdaptiveQuestions", () => {
    const qs = pickPracticeQuestions({ level: 3, subject: "addition", count: 3, seed: 1 });
    assert.equal(qs.length, 3);
    assert.ok(qs.every((q) => q.subject === "addition"));
  });

  it("maps practice subjects to pack ids", () => {
    assert.equal(practicePackForSubject("plants"), "science");
    assert.equal(practicePackForSubject("nouns"), "english");
    assert.equal(practicePackForSubject("addition"), "math");
    assert.ok(isTopicPracticeSubject("cells"));
    assert.ok(!isTopicPracticeSubject("not-real"));
  });
});
