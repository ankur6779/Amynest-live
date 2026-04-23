/**
 * AI routine pipeline regression tests.
 *
 * Each test calls the REAL `generateAiRoutine` exported from `routines.ts`
 * (the identical function the production route uses) with an injected mock
 * OpenAI client that returns a controlled JSON payload.
 *
 * Coverage:
 *   1. Title is preserved from the AI response.
 *   2. Items have the required fields (time, activity, duration, category).
 *   3. School-day: overlapping items replaced by a single school block.
 *   4. School-day: tiffin items inside the school window are preserved.
 *   5. Non-school-day: spurious "school" category items are stripped.
 *   6. Re-anchor: first non-sleep item starts at wakeUpTime.
 *   7. Sleep anchor lands exactly at the configured sleepTime.
 *   8. Malformed / fewer-than-5 items raise an error.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateAiRoutine } from "./routines.js";

// ─── Mock-client factory ───────────────────────────────────────────────────
function makeMockOpenai(responseJson: object) {
  return {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: JSON.stringify(responseJson) } }],
        }),
      },
    },
  };
}

// ─── Shared base params ────────────────────────────────────────────────────
const BASE = {
  childName: "Arjun",
  age: 8,
  ageGroup: "early_school" as const,
  wakeUpTime: "07:00",
  sleepTime: "21:00",
  schoolStartTime: "09:00",
  schoolEndTime: "15:00",
  foodType: "veg",
  mood: "happy",
  date: "2026-04-23",
  parentAvailSummary: "Parent available in the morning.",
};

// ─── Fixture helpers ───────────────────────────────────────────────────────

/**
 * AI school-day fixture.
 * Items start at the times reAnchorToWakeTime would assign them (wake=07:00):
 *   pre-school totals 120 min → school cascades to 09:00 (exactly schoolStartTime).
 *   The 360-min school block pushes post-school items to 15:00+, so enforceSchoolBlock
 *   does NOT remove them.  applyRoutineV2 then re-anchors Lunch → 15:30 and Dinner → 20:00.
 */
function schoolDayAiItems() {
  return [
    { time: "07:00", activity: "Wake up & Freshen Up", duration: 30, category: "hygiene" },
    { time: "07:30", activity: "Breakfast — Poha", duration: 30, category: "meal" },
    { time: "08:00", activity: "Getting Ready for School", duration: 60, category: "hygiene" },
    // enforceSchoolBlock will remove this and insert a canonical school block at 09:00
    { time: "09:00", activity: "At school", duration: 360, category: "school" },
    // cascade: 420 (wake) + 30 + 30 + 60 + 360 = 900 = 15:00 → post-school items survive
    { time: "15:00", activity: "After-school Snack", duration: 15, category: "meal" },
    { time: "15:15", activity: "Homework & Study", duration: 60, category: "study" },
    { time: "16:15", activity: "Outdoor Play", duration: 60, category: "play" },
    { time: "17:15", activity: "Lunch", duration: 30, category: "meal" },
    { time: "17:45", activity: "Board Game Night", duration: 60, category: "play" },
    { time: "18:45", activity: "Dinner", duration: 45, category: "meal" },
    { time: "20:00", activity: "Story Time", duration: 30, category: "study" },
    { time: "21:00", activity: "Bedtime", duration: 30, category: "sleep" },
  ];
}

/**
 * AI non-school-day fixture.
 * Contains a spurious "school" category slot (must be stripped) plus canonical
 * meal names that applyRoutineV2 can re-anchor: "Breakfast" → 08:00–09:00,
 * "Drunch" → 17:00–18:00, "Dinner" → 20:00–21:00.
 */
