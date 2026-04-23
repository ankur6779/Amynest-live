import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyRoutineV2,
  generateRuleBasedRoutine,
  timeToMins,
  minsToTime,
  type ScheduleItem,
} from "./routine-templates.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMealItem(activity: string, timeMins: number, notes = ""): ScheduleItem {
  return {
    time: minsToTime(timeMins),
    activity,
    duration: 30,
    category: "meal",
    notes,
    status: "pending",
  };
}

function makeTiffinItem(timeMins: number): ScheduleItem {
  return {
    time: minsToTime(timeMins),
    activity: "Tiffin",
    duration: 20,
    category: "tiffin",
    notes: "Options: Sandwich | Paratha",
    status: "pending",
  };
}

function baseItems(hasSchool: boolean): ScheduleItem[] {
  const items: ScheduleItem[] = [
    {
      time: "7:00 AM",
      activity: "Morning Hygiene & Dress Up",
      duration: 30,
      category: "hygiene",
      notes: "Brush, wash, get ready.",
      status: "pending",
    },
    makeMealItem("Breakfast", 7 * 60 + 30, "Options: Idli with sambar | Poha with peanuts"),
    makeMealItem("Lunch", hasSchool ? 13 * 60 : 13 * 60 + 30, "Options: Dal rice with sabzi | Rajma chawal"),
    makeMealItem("Drunch", 17 * 60 + 30, "Options: Cheese sandwich | Fruit chaat"),
    makeMealItem("Dinner", 20 * 60 + 15, "Options: Roti with dal | Khichdi with ghee"),
    {
      time: "9:30 PM",
      activity: "Sleep Time",
      duration: 0,
      category: "sleep",
      notes: "Aim for 9–10 hours.",
      status: "pending",
    },
  ];
  return items;
}

// ─── School-day tests ─────────────────────────────────────────────────────────

