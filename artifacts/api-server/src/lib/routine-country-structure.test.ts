import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  differenceScore,
  getCountryStructureOrder,
  orderItemsByCountryStructure,
  classifyStructureBlock,
  isOutdoorBlockedByHeat,
  STRUCTURE_DIFFERENCE_THRESHOLD,
  US_UK_DIFFERENCE_MIN,
} from "./routine-country-structure.js";
import { buildRoutineContext } from "./routine-context-builder.js";
import { deriveBehavioralState } from "./routine-context-engine.js";
import {
  generateRoutineFromState,
  reshapeItemsForContext,
  validateActivityOrdering,
} from "./routine-decision-engine.js";
import { hardValidateSchedule, parseTimeToMins } from "./routine-scheduler.js";

describe("differenceScore", () => {
  it("returns 0 for same country", () => {
    assert.equal(differenceScore("US", "US"), 0);
  });

  it("scores US vs IN above threshold", () => {
    const score = differenceScore("US", "IN");
    assert.ok(score > STRUCTURE_DIFFERENCE_THRESHOLD, `score=${score}`);
  });

  it("scores US vs UK above minimum (distinct templates)", () => {
    const score = differenceScore("US", "UK");
    assert.ok(score >= US_UK_DIFFERENCE_MIN, `score=${score}`);
  });

  it("scores AU vs AT above threshold", () => {
    assert.ok(differenceScore("AU", "AT") > STRUCTURE_DIFFERENCE_THRESHOLD);
  });
});

describe("orderItemsByCountryStructure", () => {
  it("places outdoor before snack for AU", () => {
    const items = [
      { time: "", activity: "Afternoon snack", duration: 20, category: "meal" },
      { time: "", activity: "Backyard cricket", duration: 50, category: "outdoor" },
      { time: "", activity: "Sports practice", duration: 45, category: "exercise" },
    ];
    const ordered = orderItemsByCountryStructure(items, "AU");
    assert.equal(classifyStructureBlock(ordered[0]!), "outdoor");
    assert.equal(classifyStructureBlock(ordered[1]!), "snack");
  });

  it("places tuition before play for India", () => {
    const items = [
      { time: "", activity: "Evening play", duration: 40, category: "play" },
      { time: "", activity: "Tuition & study time", duration: 60, category: "study" },
    ];
    const ordered = orderItemsByCountryStructure(items, "IN");
    assert.equal(classifyStructureBlock(ordered[0]!), "study");
    assert.equal(classifyStructureBlock(ordered[1]!), "play");
  });
});

describe("country routine structure integration", () => {
  const baseItems = [
    { time: "07:00", activity: "Wake up", duration: 30, category: "morning_routine" },
    { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
    { time: "15:00", activity: "Free play", duration: 45, category: "play" },
    { time: "19:00", activity: "Dinner", duration: 35, category: "meal" },
    { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
  ];

  const opts = {
    wakeUpTime: "07:00",
    sleepTime: "21:00",
    ageGroup: "early_school" as const,
    hasSchool: true,
    schoolStartMins: 8 * 60,
    schoolEndMins: 15 * 60,
  };

  it("US places sports before dinner", () => {
    const ctx = buildRoutineContext({ country: "US", hasSchool: true, weatherOutdoor: "yes" });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    const { items } = generateRoutineFromState(baseItems, state, opts);
    const orderingWarnings = validateActivityOrdering(items, state);
    assert.ok(!orderingWarnings.some((w) => w.includes("should finish before dinner")));
    const hard = hardValidateSchedule(items, "07:00", "21:00");
    assert.equal(hard.valid, true, hard.errors.join("; "));
  });

  it("UAE avoids outdoor in heat window", () => {
    const ctx = buildRoutineContext({ country: "AE", hasSchool: true, weatherOutdoor: "yes" });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    const { items } = generateRoutineFromState(baseItems, state, opts);
    for (const it of items) {
      if (it.category !== "outdoor") continue;
      const start = parseTimeToMins(it.time);
      assert.ok(
        !isOutdoorBlockedByHeat(start, "AE"),
        `outdoor at ${it.time} in heat window`,
      );
    }
  });

  it("India tuition block is 45–90 minutes when injected", () => {
    const ctx = buildRoutineContext({ country: "IN", hasSchool: true, weatherOutdoor: "yes" });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    const { items: generated } = generateRoutineFromState(baseItems, state, opts);
    const items = reshapeItemsForContext(generated, state);
    const tuition = items.find((i) => /tuition|study time/i.test(i.activity));
    assert.ok(tuition, `tuition missing: ${items.map((i) => i.activity).join(", ")}`);
    assert.ok((tuition!.duration ?? 0) >= 45 && (tuition!.duration ?? 0) <= 90);
  });

  it("AU structure orders outdoor before snack before sports", () => {
    const order = getCountryStructureOrder("AU");
    const outdoorIdx = order.indexOf("outdoor");
    const snackIdx = order.indexOf("snack");
    const sportIdx = order.indexOf("extracurricular");
    assert.ok(outdoorIdx >= 0 && snackIdx > outdoorIdx && sportIdx > snackIdx);
  });

  it("distinct countries produce different structure orders", () => {
    const usOrder = getCountryStructureOrder("US");
    const inOrder = getCountryStructureOrder("IN");
    assert.notDeepEqual(usOrder, inOrder);
    assert.ok(differenceScore("US", "IN") > 0.3);
  });
});