function nonSchoolItems() {
  return [
    { time: "07:00", activity: "Wake up", duration: 20, category: "hygiene" },
    { time: "07:20", activity: "Breakfast", duration: 30, category: "meal" },
    // spurious school slot — must be stripped on non-school day
    { time: "09:00", activity: "At school", duration: 60, category: "school" },
    { time: "10:00", activity: "Outdoor Play", duration: 60, category: "play" },
    { time: "11:00", activity: "Creative Art", duration: 45, category: "play" },
    { time: "11:45", activity: "Lunch", duration: 30, category: "meal" },
    { time: "12:15", activity: "Board Game Night", duration: 60, category: "play" },
    { time: "13:15", activity: "Drunch", duration: 25, category: "meal" },
    { time: "13:40", activity: "Reading for Pleasure", duration: 30, category: "study" },
    { time: "14:10", activity: "Dinner", duration: 30, category: "meal" },
    { time: "14:40", activity: "Story Time", duration: 30, category: "study" },
    { time: "21:00", activity: "Bedtime", duration: 30, category: "sleep" },
  ];
}

/** School day where AI also includes a tiffin slot inside the school window. */
function schoolDayWithTiffinItems() {
  return [
    { time: "07:00", activity: "Wake up", duration: 30, category: "hygiene" },
    { time: "07:30", activity: "Breakfast", duration: 30, category: "meal" },
    { time: "08:00", activity: "Getting Ready", duration: 60, category: "hygiene" },
    // tiffin inside school window — must be PRESERVED (tiffin exception)
    { time: "11:00", activity: "Tiffin Time", duration: 20, category: "tiffin" },
    // plain play inside school window — must be removed
    { time: "11:20", activity: "Play Break", duration: 20, category: "play" },
    { time: "15:00", activity: "After-school Snack", duration: 15, category: "meal" },
    { time: "15:15", activity: "Homework", duration: 60, category: "study" },
    { time: "16:15", activity: "Outdoor Play", duration: 60, category: "play" },
    { time: "17:15", activity: "Dinner", duration: 45, category: "meal" },
    { time: "20:00", activity: "Story Time", duration: 30, category: "study" },
    { time: "21:00", activity: "Bedtime", duration: 30, category: "sleep" },
  ];
}

// ─── Utilities ─────────────────────────────────────────────────────────────
// Parses both 24h ("09:00") and 12h ("9:00 AM") formats to minutes since midnight.
function toMins(time: string): number {
  const m12 = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1]!);
    const m = parseInt(m12[2]!);
    const ampm = m12[3]!.toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

// ─── Suites ────────────────────────────────────────────────────────────────

describe("generateAiRoutine — title and structure", () => {
  it("preserves the AI-generated title verbatim", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: false,
      openaiClient: makeMockOpenai({ title: "Arjun's Fun Saturday", items: nonSchoolItems() }),
    });
    assert.equal(result.title, "Arjun's Fun Saturday");
  });

  it("returns items each with time, activity, duration, and category", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: false,
      openaiClient: makeMockOpenai({ title: "Weekend Routine", items: nonSchoolItems() }),
    });
    assert.ok(result.items.length > 0);
    for (const item of result.items) {
      assert.equal(typeof item.time, "string");
      assert.equal(typeof item.activity, "string");
      assert.equal(typeof item.duration, "number");
      assert.equal(typeof item.category, "string");
    }
  });

  it("throws when the AI returns fewer than 5 items", async () => {
    await assert.rejects(
      () =>
        generateAiRoutine({
          ...BASE,
          hasSchool: false,
          openaiClient: makeMockOpenai({
            title: "Short",
            items: [
              { time: "07:00", activity: "Wake", duration: 30, category: "hygiene" },
              { time: "07:30", activity: "Breakfast", duration: 30, category: "meal" },
            ],
          }),
        }),
      /Invalid AI response structure/,
    );
  });

  it("throws when the AI response has no items array", async () => {
    await assert.rejects(
      () =>
        generateAiRoutine({
          ...BASE,
          hasSchool: false,
          openaiClient: makeMockOpenai({ title: "Bad Response", schedule: [] }),
        }),
      /Invalid AI response structure/,
    );
  });
});