describe("applyRoutineV2 — school day (early_school, school 9 AM–2 PM)", () => {
  const SCHOOL_START = 9 * 60;   // 9:00 AM = 540 mins
  const SCHOOL_END   = 14 * 60;  // 2:00 PM = 840 mins

  const opts = {
    hasSchool: true,
    schoolStartMins: SCHOOL_START,
    schoolEndMins: SCHOOL_END,
    ageGroup: "early_school" as const,
  };

  const result = applyRoutineV2(baseItems(true), opts);

  it("Quick Meal Before School appears at 15 min before school start", () => {
    const qm = result.find((it) => /quick meal before school/i.test(it.activity));
    assert.ok(qm, "Quick Meal Before School should be present");
    const mins = timeToMins(qm!.time);
    // Should be ≤ schoolStart - 15 (i.e., 525 = 8:45 AM)
    assert.equal(mins, SCHOOL_START - 15, `Quick Meal should be at ${minsToTime(SCHOOL_START - 15)}, got ${qm!.time}`);
    assert.equal(qm!.duration, 15, "Quick Meal duration should be 15 min");
  });

  it("Tiffin slot is present for school day (early_school)", () => {
    const tiffin = result.find((it) =>
      /^tiffin$/i.test(it.activity) && (it.category ?? "").toLowerCase() === "tiffin"
    );
    assert.ok(tiffin, "Tiffin block should be present on school day");
  });

  it("Tiffin is inside school window (schoolStart + 60 min)", () => {
    const tiffin = result.find((it) => /^tiffin$/i.test(it.activity));
    assert.ok(tiffin);
    const t = timeToMins(tiffin!.time);
    assert.equal(t, SCHOOL_START + 60, `Tiffin should be at ${minsToTime(SCHOOL_START + 60)}, got ${tiffin!.time}`);
  });

  it("Lunch is anchored 30 min after school end", () => {
    const lunch = result.find((it) => /^lunch$/i.test(it.activity));
    assert.ok(lunch, "Lunch block should be present");
    const t = timeToMins(lunch!.time);
    assert.equal(t, SCHOOL_END + 30, `Lunch should be at ${minsToTime(SCHOOL_END + 30)}, got ${lunch!.time}`);
  });

  it("Drunch is anchored in 17:00–18:00 window", () => {
    const drunch = result.find((it) => /^drunch$/i.test(it.activity));
    assert.ok(drunch, "Drunch block should be present");
    const t = timeToMins(drunch!.time);
    assert.ok(t >= 17 * 60 && t <= 18 * 60, `Drunch should be 17:00–18:00, got ${drunch!.time}`);
  });

  it("Dinner is anchored in 20:00–21:00 window", () => {
    const dinner = result.find((it) => /^dinner$/i.test(it.activity));
    assert.ok(dinner, "Dinner block should be present");
    const t = timeToMins(dinner!.time);
    assert.ok(t >= 20 * 60 && t <= 21 * 60, `Dinner should be 20:00–21:00, got ${dinner!.time}`);
  });

  it("No duplicate meal names across the day", () => {
    const mealBlocks = result.filter((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase())
    );
    const mealNames = mealBlocks.map((it) => (it.meal ?? it.activity).toLowerCase());
    const unique = new Set(mealNames);
    assert.equal(
      unique.size,
      mealNames.length,
      `Duplicate meal names found: ${mealNames.join(", ")}`
    );
  });

  it("Every meal/tiffin block has recipe and nutrition attached", () => {
    const mealBlocks = result.filter((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase())
    );
    for (const block of mealBlocks) {
      assert.ok(
        block.recipe !== undefined,
        `Block "${block.activity}" (${block.time}) should have a recipe`
      );
      assert.ok(
        block.nutrition !== undefined,
        `Block "${block.activity}" (${block.time}) should have nutrition`
      );
    }
  });

  it("Recipe has required fields: prepTime, cookTime, servings, ingredients, steps", () => {
    const firstMeal = result.find((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase()) && it.recipe
    );
    assert.ok(firstMeal?.recipe, "At least one meal should have a recipe");
    const r = firstMeal!.recipe!;
    assert.ok(r.prepTime, "recipe.prepTime should be set");
    assert.ok(r.cookTime, "recipe.cookTime should be set");
    assert.ok(r.servings, "recipe.servings should be set");
    assert.ok(Array.isArray(r.ingredients) && r.ingredients.length > 0, "recipe.ingredients should be a non-empty array");
    assert.ok(Array.isArray(r.steps) && r.steps.length > 0, "recipe.steps should be a non-empty array");
  });

  it("Nutrition has required fields: calories, protein, carbs, fat", () => {
    const firstMeal = result.find((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase()) && it.nutrition
    );
    assert.ok(firstMeal?.nutrition, "At least one meal should have nutrition");
    const n = firstMeal!.nutrition!;
    assert.ok(n.calories, "nutrition.calories should be set");
    assert.ok(n.protein, "nutrition.protein should be set");
    assert.ok(n.carbs, "nutrition.carbs should be set");
    assert.ok(n.fat, "nutrition.fat should be set");
  });

  it("Items are sorted in ascending time order", () => {
    for (let i = 1; i < result.length; i++) {
      const prev = timeToMins(result[i - 1]!.time);
      const curr = timeToMins(result[i]!.time);
      assert.ok(curr >= prev, `Item at index ${i} (${result[i]!.time}) should come after index ${i - 1} (${result[i - 1]!.time})`);
    }
  });
});

// ─── Pre-teen school-day tests ────────────────────────────────────────────────

