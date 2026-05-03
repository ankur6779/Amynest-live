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
import { REGION_LABELS, type Region } from "../lib/routine-templates.js";

// ─── Mock-client factory ───────────────────────────────────────────────────
function makeMockOpenai(responseJson: object) {
  const calls: Array<{ messages: Array<{ role: string; content: string }> }> = [];
  const client = {
    chat: {
      completions: {
        create: async (p: { messages: Array<{ role: string; content: string }> }) => {
          calls.push({ messages: p.messages });
          return { choices: [{ message: { content: JSON.stringify(responseJson) } }] };
        },
      },
    },
  };
  return Object.assign(client, { _calls: calls });
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
  caregiver: "mom" as const,
  weatherOutdoor: "yes" as const,
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

/**
 * Non-school-day fixture where the AI uses descriptive meal names instead of
 * the bare canonical labels — e.g. "Family Dinner", "Light Breakfast",
 * "Family Lunch". The anchor regexes must still match these and re-anchor
 * meals into the correct windows; otherwise the AI's bad times survive
 * (this was the bug behind "Dinner showing at 5 PM").
 */
function nonSchoolDescriptiveMealItems() {
  return [
    { time: "07:00", activity: "Wake up", duration: 20, category: "hygiene" },
    { time: "07:20", activity: "Light Breakfast", duration: 30, category: "meal" },
    { time: "10:00", activity: "Outdoor Play", duration: 60, category: "play" },
    { time: "11:00", activity: "Creative Art", duration: 45, category: "play" },
    { time: "11:45", activity: "Family Lunch", duration: 30, category: "meal" },
    { time: "12:15", activity: "Board Game Night", duration: 60, category: "play" },
    { time: "13:15", activity: "Afternoon Snack", duration: 25, category: "meal" },
    { time: "13:40", activity: "Reading for Pleasure", duration: 30, category: "study" },
    { time: "17:00", activity: "Family Dinner", duration: 30, category: "meal" },
    { time: "17:30", activity: "Story Time", duration: 30, category: "study" },
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

// ─── Meal-slot anchoring: descriptive AI labels ───────────────────────────
// Regression: the AI often returns "Family Dinner", "Light Breakfast",
// "Family Lunch" instead of the bare canonical names. The anchor regexes
// must still match (matched as a whole word) so meals land in their windows.
// Without this, dinner stayed at the AI's 17:00 slot — what the user reported
// as "dinner showing at 5 PM in the routine preview".
describe("generateAiRoutine — meal-slot anchoring (descriptive labels)", () => {
  async function descriptiveResult() {
    return generateAiRoutine({
      ...BASE,
      hasSchool: false,
      openaiClient: makeMockOpenai({
        title: "Weekend with Family Meals",
        items: nonSchoolDescriptiveMealItems(),
      }),
    });
  }

  it("re-anchors 'Family Dinner' (not just 'Dinner') into 20:00–21:00", async () => {
    const result = await descriptiveResult();
    const dinner = result.items.find((i) => /\bdinner\b/i.test(i.activity));
    assert.ok(dinner !== undefined, "A dinner block should be present");
    const t = toMins(dinner.time);
    assert.ok(
      t >= 20 * 60 && t <= 21 * 60,
      `'${dinner.activity}' should be anchored 20:00–21:00, got "${dinner.time}"`,
    );
  });

  it("re-anchors 'Light Breakfast' into 08:00–09:00", async () => {
    const result = await descriptiveResult();
    const bf = result.items.find((i) => /\bbreakfast\b/i.test(i.activity));
    assert.ok(bf !== undefined, "A breakfast block should be present");
    const t = toMins(bf.time);
    assert.ok(
      t >= 8 * 60 && t <= 9 * 60,
      `'${bf.activity}' should be anchored 08:00–09:00, got "${bf.time}"`,
    );
  });

  it("re-anchors 'Family Lunch' into 13:30–14:30", async () => {
    const result = await descriptiveResult();
    const lunch = result.items.find((i) => /\blunch\b/i.test(i.activity));
    assert.ok(lunch !== undefined, "A lunch block should be present");
    const t = toMins(lunch.time);
    assert.ok(
      t >= 13 * 60 + 30 && t <= 14 * 60 + 30,
      `'${lunch.activity}' should be anchored 13:30–14:30, got "${lunch.time}"`,
    );
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

// ─── Parameterised across cuisine regions ─────────────────────────────────
// As new regional cuisine options are added (e.g. gujarati, maharashtrian,
// bengali) the recipe and nutrition lookups in applyRoutineV2 must continue
// to attach a non-null, fully-populated recipe + nutrition object to every
// meal/tiffin block — even when the meal name is a region-specific dish
// (e.g. "Macher jhol", "Thepla", "Pongal") that has never been keyword-mapped
// in meal-recipes.ts.
//
// We loop over every Region exported from routine-templates.ts so that
// adding a new entry to REGION_LABELS automatically extends test coverage
// without anyone having to remember to update this file. New regions that
// don't yet have a REGIONAL_NOTES entry fall back to the pan_indian notes —
// the suite still runs (covering the AI pipeline + recipe/nutrition contract
// for the new region) and contributors can add region-specific dishes later.
//
// For each region we run the full AI pipeline twice:
//   - school day:    Breakfast → Quick Meal Before School, Tiffin, Lunch,
//                    Drunch (via After-school Snack), Dinner.
//   - non-school day: Breakfast, Lunch, Drunch, Dinner.
// Meal-block `notes` are seeded with realistic regional dishes so that
// dedupMealNotes picks a regional name as the meal "primary" and the
// recipe/nutrition matchers in meal-recipes.ts are exercised against them.

type RegionalNoteSet = {
  breakfast: string;
  lunch: string;
  dinner: string;
  drunch: string;
  tiffin: string;
};

// Pan-Indian default — also serves as the fallback for any region that
// doesn't have a region-specific entry below (e.g. a brand-new region just
// added to REGION_LABELS but not yet seeded here).
const DEFAULT_REGIONAL_NOTES: RegionalNoteSet = {
  breakfast: "Options: Poha with peanuts | Idli with sambar | Paratha with curd",
  lunch:     "Options: Dal rice with sabzi | Rajma chawal | Chole rice",
  dinner:    "Options: Roti with dal and sabzi | Khichdi with ghee | Vegetable soup with bread",
  drunch:    "Options: Cheese sandwich + milk | Idli + chutney | Fruit chaat + nuts",
  tiffin:    "Options: Veg sandwich | Aloo paratha roll + curd | Idli + chutney",
};

// Partial map: regions present here exercise region-specific dish names;
// regions absent here still get tested using DEFAULT_REGIONAL_NOTES so that
// adding a new region to REGION_LABELS never breaks the build.
const REGIONAL_NOTES: Partial<Record<Region, RegionalNoteSet>> = {
  pan_indian: DEFAULT_REGIONAL_NOTES,
  north_indian: {
    breakfast: "Options: Aloo paratha with curd | Chole bhature | Bedmi puri with aloo sabzi",
    lunch:     "Options: Rajma chawal with onion salad | Dal makhani with naan | Chole rice with raita",
    dinner:    "Options: Roti with dal makhani | Khichdi with ghee | Mix veg with chapati",
    drunch:    "Options: Samosa with chutney | Aloo tikki | Bread pakora",
    tiffin:    "Options: Aloo paratha + pickle | Paneer paratha + curd | Chole rice box",
  },
  south_indian: {
    breakfast: "Options: Idli with sambar and coconut chutney | Masala dosa | Pongal with chutney",
    lunch:     "Options: Sambar rice with papad | Bisi bele bath | Curd rice with pickle",
    dinner:    "Options: Rava dosa with chutney | Curd rice with pickle | Idiyappam with kurma",
    drunch:    "Options: Mini dosa with chutney | Murukku with milk | Banana with ragi malt",
    tiffin:    "Options: Lemon rice + papad | Pongal in box | Tomato rice + chips",
  },
  bengali: {
    breakfast: "Options: Luchi with aloor dom | Cholar dal with luchi | Suji halwa with poori",
    lunch:     "Options: Macher jhol with bhaat | Kosha mangsho with rice | Aloo posto with rice",
    dinner:    "Options: Khichuri with begun bhaja | Light luchi with sabzi | Bhaat with bhaja moong dal",
    drunch:    "Options: Singara with chai | Telebhaja with muri | Sandesh with milk",
    tiffin:    "Options: Luchi with aloor dom box | Vegetable cutlet with bread | Mishti pulao box",
  },
  gujarati: {
    breakfast: "Options: Thepla with curd and pickle | Khaman dhokla with chutney | Bajra rotla with milk",
    lunch:     "Options: Dal-bhaat with shaak | Undhiyu with poori | Khichdi with kadhi",
    dinner:    "Options: Bhakri with sabzi | Khichdi with ghee | Soft thepla with curd",
    drunch:    "Options: Dhokla bites | Handvo with chai | Fafda with chutney",
    tiffin:    "Options: Methi thepla with pickle | Dhokla box | Khandvi rolls",
  },
  maharashtrian: {
    breakfast: "Options: Poha with peanuts | Misal pav | Sabudana khichdi",
    lunch:     "Options: Varan-bhaat with ghee | Pithla bhakri | Masale bhaat",
    dinner:    "Options: Bhakri with pithla | Amti with rice | Khichdi with ghee",
    drunch:    "Options: Vada pav | Kanda bhaji with chutney | Chivda with chai",
    tiffin:    "Options: Thalipeeth with curd | Poha box | Sabudana vada wrap",
  },
  punjabi: {
    breakfast: "Options: Aloo paratha with butter | Chole bhature | Lassi with paratha",
    lunch:     "Options: Sarson da saag with makki roti | Rajma chawal | Dal makhani with naan",
    dinner:    "Options: Roti with dal makhani | Khichdi with ghee | Light kadhi with rice",
    drunch:    "Options: Pakora with chai | Samosa with chutney | Sweet lassi with dry fruits",
    tiffin:    "Options: Aloo paratha + pickle | Paneer paratha + curd | Rajma rice box",
  },
  global: {
    breakfast: "Options: Pancakes with syrup | Cheese omelette with toast | Cereal with milk",
    lunch:     "Options: Pasta in tomato sauce | Grilled chicken with veggies | Rice bowl with salad",
    dinner:    "Options: Vegetable soup with bread | Light pasta with greens | Grilled fish with salad",
    drunch:    "Options: Cheese sandwich with milk | Fruit smoothie | Yoghurt parfait with granola",
    tiffin:    "Options: Cheese sandwich box | Pasta salad cup | Wrap with veggies",
  },
};

/** School-day fixture for a given region — same time cascade as the original
 *  schoolDayAiItems, but with regional notes on each meal/tiffin block.   */
function regionalSchoolDayItems(region: Region): Array<{
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
}> {
  const r = REGIONAL_NOTES[region] ?? DEFAULT_REGIONAL_NOTES;
  return [
    { time: "07:00", activity: "Wake up & Freshen Up", duration: 30, category: "hygiene" },
    // "Breakfast" → school-day branch renames to "Quick Meal Before School"
    // and rewrites notes; that's expected. Notes here help the non-school
    // branch when this fixture is re-purposed (kept for symmetry).
    { time: "07:30", activity: "Breakfast", duration: 30, category: "meal", notes: r.breakfast },
    { time: "08:00", activity: "Getting Ready for School", duration: 60, category: "hygiene" },
    { time: "09:00", activity: "At school", duration: 360, category: "school" },
    // Tiffin (in-fixture) — anchorMealWindows preserves it inside the school window.
    { time: "11:00", activity: "Tiffin", duration: 15, category: "tiffin", notes: r.tiffin },
    // After-school Snack → upgraded to Drunch (notes preserved when starting "Options:")
    { time: "15:00", activity: "After-school Snack", duration: 15, category: "meal", notes: r.drunch },
    { time: "15:15", activity: "Homework & Study", duration: 60, category: "study" },
    { time: "16:15", activity: "Outdoor Play", duration: 60, category: "play" },
    // Lunch — re-anchored to schoolEnd + 30 = 15:30. Notes preserved.
    { time: "17:15", activity: "Lunch", duration: 30, category: "meal", notes: r.lunch },
    { time: "17:45", activity: "Board Game Night", duration: 60, category: "play" },
    // Dinner — re-anchored to 20:00–21:00. Notes preserved.
    { time: "18:45", activity: "Dinner", duration: 45, category: "meal", notes: r.dinner },
    { time: "20:00", activity: "Story Time", duration: 30, category: "study" },
    { time: "21:00", activity: "Bedtime", duration: 30, category: "sleep" },
  ];
}

/** Non-school-day fixture for a given region. */
function regionalNonSchoolItems(region: Region): Array<{
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
}> {
  const r = REGIONAL_NOTES[region] ?? DEFAULT_REGIONAL_NOTES;
  return [
    { time: "07:00", activity: "Wake up", duration: 20, category: "hygiene" },
    { time: "07:20", activity: "Breakfast", duration: 30, category: "meal", notes: r.breakfast },
    { time: "10:00", activity: "Outdoor Play", duration: 60, category: "play" },
    { time: "11:00", activity: "Creative Art", duration: 45, category: "play" },
    { time: "11:45", activity: "Lunch", duration: 30, category: "meal", notes: r.lunch },
    { time: "12:15", activity: "Board Game Night", duration: 60, category: "play" },
    { time: "13:15", activity: "Drunch", duration: 25, category: "meal", notes: r.drunch },
    { time: "13:40", activity: "Reading for Pleasure", duration: 30, category: "study" },
    { time: "14:10", activity: "Dinner", duration: 30, category: "meal", notes: r.dinner },
    { time: "14:40", activity: "Story Time", duration: 30, category: "study" },
    { time: "21:00", activity: "Bedtime", duration: 30, category: "sleep" },
  ];
}

/** Strict per-block check: recipe + nutrition non-null with all required
 *  fields populated. Failure messages always include the region label so a
 *  red test pinpoints the broken cuisine immediately. */
function assertMealMetadataIntact(
  region: Region,
  mode: "school" | "non-school",
  items: Array<{
    activity: string;
    time: string;
    category?: string;
    recipe?: { prepTime?: string; cookTime?: string; servings?: string; ingredients?: string[]; steps?: string[] } | null;
    nutrition?: { calories?: string; protein?: string; carbs?: string; fat?: string } | null;
  }>,
): void {
  const tag = `[${region}|${mode}]`;
  const mealBlocks = items.filter((i) =>
    ["meal", "tiffin"].includes((i.category ?? "").toLowerCase()),
  );
  assert.ok(mealBlocks.length > 0, `${tag} expected at least one meal/tiffin block`);

  for (const block of mealBlocks) {
    assert.ok(
      block.recipe !== undefined && block.recipe !== null,
      `${tag} "${block.activity}" at ${block.time} missing recipe`,
    );
    assert.ok(
      block.nutrition !== undefined && block.nutrition !== null,
      `${tag} "${block.activity}" at ${block.time} missing nutrition`,
    );
    const r = block.recipe!;
    assert.ok(r.prepTime, `${tag} "${block.activity}" recipe.prepTime missing`);
    assert.ok(r.cookTime, `${tag} "${block.activity}" recipe.cookTime missing`);
    assert.ok(r.servings, `${tag} "${block.activity}" recipe.servings missing`);
    assert.ok(
      Array.isArray(r.ingredients) && r.ingredients.length > 0,
      `${tag} "${block.activity}" recipe.ingredients empty`,
    );
    assert.ok(
      Array.isArray(r.steps) && r.steps.length > 0,
      `${tag} "${block.activity}" recipe.steps empty`,
    );
    const n = block.nutrition!;
    assert.ok(n.calories, `${tag} "${block.activity}" nutrition.calories missing`);
    assert.ok(n.protein, `${tag} "${block.activity}" nutrition.protein missing`);
    assert.ok(n.carbs, `${tag} "${block.activity}" nutrition.carbs missing`);
    assert.ok(n.fat, `${tag} "${block.activity}" nutrition.fat missing`);
  }
}

// Iterate over every region declared in REGION_LABELS so that adding a new
// region to routine-templates.ts automatically extends test coverage. Each
// region without a REGIONAL_NOTES entry would surface as a TypeScript error,
// nudging contributors to extend the fixture before merging.
for (const region of Object.keys(REGION_LABELS) as Region[]) {
  describe(`generateAiRoutine — region "${region}" pipeline`, () => {
    it("school day: every meal/tiffin block has populated recipe + nutrition", async () => {
      const result = await generateAiRoutine({
        ...BASE,
        hasSchool: true,
        region,
        openaiClient: makeMockOpenai({
          title: `${REGION_LABELS[region]} School Day`,
          items: regionalSchoolDayItems(region),
        }),
      });
      assertMealMetadataIntact(region, "school", result.items);
    });

    it("non-school day: every meal/tiffin block has populated recipe + nutrition", async () => {
      const result = await generateAiRoutine({
        ...BASE,
        hasSchool: false,
        region,
        openaiClient: makeMockOpenai({
          title: `${REGION_LABELS[region]} Weekend`,
          items: regionalNonSchoolItems(region),
        }),
      });
      assertMealMetadataIntact(region, "non-school", result.items);
    });

    it("school day: no duplicate meal names across the day", async () => {
      const result = await generateAiRoutine({
        ...BASE,
        hasSchool: true,
        region,
        openaiClient: makeMockOpenai({
          title: `${REGION_LABELS[region]} School Day`,
          items: regionalSchoolDayItems(region),
        }),
      });
      const mealBlocks = result.items.filter((i) =>
        ["meal", "tiffin"].includes((i.category ?? "").toLowerCase()),
      );
      const names = mealBlocks.map((i) => (i.meal ?? i.activity).toLowerCase());
      const unique = new Set(names);
      assert.equal(
        unique.size,
        names.length,
        `[${region}|school] duplicate meal names: ${names.join(", ")}`,
      );
    });
  });
}

// ─── Region-specific recipe content checks ────────────────────────────────
// The previous suite proves every meal block gets *some* recipe + nutrition.
// These tests go further and confirm that for at least one signature dish per
// region, the recipe returned is the REGION-SPECIFIC one (a unique ingredient
// or step the generic keyword fallback could never produce). Catches future
// regressions where someone removes REGIONAL_RECIPES / REGIONAL_NUTRITION
// entries or accidentally drops the `region` argument from recipeFor.

type SignatureCheck = {
  region: Region;
  /** Note string seeded into a Lunch (or Breakfast for snack-class dishes)
   *  so dedupMealNotes picks the signature dish as `primary`. */
  note: string;
  /** Slot to seed it into so the right block carries the dish.
   *  "lunch" | "breakfast" — both are present in regionalNonSchoolItems. */
  slot: "breakfast" | "lunch";
  /** Substring (case-insensitive) that MUST appear in the rendered recipe
   *  ingredients/steps OR in the nutrition.notes field. Picked to be
   *  region-specific (e.g. "panch phoron" for Bengali macher jhol — the
   *  generic curry recipe in KEYWORD_RECIPES has no panch phoron). */
  recipeMarker: RegExp;
  /** Substring that MUST appear in the nutrition.notes field. */
  nutritionMarker: RegExp;
};

const SIGNATURE_DISHES: SignatureCheck[] = [
  {
    region: "bengali",
    slot: "lunch",
    note: "Options: Macher jhol with bhaat | Aloo posto with rice",
    recipeMarker: /panch phoron|mustard oil/i,
    nutritionMarker: /Bengali|fish/i,
  },
  {
    region: "gujarati",
    slot: "breakfast",
    note: "Options: Khaman dhokla with chutney | Thepla with curd",
    recipeMarker: /eno|besan.*curd|airy sponge/i,
    nutritionMarker: /Steamed besan|plant protein/i,
  },
  {
    region: "maharashtrian",
    slot: "breakfast",
    note: "Options: Misal pav | Sabudana khichdi",
    recipeMarker: /matki|goda masala|sprouted/i,
    nutritionMarker: /Sprouted matki|sprouted/i,
  },
  {
    region: "south_indian",
    slot: "breakfast",
    note: "Options: Pongal with chutney | Idli with sambar",
    recipeMarker: /moong dal.*rice|cashew|pepper.*cumin/i,
    nutritionMarker: /Soft.*easy to digest|easy to digest/i,
  },
  {
    region: "punjabi",
    slot: "lunch",
    note: "Options: Sarson da saag with makki roti | Rajma chawal",
    recipeMarker: /makki|mustard greens|white butter/i,
    nutritionMarker: /Iron-rich greens|winter superfood/i,
  },
  {
    region: "north_indian",
    slot: "breakfast",
    note: "Options: Bedmi puri with aloo sabzi | Chole bhature",
    recipeMarker: /urad dal|coarsely-ground urad/i,
    nutritionMarker: /Urad dal.*wheat|protein-fortified/i,
  },
];

for (const check of SIGNATURE_DISHES) {
  describe(`generateAiRoutine — region "${check.region}" returns region-specific recipe for signature dish`, () => {
    it(`${check.slot}: signature dish recipe + nutrition are the regional bank entry, not generic fallback`, async () => {
      // Build a non-school-day fixture and overwrite the target slot's notes
      // with the signature-dish options string.
      const items = regionalNonSchoolItems(check.region).map((it) => {
        if (check.slot === "breakfast" && /^breakfast$/i.test(it.activity)) {
          return { ...it, notes: check.note };
        }
        if (check.slot === "lunch" && /^lunch$/i.test(it.activity)) {
          return { ...it, notes: check.note };
        }
        return it;
      });

      const result = await generateAiRoutine({
        ...BASE,
        hasSchool: false,
        region: check.region,
        openaiClient: makeMockOpenai({
          title: `${check.region} signature ${check.slot}`,
          items,
        }),
      });

      // Find the meal block whose `meal` (primary) matches the first
      // pipe-separated option from our seeded notes.
      const expectedPrimary = check.note
        .replace("Options:", "")
        .split("|")[0]!
        .trim()
        .toLowerCase();
      const block = result.items.find(
        (i) => (i.meal ?? "").toLowerCase() === expectedPrimary,
      );
      assert.ok(
        block,
        `[${check.region}] expected a meal block with primary "${expectedPrimary}" — got: ${result.items
          .map((i) => i.meal ?? i.activity)
          .join(", ")}`,
      );

      // The recipe must contain a region-specific marker that the generic
      // keyword bank could never produce.
      const recipeBlob = JSON.stringify(block!.recipe ?? {});
      assert.ok(
        check.recipeMarker.test(recipeBlob),
        `[${check.region}] signature recipe for "${expectedPrimary}" missing regional marker ${check.recipeMarker} — got: ${recipeBlob}`,
      );

      // The nutrition.notes must carry the region-specific tagline.
      const nutritionNotes = block!.nutrition?.notes ?? "";
      assert.ok(
        check.nutritionMarker.test(nutritionNotes),
        `[${check.region}] signature nutrition for "${expectedPrimary}" missing regional marker ${check.nutritionMarker} — got: "${nutritionNotes}"`,
      );
    });
  });
}

// ─── Caregiver + weather AI prompt assertions ────────────────────────────────

describe("generateAiRoutine — prompt content (caregiver + weather)", () => {
  it("includes the caregiver line and excludes legacy parent/isWorking tokens", async () => {
    const mock = makeMockOpenai({ title: "Day", items: nonSchoolItems() });
    await generateAiRoutine({
      ...BASE,
      hasSchool: false,
      caregiver: "grandparent",
      weatherOutdoor: "no",
      openaiClient: mock,
    });
    const userMsg = mock._calls[0]!.messages.find((m) => m.role === "user")!.content;
    assert.match(userMsg, /Caregiver today: Grandparent/);
    assert.match(userMsg, /grandparent is caring/i);
    assert.match(userMsg, /Outdoor weather:/);
    assert.match(userMsg, /Outdoor play is NOT possible/);
    assert.doesNotMatch(userMsg, /parent1/i);
    assert.doesNotMatch(userMsg, /parent2/i);
    assert.doesNotMatch(userMsg, /isWorking/);
    assert.doesNotMatch(userMsg, /isWorkingDay/);
  });

  it("varies the prompt per caregiver", async () => {
    const prompts: Record<string, string> = {};
    for (const c of ["mom", "dad", "both", "grandparent", "babysitter"] as const) {
      const mock = makeMockOpenai({ title: "Day", items: nonSchoolItems() });
      await generateAiRoutine({
        ...BASE,
        hasSchool: false,
        caregiver: c,
        openaiClient: mock,
      });
      prompts[c] = mock._calls[0]!.messages.find((m) => m.role === "user")!.content;
    }
    assert.notEqual(prompts.mom, prompts.dad);
    assert.notEqual(prompts.mom, prompts.babysitter);
    assert.notEqual(prompts.grandparent, prompts.babysitter);
    assert.match(prompts.babysitter, /babysitter/i);
    assert.match(prompts.both, /both parents/i);
  });
});

describe("generateAiRoutine — weather adjustment is applied to AI output", () => {
  function isOutdoorish(activity: string, category: string): boolean {
    return /\b(outdoor|park|cycling|cycle|bike|walk|playground|swim|run|jog|football|cricket|tennis|skating|nature|garden)\b/i.test(activity)
      || /^outdoor/.test(category.toLowerCase());
  }

  it("weatherOutdoor=no removes outdoor activities from AI items", async () => {
    const result = await generateAiRoutine({
      ...BASE,
      hasSchool: false,
      caregiver: "mom",
      weatherOutdoor: "no",
      openaiClient: makeMockOpenai({ title: "Day", items: nonSchoolItems() }),
    });
    const remaining = result.items.filter((it) => isOutdoorish(it.activity, it.category ?? ""));
    assert.equal(remaining.length, 0, `Outdoor leftovers from AI: ${remaining.map((r) => r.activity).join(", ")}`);
  });

  it("weatherOutdoor=limited halves duration on AI outdoor items vs yes", async () => {
    const yesRes = await generateAiRoutine({
      ...BASE,
      hasSchool: false,
      caregiver: "mom",
      weatherOutdoor: "yes",
      openaiClient: makeMockOpenai({ title: "Day", items: nonSchoolItems() }),
    });
    const limRes = await generateAiRoutine({
      ...BASE,
      hasSchool: false,
      caregiver: "mom",
      weatherOutdoor: "limited",
      openaiClient: makeMockOpenai({ title: "Day", items: nonSchoolItems() }),
    });
    const yesOut = yesRes.items.filter((it) => isOutdoorish(it.activity, it.category ?? ""));
    const limOut = limRes.items.filter((it) => isOutdoorish(it.activity, it.category ?? ""));
    if (yesOut.length > 0 && limOut.length > 0) {
      const yesTotal = yesOut.reduce((s, it) => s + (it.duration ?? 0), 0);
      const limTotal = limOut.reduce((s, it) => s + (it.duration ?? 0), 0);
      assert.ok(limTotal <= yesTotal);
    }
  });
});