describe("generateAiRoutine — school-day enforcement", () => {
  it("inserts exactly one school-category item", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: true,
      openaiClient: makeMockOpenai({ title: "School Day", items: schoolDayAiItems() }),
    });
    const schoolItems = result.items.filter((i) => i.category === "school");
    assert.equal(schoolItems.length, 1);
  });

  it("school block starts at schoolStartTime (09:00 = 540 mins)", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: true,
      openaiClient: makeMockOpenai({ title: "School Day", items: schoolDayAiItems() }),
    });
    const schoolItem = result.items.find((i) => i.category === "school");
    assert.ok(schoolItem !== undefined);
    assert.equal(toMins(schoolItem.time), 9 * 60, `Expected school at 540 mins, got "${schoolItem.time}"`);
  });

  it("school block duration equals the full school window in minutes", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: true,
      openaiClient: makeMockOpenai({ title: "School Day", items: schoolDayAiItems() }),
    });
    const schoolItem = result.items.find((i) => i.category === "school");
    assert.ok(schoolItem !== undefined);
    assert.equal(schoolItem.duration, 360); // 09:00–15:00 = 6 h = 360 min
  });

  it("no non-tiffin item overlaps the school window", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: true,
      openaiClient: makeMockOpenai({ title: "School Day", items: schoolDayAiItems() }),
    });
    const schoolStartMins = toMins("09:00");
    const schoolEndMins = toMins("15:00");
    for (const item of result.items) {
      if (item.category === "school" || item.category === "tiffin") continue;
      const start = toMins(item.time);
      const end = start + item.duration;
      const overlaps = start < schoolEndMins && end > schoolStartMins;
      assert.equal(overlaps, false, `Item "${item.activity}" at ${item.time} overlaps school window`);
    }
  });

  it("school block activity label includes childClass when provided", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: true,
      childClass: "Class 3",
      openaiClient: makeMockOpenai({ title: "School Day", items: schoolDayAiItems() }),
    });
    const schoolItem = result.items.find((i) => i.category === "school");
    assert.ok(schoolItem !== undefined);
    assert.ok(schoolItem.activity.includes("Class 3"), `Expected activity to include "Class 3", got "${schoolItem.activity}"`);
  });

  it("items list is time-sorted (ascending) after enforcement", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: true,
      openaiClient: makeMockOpenai({ title: "School Day", items: schoolDayAiItems() }),
    });
    const times = result.items.map((i) => toMins(i.time));
    for (let idx = 1; idx < times.length; idx++) {
      assert.ok(
        times[idx]! >= times[idx - 1]!,
        `Items not sorted: ${result.items[idx - 1]!.time} > ${result.items[idx]!.time}`,
      );
    }
  });
});

describe("generateAiRoutine — non-school-day cleanup", () => {
  it("strips all school-category items on a non-school day", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: false,
      openaiClient: makeMockOpenai({ title: "Weekend", items: nonSchoolItems() }),
    });
    const schoolItems = result.items.filter((i) => i.category === "school");
    assert.equal(schoolItems.length, 0);
  });

  it("retains play and study items on a non-school day", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: false,
      openaiClient: makeMockOpenai({ title: "Weekend", items: nonSchoolItems() }),
    });
    const playStudy = result.items.filter(
      (i) => i.category === "play" || i.category === "study",
    );
    assert.ok(playStudy.length > 0);
  });
});

