import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAgeGroup,
  buildInfant0_6FeedingTimeline,
  buildInfant6_12FeedingTimeline,
  buildRealisticInfant0_6Routine,
  applyAgeFeedingRoutineFlow,
  enrichAgeFeedingMeals,
  validateAgeFeedingIntegration,
  isAdultMealBlock,
  isOptionalNightFeed,
  ON_DEMAND_FEEDING_NOTE,
} from "./routine-age-feeding.js";
import { generateMeals } from "./routine-meal-integration.js";
import { parseTimeToMins } from "./routine-scheduler.js";

describe("getAgeGroup", () => {
  it("classifies age bands", () => {
    assert.equal(getAgeGroup(3), "infant_0_6");
    assert.equal(getAgeGroup(8), "infant_6_12");
    assert.equal(getAgeGroup(18), "toddler");
    assert.equal(getAgeGroup(48), "child");
  });
});

describe("infant 0–6 feeding", () => {
  it("replaces meals with feeding blocks only (no dishes)", () => {
    const items = [
      { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine" },
      { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
      { time: "12:00", activity: "Lunch", duration: 35, category: "meal" },
      { time: "21:00", activity: "Lights out", duration: 30, category: "sleep" },
    ];
    const { items: out } = applyAgeFeedingRoutineFlow(items, "infant_0_6", {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
      ageInMonths: 3,
      feedingType: "breastfeeding",
    });
    assert.equal(out.some((i) => isAdultMealBlock(i)), false);
    const feeds = out.filter((i) => i.category === "feeding");
    assert.ok(feeds.length >= 6 && feeds.length <= 10);
    assert.ok(out.some(isOptionalNightFeed));
    for (const f of feeds) {
      assert.equal(f.dishes, undefined);
      assert.equal(f.type, "feeding");
      assert.equal(f.feedingType, "breast_milk");
      assert.match(f.notes ?? "", /on-demand/i);
    }
    const warnings = validateAgeFeedingIntegration(out, "infant_0_6");
    assert.equal(warnings.length, 0, warnings.join("; "));
  });

  it("uses formula feedingType when specified", () => {
    const out = buildRealisticInfant0_6Routine({
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
      ageInMonths: 4,
      feedingType: "formula",
    });
    const feed = out.find((i) => i.category === "feeding");
    assert.equal(feed?.feedingType, "formula");
    assert.equal(feed?.type, "feeding");
  });

  it("labels safe fresh-air activity (not outdoor play)", () => {
    const out = buildRealisticInfant0_6Routine({
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
      ageInMonths: 4,
    });
    assert.ok(
      out.some((i) => /fresh air \/ window time/i.test(i.activity)),
    );
    assert.equal(
      out.some((i) => /\boutdoor play\b/i.test(i.activity)),
      false,
    );
  });
});

describe("infant 6–12 feeding", () => {
  it("includes milk feeds and soft meals", () => {
    const items = [
      { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine" },
      { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
      { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
    ];
    const { items: out } = applyAgeFeedingRoutineFlow(items, "infant_6_12", {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
      ageInMonths: 9,
    });
    const feeds = out.filter((i) => i.category === "feeding");
    const soft = out.filter((i) => /\bsoft meal\b/i.test(i.activity));
    assert.ok(feeds.length >= 2 && feeds.length <= 4);
    assert.ok(soft.length >= 2 && soft.length <= 4);
    assert.equal(out.some(isAdultMealBlock), false);

    const enriched = enrichAgeFeedingMeals(out, "infant_6_12", { ageInMonths: 9, seed: 1 });
    const softMeal = enriched.find((i) => /\bsoft meal\b/i.test(i.activity));
    assert.ok(softMeal?.dishes?.some((d) => /mash|puree|khichdi/i.test(d)));
  });
});

describe("generateMeals", () => {
  it("returns feeding-only meta for 0–6 months (no dishes)", () => {
    const meta = generateMeals({
      country: "US",
      slot: "breakfast",
      ageInMonths: 4,
      fridgeItems: "rice, bread",
    });
    assert.equal((meta as { type?: string }).type, "feeding");
    assert.equal((meta as { feedingType?: string }).feedingType, "breast_milk");
    assert.match(meta.culturalReason, /WHO|milk|6 months/i);
    assert.equal("dishes" in meta, false);
  });

  it("returns country meals for 4+ years", () => {
    const meta = generateMeals({
      country: "US",
      slot: "dinner",
      ageInMonths: 96,
      seed: 2,
    });
    assert.ok("dishes" in meta);
    assert.ok(meta.dishes.some((d: string) => /mac|spaghetti|nugget|taco/i.test(d)));
  });
});

describe("feeding timeline spacing", () => {
  it("spaces 0–6 daytime feeds every ~2–3 hours", () => {
    const out = buildInfant0_6FeedingTimeline([], {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
      ageInMonths: 2,
    });
    const feeds = out
      .filter((i) => i.category === "feeding")
      .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time));
    assert.ok(feeds.length >= 6);
    for (let i = 1; i < feeds.length; i++) {
      const gap = parseTimeToMins(feeds[i]!.time) - parseTimeToMins(feeds[i - 1]!.time);
      assert.ok(gap >= 110 && gap <= 210, `gap ${gap} at index ${i}`);
    }
  });

  it("includes on-demand note on all feeds", () => {
    const out = buildRealisticInfant0_6Routine({
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
      ageInMonths: 3,
    });
    for (const f of out.filter((i) => i.category === "feeding" || isOptionalNightFeed(i))) {
      assert.match(f.notes ?? "", /on-demand/i, f.activity);
    }
    assert.match(ON_DEMAND_FEEDING_NOTE, /approximate/i);
  });

  it("6–12 timeline has no adult meal labels", () => {
    const out = buildInfant6_12FeedingTimeline(
      [{ time: "18:00", activity: "Dinner", duration: 35, category: "meal" }],
      { wakeMins: 7 * 60, sleepMins: 21 * 60, ageInMonths: 10 },
    );
    assert.equal(out.some(isAdultMealBlock), false);
  });
});
