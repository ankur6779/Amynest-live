import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isMealOptionCompliant,
  isHighProteinMode,
  parseMealOptionsFromNotes,
  sanitizeMealOptions,
  sanitizeMealOptionsInRoutineItems,
  formatMealOptionsNotes,
} from "./routine-meal-options-safety.js";

describe("isMealOptionCompliant", () => {
  it("rejects egg for vegetarian", () => {
    assert.equal(
      isMealOptionCompliant("Egg bhurji with roti", { dietType: "vegetarian" }),
      false,
    );
  });

  it("rejects dairy for vegan", () => {
    assert.equal(
      isMealOptionCompliant("Fruit with curd", { dietType: "vegan" }),
      false,
    );
  });

  it("rejects gluten ingredients when gluten allergic", () => {
    assert.equal(
      isMealOptionCompliant("Avocado toast", {
        dietType: "vegetarian",
        allergies: "gluten",
      }),
      false,
    );
  });

  it("allows certified GF oats when gluten allergic", () => {
    assert.equal(
      isMealOptionCompliant("Certified GF oats porridge with banana", {
        dietType: "gluten_free",
        allergies: "gluten",
      }),
      true,
    );
  });

  it("rejects peanuts for peanut allergy", () => {
    assert.equal(
      isMealOptionCompliant("Poha with peanuts", {
        dietType: "vegetarian",
        allergies: "peanuts",
      }),
      false,
    );
  });

  it("high-protein mode rejects carb-dominant dal-rice only style", () => {
    assert.equal(
      isMealOptionCompliant("Plain rice with light dal", {
        dietType: "mixed",
        goals: "high-protein focus",
        highProtein: true,
      }),
      false,
    );
  });

  it("high-protein mode accepts primary protein option", () => {
    assert.equal(
      isMealOptionCompliant("Grilled chicken with mixed vegetables", {
        dietType: "mixed",
        highProtein: true,
      }),
      true,
    );
  });

  it("C-02: rejects honey for ageInMonths under 12", () => {
    assert.equal(
      isMealOptionCompliant("Oatmeal with honey", {
        dietType: "vegetarian",
        ageInMonths: 8,
      }),
      false,
    );
    assert.equal(
      isMealOptionCompliant("Fruit salad + honey", {
        dietType: "vegetarian",
        ageInMonths: 0,
      }),
      false,
    );
    assert.equal(
      isMealOptionCompliant("Oatmeal with honey", {
        dietType: "vegetarian",
        ageInMonths: 11,
      }),
      false,
    );
  });

  it("C-02: preserves honey for ageInMonths 12 and older", () => {
    assert.equal(
      isMealOptionCompliant("Oatmeal with honey", {
        dietType: "vegetarian",
        ageInMonths: 12,
      }),
      true,
    );
    assert.equal(
      isMealOptionCompliant("Oatmeal with honey", {
        dietType: "vegetarian",
        ageInMonths: 24,
      }),
      true,
    );
  });

  it("C-02: vegan still rejects honey regardless of age", () => {
    assert.equal(
      isMealOptionCompliant("Oatmeal with honey", {
        dietType: "vegan",
        ageInMonths: 24,
      }),
      false,
    );
    assert.equal(
      isMealOptionCompliant("Oatmeal with honey", {
        dietType: "vegan",
        ageInMonths: 8,
      }),
      false,
    );
  });

  it("C-02: non-honey options unchanged by age gate", () => {
    assert.equal(
      isMealOptionCompliant("Soft vegetable khichdi", {
        dietType: "vegetarian",
        ageInMonths: 8,
      }),
      true,
    );
    assert.equal(
      isMealOptionCompliant("Soft vegetable khichdi", {
        dietType: "vegetarian",
        ageInMonths: 24,
      }),
      true,
    );
  });
});