describe("generateAiRoutine — tiffin exception", () => {
  it("keeps tiffin items inside the school window", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: true,
      openaiClient: makeMockOpenai({ title: "Tiffin School Day", items: schoolDayWithTiffinItems() }),
    });
    const tiffinItems = result.items.filter((i) => i.category === "tiffin");
    assert.ok(tiffinItems.length > 0);
  });

  it("still removes non-tiffin items that overlap the school window", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: true,
      openaiClient: makeMockOpenai({ title: "Tiffin School Day", items: schoolDayWithTiffinItems() }),
    });
    const schoolStart = toMins("09:00");
    const schoolEnd = toMins("15:00");
    for (const item of result.items) {
      if (item.category === "school" || item.category === "tiffin") continue;
      const s = toMins(item.time);
      const e = s + item.duration;
      const overlaps = s < schoolEnd && e > schoolStart;
      assert.equal(overlaps, false, `Item "${item.activity}" at ${item.time} overlaps school window`);
    }
  });
});

describe("generateAiRoutine — re-anchor to wakeUpTime", () => {
  it("first non-sleep item starts at wakeUpTime (07:00 = 420 mins)", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: false,
      wakeUpTime: "07:00",
      openaiClient: makeMockOpenai({ title: "Re-anchor Test", items: nonSchoolItems() }),
    });
    const firstItem = result.items.find(
      (i) => i.category !== "sleep" && !/bedtime/i.test(i.activity),
    );
    assert.ok(firstItem !== undefined);
    assert.equal(toMins(firstItem.time), 7 * 60, `Expected first item at 420 mins, got "${firstItem.time}"`);
  });

  it("sleep item is anchored to the configured sleepTime (21:00 = 1260 mins)", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: false,
      sleepTime: "21:00",
      openaiClient: makeMockOpenai({ title: "Sleep Anchor Test", items: nonSchoolItems() }),
    });
    const sleepItem = result.items.find(
      (i) => i.category === "sleep" || /bedtime/i.test(i.activity),
    );
    assert.ok(sleepItem !== undefined);
    assert.equal(toMins(sleepItem.time), 21 * 60, `Expected sleep at 1260 mins, got "${sleepItem.time}"`);
  });
});

