import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildWeeklySeedMatrix,
  collectTtsTextsFromItems,
} from "../learningContentSeedMatrix.js";

describe("learningContentSeedService", () => {
  it("buildWeeklySeedMatrix covers all six learning sections", () => {
    const jobs = buildWeeklySeedMatrix();
    const sections = new Set(jobs.map((j) => j.section));
    assert.equal(sections.size, 6);
    assert.ok(sections.has("smart_study"));
    assert.ok(sections.has("smart_math_tricks"));
    assert.ok(sections.has("olympiad"));
    assert.ok(sections.has("spelling"));
    assert.ok(sections.has("phonics"));
    assert.ok(sections.has("life_skills"));
  });

  it("collectTtsTextsFromItems extracts math trick audioText", () => {
    const texts = collectTtsTextsFromItems("smart_math_tricks", [
      { id: "x", audioText: "Add 10 easily!" },
    ]);
    assert.deepEqual(texts, ["Add 10 easily!"]);
  });

  it("collectTtsTextsFromItems dedupes spelling words", () => {
    const texts = collectTtsTextsFromItems("spelling", [
      { word: "cat" },
      { word: "cat" },
      { word: "dog" },
    ]);
    assert.deepEqual(texts, ["cat", "dog"]);
  });
});
