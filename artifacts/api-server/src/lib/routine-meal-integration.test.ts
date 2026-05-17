import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCountryMealDishes,
  applyMealAwareScheduling,
  enrichRoutineMeals,
  validateMealActivityIntegration,
} from "./routine-meal-integration.js";
import { buildRoutineContext } from "./routine-context-builder.js";
import { deriveBehavioralState } from "./routine-context-engine.js";
import { hardValidateSchedule, parseTimeToMins } from "./routine-scheduler.js";

describe("resolveCountryMealDishes", () => {
  it("returns US dinner dishes with cultural metadata", () => {
    const meta = resolveCountryMealDishes("US", "dinner", { seed: 1 });
    assert.ok(meta.dishes.length >= 2);
    assert.ok(
      meta.dishes.some((d) => /mac|grilled|nugget|taco|spaghetti/i.test(d)),
    );
    assert.equal(meta.energyImpact, "post-meal wind-down");
    assert.match(meta.culturalReason, /US/i);
  });

  it("returns India lunch and dinner with different bases", () => {
    const usedBases = new Set<string>();
    const lunch = resolveCountryMealDishes("IN", "lunch", { seed: 2, usedBases });
    const dinner = resolveCountryMealDishes("IN", "dinner", {
      seed: 3,
      usedBases,
      usedNames: new Set(lunch.dishes.map((d) => d.toLowerCase())),
    });
    const lunchBases = lunch.dishes.map((d) => d.toLowerCase());
    const overlap = dinner.dishes.filter((d) =>
      lunchBases.some((lb) => lb.includes("rice") && d.toLowerCase().includes("rice")),
    );
    assert.ok(
      dinner.dishes.some((d) => /khichdi|roti|dal|curd/i.test(d)),
      dinner.dishes.join(", "),
    );
    assert.ok(overlap.length <= 1, "should avoid duplicate rice-base lunch+dinner");
  });

  it("includes at least 2 cultural dishes when fridge is provided", () => {
    const meta = resolveCountryMealDishes("UK", "lunch", {
      fridgeItems: "eggs, bread, cheese",
      seed: 4,
    });
    assert.ok(meta.dishes.length >= 2);
    assert.ok(
      meta.dishes.some((d) => /sandwich|jacket|wrap|pasta/i.test(d)),
    );
  });

  it("blocks cultural leakage into AU breakfast", () => {
    const meta = resolveCountryMealDishes("AU", "breakfast", {
      fridgeItems: "milk, rice, vegetables",
      seed: 99,
    });
    assert.ok(!meta.dishes.some((d) => /paratha|khichdi|idli/i.test(d)));
    assert.ok(meta.dishes.some((d) => /vegemite|weet|toast|egg/i.test(d)));
  });
});

