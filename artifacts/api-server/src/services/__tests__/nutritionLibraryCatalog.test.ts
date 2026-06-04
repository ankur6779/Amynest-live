import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getNutritionLibraryBookByFileName,
  nutritionLibraryGcsCandidates,
  NUTRITION_LIBRARY_BOOKS,
} from "../nutritionLibraryCatalog.js";

describe("nutritionLibraryCatalog", () => {
  it("includes all ten library books", () => {
    assert.equal(NUTRITION_LIBRARY_BOOKS.length, 10);
  });

  it("resolves books by exact file name", () => {
    const book = getNutritionLibraryBookByFileName("30-Minute Meals.pdf");
    assert.equal(book?.id, "30-minute-meals");
    assert.equal(book?.category, "Meal Planning");
  });

  it("lists canonical and legacy GCS paths", () => {
    const paths = nutritionLibraryGcsCandidates("Healthy Eating Habits.pdf");
    assert.ok(paths.some((p) => p.startsWith("nutrition-hub/books/")));
    assert.ok(paths.some((p) => p.includes("Nutrition Hub/Copy of")));
  });
});
