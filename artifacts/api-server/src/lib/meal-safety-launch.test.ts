import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assessMealAgeSafety,
  validateAndEnrichMeal,
} from "../lib/meal-safety.js";

test("assessMealAgeSafety blocks honey for 8-month infant", () => {
  const verdict = assessMealAgeSafety(
    { title: "Honey toast", ingredients: ["honey", "bread"] },
    8,
  );
  assert.equal(verdict.allowed, false);
  if (!verdict.allowed) {
    assert.match(verdict.reason, /infant|12 months/i);
  }
});

test("assessMealAgeSafety blocks whole grapes for toddler", () => {
  const verdict = assessMealAgeSafety(
    { title: "Whole grape snack", ingredients: ["whole grape"] },
    18,
  );
  assert.equal(verdict.allowed, false);
});

test("assessMealAgeSafety allows soft puree for 8-month infant", () => {
  const verdict = assessMealAgeSafety(
    { title: "Mashed banana puree", ingredients: ["banana"] },
    8,
  );
  assert.equal(verdict.allowed, true);
});

test("validateAndEnrichMeal throws on choking hazard for toddler", () => {
  assert.throws(
    () =>
      validateAndEnrichMeal(
        { title: "Whole grape cup", ingredients: ["whole grape"], tags: [], isVeg: true },
        20,
        "",
        "veg",
      ),
    /choking hazard/i,
  );
});

test("assessMealAgeSafety blocks popcorn for 24-month toddler", () => {
  const verdict = assessMealAgeSafety(
    { title: "Popcorn snack", ingredients: ["popcorn"] },
    24,
  );
  assert.equal(verdict.allowed, false);
});

test("validateAndEnrichMeal enriches safe toddler meal", () => {
  const result = validateAndEnrichMeal(
    { title: "Soft khichdi", ingredients: ["rice", "dal"], tags: ["veg"], isVeg: true },
    20,
    "",
    "veg",
  );
  assert.ok(result.safetyBadges.length > 0);
  assert.ok(result.whyThisMeal.length > 0);
});