describe("enforceIntegratedRoutineFlow", () => {
  const flowOpts = {
    hasSchool: true,
    schoolEndMins: 15 * 60,
    sleepMins: 21 * 60,
    wakeMins: 7 * 60,
  };

  it("removes high-energy blocks after dinner and adds after-school refuel", () => {
    const ctx = buildRoutineContext({ country: "US" });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    const items = [
      { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine" },
      { time: "08:30", activity: "Snack", duration: 15, category: "meal" },
      { time: "09:00", activity: "At school", duration: 360, category: "school" },
      { time: "16:00", activity: "Soccer practice", duration: 45, category: "exercise" },
      { time: "18:30", activity: "Dinner", duration: 35, category: "meal" },
      { time: "19:30", activity: "Outdoor play", duration: 40, category: "outdoor" },
      { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
    ];
    const { items: out } = applyMealAwareScheduling(items, state, flowOpts);
    assert.ok(
      out.some((i) => /\b(after-school refuel|refuel)\b/i.test(i.activity)),
    );
    assert.ok(!out.some((i) => /\bsnack\b/i.test(i.activity) && parseTimeToMins(i.time) < 15 * 60));
    const dinner = out.find((i) => /\bdinner\b/i.test(i.activity))!;
    const dinnerEnd = parseTimeToMins(dinner.time) + dinner.duration;
    const windDown = out.find((i) => /wind.?down/i.test(i.activity));
    assert.ok(windDown);
    assert.ok(parseTimeToMins(windDown!.time) >= dinnerEnd);
    const lateOutdoor = out.find(
      (i) =>
        i.category === "outdoor" && parseTimeToMins(i.time) >= dinnerEnd,
    );
    assert.equal(lateOutdoor, undefined);
  });

  it("India revision after dinner and play before", () => {
    const ctx = buildRoutineContext({ country: "IN" });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    const items = [
      { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine" },
      { time: "09:00", activity: "At school", duration: 360, category: "school" },
      { time: "15:30", activity: "Tuition & study time", duration: 60, category: "study" },
      { time: "16:45", activity: "Evening play with parent", duration: 40, category: "play" },
      { time: "20:00", activity: "Dinner", duration: 35, category: "meal" },
      { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
    ];
    const { items: out } = applyMealAwareScheduling(items, state, flowOpts);
    const dinner = out.find((i) => /\bdinner\b/i.test(i.activity))!;
    const play = out.find((i) => /play/i.test(i.activity) && i.category === "play");
    const rev = out.find((i) => /revision/i.test(i.activity));
    assert.ok(play && parseTimeToMins(play.time) < parseTimeToMins(dinner.time));
    if (rev) {
      assert.ok(parseTimeToMins(rev.time) > parseTimeToMins(dinner.time));
    }
  });
});

describe("enrichRoutineMeals + validateMealActivityIntegration", () => {
  it("attaches dishes array to meal blocks", () => {
    const enriched = enrichRoutineMeals(
      [
        { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
        { time: "13:00", activity: "Lunch", duration: 35, category: "meal" },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal" },
        { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
      ],
      { country: "AU", seed: 5 },
    );
    const dinner = enriched.find((i) => /\bdinner\b/i.test(i.activity));
    assert.ok(dinner?.dishes && dinner.dishes.length >= 2);
    assert.ok(dinner?.culturalReason);
    assert.equal(dinner?.energyImpact, "post-meal wind-down");
  });

  it("does not repeat the same dish at refuel and dinner", () => {
    const enriched = enrichRoutineMeals(
      [
        { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
        { time: "15:30", activity: "Lunch", duration: 35, category: "meal" },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal" },
      ],
      { country: "IN", seed: 42 },
    );
    const refuel = enriched.find((i) => /\blunch\b|refuel/i.test(i.activity));
    const dinner = enriched.find((i) => /\bdinner\b/i.test(i.activity));
    assert.ok(refuel?.dishes?.length && dinner?.dishes?.length);
    for (const rd of refuel!.dishes!) {
      for (const dd of dinner!.dishes!) {
        assert.notEqual(
          rd.toLowerCase().trim(),
          dd.toLowerCase().trim(),
          `duplicate dish: ${rd}`,
        );
      }
    }
  });

  it("passes hard validation after meal-aware US day", () => {
    const ctx = buildRoutineContext({ country: "US", hasSchool: true });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    let items = [
      { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine" },
      { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
      { time: "15:30", activity: "After-school snack", duration: 20, category: "meal" },
      { time: "16:00", activity: "Soccer practice", duration: 45, category: "exercise" },
      { time: "18:30", activity: "Dinner", duration: 35, category: "meal" },
      { time: "19:15", activity: "Wind-down & story", duration: 25, category: "rest" },
      { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
    ];
    items = enrichRoutineMeals(items, { country: "US", seed: 6 });
    const flow = applyMealAwareScheduling(items, state);
    const warnings = validateMealActivityIntegration(flow.items, "US");
    const hard = hardValidateSchedule(flow.items, "07:00", "21:00");
    assert.equal(hard.valid, true, hard.errors.join("; "));
    assert.ok(!warnings.some((w) => w.includes("after dinner")));
  });
});
