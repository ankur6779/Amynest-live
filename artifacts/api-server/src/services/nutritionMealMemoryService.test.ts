import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeMealKey } from "./nutritionMealMemoryService.js";

test("normalizeMealKey strips punctuation", () => {
  assert.equal(normalizeMealKey("Dal  Khichdi!!"), "dal khichdi");
});