describe("applyRoutineV2 — school day (pre_teen, school 8 AM–1 PM)", () => {
  const SCHOOL_START = 8 * 60;   // 8:00 AM = 480 mins
  const SCHOOL_END   = 13 * 60;  // 1:00 PM = 780 mins

  const opts = {
    hasSchool: true,
    schoolStartMins: SCHOOL_START,
    schoolEndMins: SCHOOL_END,
    ageGroup: "pre_teen" as const,
  };

  const result = applyRoutineV2(baseItems(true), opts);

  it("Quick Meal Before School at 15 min before school start", () => {
    const qm = result.find((it) => /quick meal before school/i.test(it.activity));
    assert.ok(qm, "Quick Meal Before School should be present");
    assert.equal(timeToMins(qm!.time), SCHOOL_START - 15);
  });

  it("Tiffin present for pre_teen on school day", () => {
    const tiffin = result.find((it) => /^tiffin$/i.test(it.activity));
    assert.ok(tiffin, "Tiffin should be present for pre_teen on school day");
  });

  it("Lunch is 30 min after school end", () => {
    const lunch = result.find((it) => /^lunch$/i.test(it.activity));
    assert.ok(lunch, "Lunch block should be present");
    assert.equal(timeToMins(lunch!.time), SCHOOL_END + 30);
  });

  it("No duplicate meal names", () => {
    const mealBlocks = result.filter((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase())
    );
    const mealNames = mealBlocks.map((it) => (it.meal ?? it.activity).toLowerCase());
    const unique = new Set(mealNames);
    assert.equal(unique.size, mealNames.length, `Duplicates: ${mealNames.join(", ")}`);
  });
});

// ─── Non-school day tests ─────────────────────────────────────────────────────

describe("applyRoutineV2 — non-school day (early_school)", () => {
  const opts = {
    hasSchool: false,
    schoolStartMins: 9 * 60,
    schoolEndMins: 14 * 60,
    ageGroup: "early_school" as const,
  };

  const result = applyRoutineV2(baseItems(false), opts);

  it("Breakfast is anchored in the 8:00–9:00 window", () => {
    const bf = result.find((it) => /^breakfast$/i.test(it.activity));
    assert.ok(bf, "Breakfast block should be present on non-school day");
    const t = timeToMins(bf!.time);
    assert.ok(t >= 8 * 60 && t <= 9 * 60, `Breakfast should be 8–9 AM, got ${bf!.time}`);
  });

  it("No Tiffin block on non-school day", () => {
    const tiffin = result.find((it) =>
      /^tiffin$/i.test(it.activity) && (it.category ?? "").toLowerCase() === "tiffin"
    );
    assert.equal(tiffin, undefined, "Tiffin should NOT appear on a non-school day");
  });

  it("No Quick Meal Before School on non-school day", () => {
    const qm = result.find((it) => /quick meal before school/i.test(it.activity));
    assert.equal(qm, undefined, "Quick Meal Before School should NOT appear on non-school day");
  });

  it("Drunch is anchored in 17:00–18:00 window", () => {
    const drunch = result.find((it) => /^drunch$/i.test(it.activity));
    assert.ok(drunch, "Drunch should be present on non-school day");
    const t = timeToMins(drunch!.time);
    assert.ok(t >= 17 * 60 && t <= 18 * 60, `Drunch should be 17:00–18:00, got ${drunch!.time}`);
  });

  it("Dinner is anchored in 20:00–21:00 window", () => {
    const dinner = result.find((it) => /^dinner$/i.test(it.activity));
    assert.ok(dinner, "Dinner should be present on non-school day");
    const t = timeToMins(dinner!.time);
    assert.ok(t >= 20 * 60 && t <= 21 * 60, `Dinner should be 20:00–21:00, got ${dinner!.time}`);
  });

  it("No duplicate meal names on non-school day", () => {
    const mealBlocks = result.filter((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase())
    );
    const mealNames = mealBlocks.map((it) => (it.meal ?? it.activity).toLowerCase());
    const unique = new Set(mealNames);
    assert.equal(unique.size, mealNames.length, `Duplicates: ${mealNames.join(", ")}`);
  });

  it("Every meal block has recipe and nutrition on non-school day", () => {
    const mealBlocks = result.filter((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase())
    );
    for (const block of mealBlocks) {
      assert.ok(block.recipe !== undefined, `"${block.activity}" should have recipe`);
      assert.ok(block.nutrition !== undefined, `"${block.activity}" should have nutrition`);
    }
  });
});

// ─── generateRuleBasedRoutine integration tests ───────────────────────────────