// ─── Meal-slot anchoring: school day ──────────────────────────────────────
// These assertions mirror the existing applyRoutineV2 tests in routine-templates.test.ts
// but run through the full generateAiRoutine path (AI parse → re-anchor → enforceSchoolBlock
// → applyRoutineV2), catching regressions end-to-end.
describe("generateAiRoutine — meal-slot anchoring (school day)", () => {
  const SCHOOL_START_MINS = 9 * 60;  // 09:00
  const SCHOOL_END_MINS   = 15 * 60; // 15:00

  async function schoolDayResult() {
    return generateAiRoutine({
      ...BASE,
      hasSchool: true,
      openaiClient: makeMockOpenai({ title: "School Day Meals", items: schoolDayAiItems() }),
    });
  }

  it("Quick Meal Before School is present at schoolStart - 15 min (08:45 = 525 mins)", async () => {
    const result = await schoolDayResult();
    const qm = result.items.find((i) => /quick meal before school/i.test(i.activity));
    assert.ok(qm !== undefined, "Quick Meal Before School should be present");
    assert.equal(
      toMins(qm.time),
      SCHOOL_START_MINS - 15,
      `Quick Meal should be at ${SCHOOL_START_MINS - 15} mins, got "${qm.time}"`,
    );
    assert.equal(qm.duration, 15, "Quick Meal duration should be 15 min");
  });

  it("Tiffin block is present on school day", async () => {
    const result = await schoolDayResult();
    const tiffin = result.items.find(
      (i) => /^tiffin$/i.test(i.activity) && i.category?.toLowerCase() === "tiffin",
    );
    assert.ok(tiffin !== undefined, "Tiffin block should be present on a school day");
  });

  it("Tiffin is anchored inside the school window (schoolStart + 60 min = 10:00)", async () => {
    const result = await schoolDayResult();
    const tiffin = result.items.find((i) => /^tiffin$/i.test(i.activity));
    assert.ok(tiffin !== undefined);
    assert.equal(
      toMins(tiffin.time),
      SCHOOL_START_MINS + 60,
      `Tiffin should be at ${SCHOOL_START_MINS + 60} mins, got "${tiffin.time}"`,
    );
  });

  it("Lunch is anchored 30 min after school end (15:30 = 930 mins)", async () => {
    const result = await schoolDayResult();
    const lunch = result.items.find((i) => /^lunch$/i.test(i.activity));
    assert.ok(lunch !== undefined, "Lunch block should be present");
    assert.equal(
      toMins(lunch.time),
      SCHOOL_END_MINS + 30,
      `Lunch should be at ${SCHOOL_END_MINS + 30} mins, got "${lunch.time}"`,
    );
  });

  it("Drunch is anchored in the 17:00–18:00 window", async () => {
    const result = await schoolDayResult();
    const drunch = result.items.find((i) => /^drunch$/i.test(i.activity));
    assert.ok(drunch !== undefined, "Drunch block should be present");
    const t = toMins(drunch.time);
    assert.ok(t >= 17 * 60 && t <= 18 * 60, `Drunch should be 17:00–18:00, got "${drunch.time}"`);
  });

  it("Dinner is anchored in the 20:00–21:00 window", async () => {
    const result = await schoolDayResult();
    const dinner = result.items.find((i) => /^dinner$/i.test(i.activity));
    assert.ok(dinner !== undefined, "Dinner block should be present");
    const t = toMins(dinner.time);
    assert.ok(t >= 20 * 60 && t <= 21 * 60, `Dinner should be 20:00–21:00, got "${dinner.time}"`);
  });

  it("No duplicate meal names across the school day", async () => {
    const result = await schoolDayResult();
    const mealBlocks = result.items.filter((i) =>
      ["meal", "tiffin"].includes((i.category ?? "").toLowerCase()),
    );
    const mealNames = mealBlocks.map((i) => (i.meal ?? i.activity).toLowerCase());
    const unique = new Set(mealNames);
    assert.equal(unique.size, mealNames.length, `Duplicate meal names: ${mealNames.join(", ")}`);
  });

  it("Every meal/tiffin block has recipe and nutrition attached", async () => {
    const result = await schoolDayResult();
    const mealBlocks = result.items.filter((i) =>
      ["meal", "tiffin"].includes((i.category ?? "").toLowerCase()),
    );
    assert.ok(mealBlocks.length > 0, "There should be at least one meal/tiffin block");
    for (const block of mealBlocks) {
      assert.ok(
        block.recipe !== undefined && block.recipe !== null,
        `"${block.activity}" at ${block.time} should have a recipe`,
      );
      assert.ok(
        block.nutrition !== undefined && block.nutrition !== null,
        `"${block.activity}" at ${block.time} should have nutrition`,
      );
    }
  });

  it("Recipe has required fields: prepTime, cookTime, servings, ingredients, steps", async () => {
    const result = await schoolDayResult();
    const firstMeal = result.items.find(
      (i) => ["meal", "tiffin"].includes((i.category ?? "").toLowerCase()) && i.recipe,
    );
    assert.ok(firstMeal?.recipe, "At least one meal should have a recipe");
    const r = firstMeal!.recipe!;
    assert.ok(r.prepTime, "recipe.prepTime should be set");
    assert.ok(r.cookTime, "recipe.cookTime should be set");
    assert.ok(r.servings, "recipe.servings should be set");
    assert.ok(Array.isArray(r.ingredients) && r.ingredients.length > 0, "recipe.ingredients should be non-empty");
    assert.ok(Array.isArray(r.steps) && r.steps.length > 0, "recipe.steps should be non-empty");
  });

  it("Nutrition has required fields: calories, protein, carbs, fat", async () => {
    const result = await schoolDayResult();
    const firstMeal = result.items.find(
      (i) => ["meal", "tiffin"].includes((i.category ?? "").toLowerCase()) && i.nutrition,
    );
    assert.ok(firstMeal?.nutrition, "At least one meal should have nutrition");
    const n = firstMeal!.nutrition!;
    assert.ok(n.calories, "nutrition.calories should be set");
    assert.ok(n.protein, "nutrition.protein should be set");
    assert.ok(n.carbs, "nutrition.carbs should be set");
    assert.ok(n.fat, "nutrition.fat should be set");
  });
});

