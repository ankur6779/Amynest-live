import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRoutineContext } from "./routine-context-builder.js";
import { deriveBehavioralState } from "./routine-context-engine.js";
import {
  applyWeatherFirstPlanning,
  deriveDayPlanningMode,
  enforceOutdoorTimeGuards,
  enforceSleepIsLast,
  HOT_AFTERNOON_BLOCK_WINDOW,
  isHotAfternoon,
  weatherAdjustmentReason,
  WEATHER_ADJUSTMENT_LABEL,
} from "./routine-weather-planning.js";
import { generateRoutineFromState } from "./routine-decision-engine.js";
import { parseTimeToMins } from "./routine-scheduler.js";

describe("deriveDayPlanningMode", () => {
  it("maps country+weather to planning modes", () => {
    assert.equal(
      deriveDayPlanningMode(
        buildRoutineContext({ country: "AE", temperatureC: 42, weatherOutdoor: "yes" }),
        "AE",
      ),
      "evening_only",
    );
    assert.equal(
      deriveDayPlanningMode(
        buildRoutineContext({ country: "US", weatherOutdoor: "no" }),
        "US",
      ),
      "indoor_day",
    );
    assert.equal(
      deriveDayPlanningMode(
        buildRoutineContext({ country: "AU", temperatureC: 35, weatherOutdoor: "yes" }),
        "AU",
      ),
      "avoid_afternoon",
    );
    assert.equal(
      deriveDayPlanningMode(
        buildRoutineContext({ country: "UK", temperatureC: 5, weatherOutdoor: "limited" }),
        "UK",
      ),
      "limited_outdoor",
    );
  });
});

describe("applyWeatherFirstPlanning", () => {
  it("replaces outdoor on rainy day (not shortened)", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({ country: "US", weatherOutdoor: "no", mood: "normal" }),
      { ageGroup: "early_school" },
    );
    const out = applyWeatherFirstPlanning(
      [
        {
          time: "16:00",
          activity: "Park play",
          duration: 60,
          category: "outdoor",
        },
      ],
      state,
      [],
    );
    assert.equal(out.some((i) => i.category === "outdoor"), false);
    assert.ok(out[0]?.scheduleDecision?.reason.includes(WEATHER_ADJUSTMENT_LABEL));
    assert.equal(out[0]?.duration, 60);
  });

  it("adds hydration hints (not standalone breaks) on hot AU day", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({ country: "AU", temperatureC: 36, weatherOutdoor: "yes" }),
      { ageGroup: "early_school" },
    );
    const out = applyWeatherFirstPlanning(
      [
        {
          time: "18:30",
          activity: "Backyard play",
          duration: 40,
          category: "outdoor",
        },
      ],
      state,
      [],
    );
    assert.ok(
      !out.some((i) => /^(Hydration break|Water Break)$/i.test(i.activity)),
      "should not insert standalone water blocks on hot days",
    );
    const outdoor = out.find((i) => i.category === "outdoor");
    assert.ok(
      (outdoor as { hydration?: string })?.hydration?.includes("Offer water"),
      "outdoor block should carry integrated hydration hint",
    );
  });

  it("splits outdoor into morning and evening on hot day", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({ country: "AU", temperatureC: 35, weatherOutdoor: "yes" }),
      { ageGroup: "early_school" },
    );
    const out = applyWeatherFirstPlanning(
      [
        {
          time: "15:00",
          activity: "Backyard cricket",
          duration: 50,
          category: "outdoor",
        },
      ],
      state,
      [],
    );
    const morning = out.find((i) => /\(morning session\)/i.test(i.activity));
    const evening = out.find((i) => /\(evening session\)/i.test(i.activity));
    assert.ok(morning && evening, out.map((i) => i.activity).join(" | "));
    assert.ok(!isHotAfternoon(parseTimeToMins(morning.time)));
    assert.ok(!isHotAfternoon(parseTimeToMins(evening.time)));
  });
});

describe("enforceOutdoorTimeGuards", () => {
  it("blocks UAE outdoor before 18:30", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({ country: "AE", temperatureC: 42, weatherOutdoor: "yes" }),
      { ageGroup: "early_school" },
    );
    const out = enforceOutdoorTimeGuards(
      [{ time: "16:00", activity: "Walk", duration: 30, category: "outdoor" }],
      state,
      [],
    );
    assert.ok(parseTimeToMins(out[0]!.time) >= 18 * 60 + 30);
  });

  it("moves hot afternoon outdoor out of 12:00–17:30 window", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({ country: "AU", temperatureC: 35, weatherOutdoor: "yes" }),
      { ageGroup: "early_school" },
    );
    const out = enforceOutdoorTimeGuards(
      [{ time: "14:00", activity: "Play", duration: 30, category: "outdoor" }],
      state,
      [],
    );
    const start = parseTimeToMins(out[0]!.time);
    assert.ok(start < HOT_AFTERNOON_BLOCK_WINDOW[0] || start >= HOT_AFTERNOON_BLOCK_WINDOW[1]);
  });
});

describe("enforceSleepIsLast", () => {
  it("removes blocks scheduled after sleep", () => {
    const out = enforceSleepIsLast(
      [
        { time: "20:00", activity: "Dinner", duration: 35, category: "meal" },
        { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
        { time: "21:15", activity: "Extra play", duration: 20, category: "play" },
      ],
      [],
    );
    assert.equal(out.some((i) => i.activity === "Extra play"), false);
    assert.equal(out[out.length - 1]?.category, "sleep");
  });
});

describe("generateRoutineFromState hot day", () => {
  it("repositions outdoor with weather adjustment metadata", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({
        country: "US",
        weatherOutdoor: "yes",
        temperatureC: 36,
        hasSchool: false,
      }),
      { ageGroup: "early_school" },
    );
    const { items, decisionTrace } = generateRoutineFromState(
      [
        { time: "07:00", activity: "Wake up", duration: 30, category: "morning_routine" },
        { time: "16:00", activity: "Outdoor play", duration: 50, category: "play" },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal" },
        { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
      ],
      state,
      { wakeUpTime: "07:00", sleepTime: "21:00", ageGroup: "early_school" },
    );
    const weatherItems = items.filter((i) =>
      i.scheduleDecision?.reason.includes(WEATHER_ADJUSTMENT_LABEL),
    );
    const outdoor = items.filter(
      (i) =>
        (i.category ?? "").toLowerCase() === "outdoor" ||
        /\(morning\)|\(evening\)/i.test(i.activity),
    );
    assert.ok(
      weatherItems.length > 0 || decisionTrace.some((t) => t.kind === "weather"),
      "expected weather trace or decisions",
    );
    for (const o of outdoor) {
      const start = parseTimeToMins(o.time);
      assert.ok(
        start < HOT_AFTERNOON_BLOCK_WINDOW[0] || start >= HOT_AFTERNOON_BLOCK_WINDOW[1],
        `${o.activity} at ${o.time} in hot afternoon window`,
      );
    }
  });
});
