import assert from "node:assert/strict";
import { test } from "node:test";
import { assessContext, contextFavorsCategory } from "./context-engine.js";

test("no inputs degrades gracefully without fabricating context", () => {
  const a = assessContext({});
  assert.equal(a.degraded, true);
  assert.equal(a.moments.length, 0);
  assert.equal(a.timeOfDay, null);
});

test("detects bedtime approaching and mealtime windows", () => {
  const bedtime = assessContext({ hourLocal: 20, bedtimeHour: 21 });
  assert.ok(bedtime.moments.includes("bedtime_approaching"));

  const meal = assessContext({ hourLocal: 13, lunchHour: 13 });
  assert.ok(meal.moments.includes("mealtime"));
});

test("weekend and birthday windows", () => {
  const wk = assessContext({ weekday: 6 });
  assert.ok(wk.moments.includes("weekend"));

  const bday = assessContext({ childBirthdayInDays: 0 });
  assert.ok(bday.moments.includes("birthday_today"));

  const bweek = assessContext({ childBirthdayInDays: 5 });
  assert.ok(bweek.moments.includes("birthday_week"));
});

test("does not fabricate rain when weather unknown", () => {
  const a = assessContext({ hourLocal: 10 });
  assert.ok(!a.moments.includes("rainy_day"));
});

test("context favors bedtime categories in the evening", () => {
  const a = assessContext({ hourLocal: 20, bedtimeHour: 21 });
  assert.equal(contextFavorsCategory(a, "good_night"), true);
  assert.equal(contextFavorsCategory(a, "routine"), false);
});

test("richness scales with known fields", () => {
  const rich = assessContext({ hourLocal: 9, weekday: 1, isHoliday: false, isSchoolDay: true, season: "winter" });
  assert.ok(rich.richness >= 0.8);
});