describe("generateRuleBasedRoutine — school day end-to-end", () => {
  const params = {
    childName: "Aarav",
    ageGroup: "early_school" as const,
    totalAgeMonths: 96, // 8 years
    wakeUpTime: "7:00 AM",
    sleepTime: "9:30 PM",
    schoolStartTime: "9:00 AM",
    schoolEndTime: "3:00 PM",
    travelMode: "walk",
    hasSchool: true,
    mood: "normal",
    foodType: "veg",
    region: "pan_indian" as const,
    p1Free: false,
    p2Free: false,
    bothBusy: true,
    date: "2026-04-23",
  };

  const { items } = generateRuleBasedRoutine(params);

  it("Quick Meal Before School present at schoolStart - 15", () => {
    const qm = items.find((it) => /quick meal before school/i.test(it.activity));
    assert.ok(qm, "Quick Meal Before School expected");
    const schoolStartMins = timeToMins("9:00 AM");
    assert.equal(timeToMins(qm!.time), schoolStartMins - 15);
  });

  it("Tiffin block present on school day", () => {
    const tiffin = items.find((it) =>
      /^tiffin$/i.test(it.activity) && (it.category ?? "").toLowerCase() === "tiffin"
    );
    assert.ok(tiffin, "Tiffin should be in generated routine");
  });

  it("Lunch is 30 min after school end (3:30 PM)", () => {
    const lunch = items.find((it) => /^lunch$/i.test(it.activity));
    assert.ok(lunch, "Lunch expected");
    const schoolEndMins = timeToMins("3:00 PM");
    assert.equal(timeToMins(lunch!.time), schoolEndMins + 30);
  });

  it("Drunch present and in 17–18 window", () => {
    const drunch = items.find((it) => /^drunch$/i.test(it.activity));
    assert.ok(drunch, "Drunch expected");
    const t = timeToMins(drunch!.time);
    assert.ok(t >= 17 * 60 && t <= 18 * 60, `Drunch should be 17–18, got ${drunch!.time}`);
  });

  it("Dinner in 20–21 window", () => {
    const dinner = items.find((it) => /^dinner$/i.test(it.activity));
    assert.ok(dinner, "Dinner expected");
    const t = timeToMins(dinner!.time);
    assert.ok(t >= 20 * 60 && t <= 21 * 60, `Dinner should be 20–21, got ${dinner!.time}`);
  });

  it("No duplicate meal names across the full day", () => {
    const mealBlocks = items.filter((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase())
    );
    const mealNames = mealBlocks.map((it) => (it.meal ?? it.activity).toLowerCase());
    const unique = new Set(mealNames);
    assert.equal(unique.size, mealNames.length, `Duplicates: ${JSON.stringify(mealNames)}`);
  });

  it("All meal/tiffin blocks carry recipe and nutrition", () => {
    const mealBlocks = items.filter((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase())
    );
    for (const block of mealBlocks) {
      assert.ok(block.recipe, `"${block.activity}" missing recipe`);
      assert.ok(block.nutrition, `"${block.activity}" missing nutrition`);
    }
  });

  it("Every item has rewardPoints set", () => {
    for (const item of items) {
      assert.ok(
        typeof item.rewardPoints === "number",
        `"${item.activity}" should have rewardPoints`
      );
    }
  });
});