describe("sanitizeMealOptions C-02 honey age gate", () => {
  it("replaces honey options when ageInMonths < 12", () => {
    const out = sanitizeMealOptions(
      [
        "Oatmeal with honey",
        "Soft idli with sambar",
        "Fruit with curd",
        "Soft dal with rice",
      ],
      { dietType: "vegetarian", ageInMonths: 9 },
    );
    assert.equal(out.length, 4);
    assert.equal(out.some((o) => /\bhoney\b/i.test(o)), false);
  });

  it("keeps honey options when ageInMonths >= 12", () => {
    const out = sanitizeMealOptions(
      [
        "Oatmeal with honey",
        "Soft idli with sambar",
        "Fruit with curd",
        "Soft dal with rice",
      ],
      { dietType: "vegetarian", ageInMonths: 12 },
    );
    assert.equal(out.length, 4);
    assert.equal(out.some((o) => /\bhoney\b/i.test(o)), true);
  });
});

describe("sanitizeMealOptions", () => {
  it("replaces invalid options and returns exactly 4 compliant items", () => {
    const out = sanitizeMealOptions(
      [
        "Egg bhurji with roti",
        "Paneer tikka with salad",
        "Chicken curry with rice",
        "Fish fry",
      ],
      { dietType: "vegetarian", allergies: "eggs" },
    );
    assert.equal(out.length, 4);
    for (const opt of out) {
      assert.equal(
        isMealOptionCompliant(opt, { dietType: "vegetarian", allergies: "eggs" }),
        true,
      );
    }
    assert.ok(!out.some((o) => /egg/i.test(o)));
  });

  it("pads high-protein block with protein-forward fallbacks", () => {
    const out = sanitizeMealOptions(["Plain rice with curry"], {
      dietType: "mixed",
      highProtein: true,
      foodStyle: "indian",
    });
    assert.equal(out.length, 4);
    for (const opt of out) {
      assert.equal(
        isMealOptionCompliant(opt, {
          dietType: "mixed",
          highProtein: true,
          foodStyle: "indian",
        }),
        true,
      );
    }
  });
});

describe("sanitizeMealOptionsInRoutineItems", () => {
  it("rewrites meal notes with Options format", () => {
    const { items, corrections } = sanitizeMealOptionsInRoutineItems(
      [
        {
          activity: "Breakfast",
          category: "meal",
          notes: "Options: Egg paratha with curd | Soft idli with sambar | Poha | Banana",
        },
      ],
      { dietType: "vegetarian", allergies: "eggs", ageGroup: "toddler" },
    );
    assert.ok(corrections.length > 0);
    const notes = items[0]!.notes ?? "";
    assert.match(notes, /^Options: /);
    const parsed = parseMealOptionsFromNotes(notes);
    assert.ok(parsed && parsed.options.length === 4);
    assert.equal(parsed.options.some((o) => /egg/i.test(o)), false);
  });

  it("skips infant feeding blocks", () => {
    const { items, corrections } = sanitizeMealOptionsInRoutineItems(
      [
        {
          activity: "Milk feed",
          category: "feeding",
          notes: "On-demand feeding",
        },
      ],
      { dietType: "non_veg", ageGroup: "infant" },
    );
    assert.equal(corrections.length, 0);
    assert.equal(items[0]!.notes, "On-demand feeding");
  });
});

describe("parseMealOptionsFromNotes", () => {
  it("parses prefixed school lunch notes", () => {
    const parsed = parseMealOptionsFromNotes(
      "Packed for school. Options: Idli | Dosa | Upma | Poha",
    );
    assert.ok(parsed);
    assert.equal(parsed!.options.length, 4);
    assert.match(parsed!.prefix, /Packed for school/i);
  });

  it("formats round-trip notes", () => {
    const notes = formatMealOptionsNotes(
      ["A", "B", "C", "D"],
      "Tip:",
    );
    assert.equal(notes, "Tip: Options: A | B | C | D");
  });
});

describe("isHighProteinMode", () => {
  it("detects from goals string", () => {
    assert.equal(
      isHighProteinMode({ dietType: "mixed", goals: "high-protein balanced" }),
      true,
    );
  });
});
