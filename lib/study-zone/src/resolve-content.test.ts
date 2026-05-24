import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeStudyCountry,
  parseChildClassNumber,
  topicMatchesClass,
  getBasicSubjectsForCountry,
  getBasicSubjectsForChild,
  getPlayCategoriesForCountry,
  getPlayCategoriesForChild,
} from "./resolve-content.js";

describe("resolve-content — country", () => {
  it("normalizes GB to UK and unknown to DEFAULT", () => {
    assert.equal(normalizeStudyCountry("GB"), "UK");
    assert.equal(normalizeStudyCountry("IN"), "IN");
    assert.equal(normalizeStudyCountry(null), "US");
    assert.equal(normalizeStudyCountry("FR"), "DEFAULT");
  });

  it("replaces GK basics with India content for IN users", () => {
    const packs = getBasicSubjectsForCountry("IN");
    const gk = packs.find((p) => p.id === "gk");
    assert.ok(gk);
    const basics = gk!.topics.find((t) => t.id === "country-basics");
    assert.ok(basics);
    assert.match(basics!.notes, /New Delhi/i);
    assert.ok(gk!.topics.some((t) => t.id === "local-festivals"));
    assert.ok(!gk!.topics.some((t) => t.id === "india-basics"));
  });

  it("localizes play alphabets for India", () => {
    const cats = getPlayCategoriesForCountry("IN");
    const alpha = cats.find((c) => c.id === "alphabets");
    const a = alpha!.items.find((i) => i.id === "A");
    assert.match(a!.speak, /Alphonso/i);
  });

  it("limits play content for toddlers (age 3)", () => {
    const cats = getPlayCategoriesForChild("US", 3);
    const alpha = cats.find((c) => c.id === "alphabets");
    assert.equal(alpha!.items.length, 5);
    const nums = cats.find((c) => c.id === "numbers");
    assert.equal(nums!.items.length, 5);
  });
});

describe("resolve-content — class filtering", () => {
  it("parses class numbers from childClass labels", () => {
    assert.equal(parseChildClassNumber("Class 3", 8), 3);
    assert.equal(parseChildClassNumber("UKG", 5), 0);
    assert.equal(parseChildClassNumber(null, 8), 3);
  });

  it("filters basic math topics for class 1", () => {
    const packs = getBasicSubjectsForChild("US", "1", 6);
    const math = packs.find((p) => p.id === "math");
    assert.ok(math);
    const ids = math!.topics.map((t) => t.id);
    assert.ok(ids.includes("addition"));
    assert.ok(!ids.includes("fractions"));
  });

  it("topicMatchesClass respects advanced bands", () => {
    assert.equal(topicMatchesClass("quadratic-equations", "math", "advanced", 9), true);
    assert.equal(topicMatchesClass("quadratic-equations", "math", "advanced", 7), false);
  });
});