describe("generateRuleBasedRoutine — non-school day end-to-end", () => {
  const params = {
    childName: "Priya",
    ageGroup: "early_school" as const,
    totalAgeMonths: 84, // 7 years
    wakeUpTime: "7:30 AM",
    sleepTime: "9:00 PM",
    schoolStartTime: "9:00 AM",
    schoolEndTime: "3:00 PM",
    travelMode: "car",
    hasSchool: false,
    mood: "normal",
    foodType: "veg",
    region: "pan_indian" as const,
    p1Free: true,
    p2Free: false,
    bothBusy: false,
    date: "2026-04-26", // Sunday
  };

  const { items } = generateRuleBasedRoutine(params);

  it("Breakfast is in 8–9 AM window", () => {
    const bf = items.find((it) => /^breakfast$/i.test(it.activity));
    assert.ok(bf, "Breakfast expected on non-school day");
    const t = timeToMins(bf!.time);
    assert.ok(t >= 8 * 60 && t <= 9 * 60, `Breakfast should be 8–9 AM, got ${bf!.time}`);
  });

  it("No Tiffin block on non-school day", () => {
    const tiffin = items.find((it) =>
      /^tiffin$/i.test(it.activity) && (it.category ?? "").toLowerCase() === "tiffin"
    );
    assert.equal(tiffin, undefined, "Tiffin should NOT be in non-school routine");
  });

  it("No Quick Meal Before School on non-school day", () => {
    const qm = items.find((it) => /quick meal before school/i.test(it.activity));
    assert.equal(qm, undefined, "Quick Meal Before School should NOT appear on non-school day");
  });

  it("Drunch in 17–18 window on weekend", () => {
    const drunch = items.find((it) => /^drunch$/i.test(it.activity));
    assert.ok(drunch, "Drunch expected on non-school day");
    const t = timeToMins(drunch!.time);
    assert.ok(t >= 17 * 60 && t <= 18 * 60, `Drunch should be 17–18, got ${drunch!.time}`);
  });

  it("No duplicate meal names on non-school day", () => {
    const mealBlocks = items.filter((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase())
    );
    const mealNames = mealBlocks.map((it) => (it.meal ?? it.activity).toLowerCase());
    const unique = new Set(mealNames);
    assert.equal(unique.size, mealNames.length, `Duplicates: ${JSON.stringify(mealNames)}`);
  });

  it("All meal blocks carry recipe and nutrition on non-school day", () => {
    const mealBlocks = items.filter((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase())
    );
    for (const block of mealBlocks) {
      assert.ok(block.recipe, `"${block.activity}" missing recipe`);
      assert.ok(block.nutrition, `"${block.activity}" missing nutrition`);
    }
  });
});

// ─── preschool school day ─────────────────────────────────────────────────────

describe("generateRuleBasedRoutine — preschool school day", () => {
  const params = {
    childName: "Riya",
    ageGroup: "preschool" as const,
    totalAgeMonths: 54,
    wakeUpTime: "7:00 AM",
    sleepTime: "8:30 PM",
    schoolStartTime: "9:00 AM",
    schoolEndTime: "12:00 PM",
    travelMode: "walk",
    hasSchool: true,
    mood: "happy",
    foodType: "veg",
    region: "south_indian" as const,
    p1Free: true,
    p2Free: false,
    bothBusy: false,
    date: "2026-04-21",
  };

  const { items } = generateRuleBasedRoutine(params);

  it("Quick Meal Before School present for preschool", () => {
    const qm = items.find((it) => /quick meal before school/i.test(it.activity));
    assert.ok(qm, "Quick Meal Before School expected for preschool on school day");
  });

  it("Tiffin present for preschool on school day", () => {
    const tiffin = items.find((it) =>
      /^tiffin$/i.test(it.activity) && (it.category ?? "").toLowerCase() === "tiffin"
    );
    assert.ok(tiffin, "Tiffin should be present for preschool school day");
  });

  it("No duplicate meal names for preschool", () => {
    const mealBlocks = items.filter((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase())
    );
    const mealNames = mealBlocks.map((it) => (it.meal ?? it.activity).toLowerCase());
    const unique = new Set(mealNames);
    assert.equal(unique.size, mealNames.length, `Duplicates: ${JSON.stringify(mealNames)}`);
  });

  it("All meal blocks carry recipe + nutrition for preschool", () => {
    const mealBlocks = items.filter((it) =>
      ["meal", "tiffin"].includes((it.category ?? "").toLowerCase())
    );
    for (const block of mealBlocks) {
      assert.ok(block.recipe, `"${block.activity}" missing recipe`);
      assert.ok(block.nutrition, `"${block.activity}" missing nutrition`);
    }
  });
});