// ─── Meal-slot anchoring: non-school day ──────────────────────────────────
describe("generateAiRoutine — meal-slot anchoring (non-school day)", () => {
  async function nonSchoolDayResult() {
    return generateAiRoutine({
      ...BASE,
      hasSchool: false,
      openaiClient: makeMockOpenai({ title: "Weekend Meals", items: nonSchoolItems() }),
    });
  }

  it("Breakfast is anchored in the 08:00–09:00 window", async () => {
    const result = await nonSchoolDayResult();
    const breakfast = result.items.find((i) => /^breakfast$/i.test(i.activity));
    assert.ok(breakfast !== undefined, "Breakfast should be present on non-school day");
    const t = toMins(breakfast.time);
    assert.ok(t >= 8 * 60 && t <= 9 * 60, `Breakfast should be 08:00–09:00, got "${breakfast.time}"`);
  });

  it("No Tiffin block on non-school day", async () => {
    const result = await nonSchoolDayResult();
    const tiffin = result.items.find(
      (i) => /^tiffin$/i.test(i.activity) && i.category?.toLowerCase() === "tiffin",
    );
    assert.equal(tiffin, undefined, "Tiffin should not appear on a non-school day");
  });

  it("No Quick Meal Before School on non-school day", async () => {
    const result = await nonSchoolDayResult();
    const qm = result.items.find((i) => /quick meal before school/i.test(i.activity));
    assert.equal(qm, undefined, "Quick Meal Before School should not appear on a non-school day");
  });

  it("Drunch is anchored in the 17:00–18:00 window", async () => {
    const result = await nonSchoolDayResult();
    const drunch = result.items.find((i) => /^drunch$/i.test(i.activity));
    assert.ok(drunch !== undefined, "Drunch block should be present");
    const t = toMins(drunch.time);
    assert.ok(t >= 17 * 60 && t <= 18 * 60, `Drunch should be 17:00–18:00, got "${drunch.time}"`);
  });

  it("Dinner is anchored in the 20:00–21:00 window", async () => {
    const result = await nonSchoolDayResult();
    const dinner = result.items.find((i) => /^dinner$/i.test(i.activity));
    assert.ok(dinner !== undefined, "Dinner block should be present");
    const t = toMins(dinner.time);
    assert.ok(t >= 20 * 60 && t <= 21 * 60, `Dinner should be 20:00–21:00, got "${dinner.time}"`);
  });

  it("No duplicate meal names across the non-school day", async () => {
    const result = await nonSchoolDayResult();
    const mealBlocks = result.items.filter((i) =>
      ["meal", "tiffin"].includes((i.category ?? "").toLowerCase()),
    );
    const mealNames = mealBlocks.map((i) => (i.meal ?? i.activity).toLowerCase());
    const unique = new Set(mealNames);
    assert.equal(unique.size, mealNames.length, `Duplicate meal names: ${mealNames.join(", ")}`);
  });

  it("Every meal block has recipe and nutrition attached", async () => {
    const result = await nonSchoolDayResult();
    const mealBlocks = result.items.filter((i) =>
      ["meal", "tiffin"].includes((i.category ?? "").toLowerCase()),
    );
    assert.ok(mealBlocks.length > 0, "There should be at least one meal block");
    for (const block of mealBlocks) {
      assert.ok(
        block.recipe !== undefined && block.recipe !== null,
        `"${block.activity}" at ${block.time} should have a recipe`,
      );
      assert.ok(
        block.nutrition !== undefined && block.nutrition !== null,
        `"${block.activity}" at ${block.time} should have nutrition`,
      );
    }
  });
});
