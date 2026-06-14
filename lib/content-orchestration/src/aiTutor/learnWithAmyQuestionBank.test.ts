import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEARN_AMY_QUESTION_BANK,
  resolveLearnAmyAgeGroup,
} from "./learnWithAmyQuestionBank.js";
import { generateQuestion } from "./questionEngine.js";

describe("learn with amy question bank", () => {
  it("has four options per age group question", () => {
    for (const group of Object.keys(LEARN_AMY_QUESTION_BANK) as Array<
      keyof typeof LEARN_AMY_QUESTION_BANK
    >) {
      for (const q of LEARN_AMY_QUESTION_BANK[group]) {
        assert.equal(q.options.length, 4);
        assert.ok(q.options[q.correctIndex]);
      }
    }
  });

  it("picks preschool questions for age 5", () => {
    const q = generateQuestion(
      {
        moduleId: "phonics",
        topic: "letter sounds",
        skillLevel: 2,
        difficulty: "easy",
      },
      { mistakesHistory: [], strengths: [], weakAreas: [] },
      0,
      5,
    );
    assert.equal(q.ageGroup, resolveLearnAmyAgeGroup(5));
    assert.equal(q.options.length, 4);
  });

  it("picks teen questions for age 12", () => {
    const q = generateQuestion(
      {
        moduleId: "cognitive",
        topic: "math",
        skillLevel: 4,
        difficulty: "hard",
      },
      { mistakesHistory: [], strengths: [], weakAreas: [] },
      0,
      12,
    );
    assert.equal(q.ageGroup, "teen");
  });
});
