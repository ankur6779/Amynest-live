import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRoutineContext } from "./routine-context-builder.js";
import { deriveBehavioralState } from "./routine-context-engine.js";
import { generateRoutineFromState } from "./routine-decision-engine.js";
import {
  applyCulturalExposureModifier,
  applyExposureModeAdaptations,
  baseExposureModeFromAqi,
  buildGlobalAqiAdvisory,
  maxOutdoorMinutesFromAqi,
  resolveExposureModeForAqi,
  combineOutdoorAllowance,
  deriveAqiOutdoorPolicy,
  getAQICategory,
  isEveningPollutionPeak,
  isOutdoorActivityItem,
  lightOutdoorWalkLabel,
  mergeExposureModes,
  validateAqiOutdoorRules,
} from "./routine-aqi.js";
import { mergeWeatherAndAqiExposure as mergeFromEnv } from "./routine-environment-intelligence.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";

describe("getAQICategory", () => {
  it("returns global bands", () => {
    assert.equal(getAQICategory(40), "good");
    assert.equal(getAQICategory(80), "moderate");
    assert.equal(getAQICategory(150), "sensitive");
    assert.equal(getAQICategory(250), "unhealthy");
    assert.equal(getAQICategory(350), "severe");
  });
});

describe("baseExposureModeFromAqi", () => {
  it("maps AQI to exposure tiers", () => {
    assert.equal(baseExposureModeFromAqi(40), "normal");
    assert.equal(baseExposureModeFromAqi(90), "reduced");
    assert.equal(baseExposureModeFromAqi(150), "limited");
    assert.equal(baseExposureModeFromAqi(250), "controlled");
    assert.equal(baseExposureModeFromAqi(350), "indoor_only");
  });
});

describe("cultural exposure modifier", () => {
  it("strict regions shift one level higher", () => {
    assert.equal(applyCulturalExposureModifier("limited", "US"), "controlled");
    assert.equal(applyCulturalExposureModifier("controlled", "UK"), "indoor_only");
  });

  it("tolerant regions shift one level lower", () => {
    assert.equal(applyCulturalExposureModifier("controlled", "IN"), "limited");
    assert.equal(applyCulturalExposureModifier("indoor_only", "AE"), "controlled");
  });

  it("AU/NZ keep same tier", () => {
    assert.equal(applyCulturalExposureModifier("limited", "AU"), "limited");
  });
});

describe("deriveAqiOutdoorPolicy", () => {
  it("US unhealthy AQI becomes indoor_only (strict)", () => {
    const p = deriveAqiOutdoorPolicy(250, "US");
    assert.equal(p.exposureMode, "indoor_only");
    assert.equal(p.allowOutdoor, false);
  });

  it("India unhealthy AQI becomes limited outdoor (tolerant)", () => {
    const p = deriveAqiOutdoorPolicy(280, "IN");
    assert.equal(p.baseExposureMode, "controlled");
    assert.equal(p.exposureMode, "limited");
    assert.equal(p.allowOutdoor, true);
    assert.equal(p.maxOutdoorDurationMins, 15);
  });

  it("AQI 150–200 caps outdoor at 20 minutes with limited exposure", () => {
    const p = deriveAqiOutdoorPolicy(180, "IN");
    assert.equal(p.exposureMode, "limited");
    assert.equal(p.maxOutdoorDurationMins, 20);
    assert.equal(maxOutdoorMinutesFromAqi(180), 20);
  });

  it("AU AQI 150 uses limited mode and 20-minute cap", () => {
    const p = deriveAqiOutdoorPolicy(150, "AU");
    assert.equal(p.exposureMode, "limited");
    assert.equal(resolveExposureModeForAqi(150, "AU"), "limited");
    assert.equal(p.maxOutdoorDurationMins, 20);
  });
});

describe("buildGlobalAqiAdvisory", () => {
  it("includes level, message, and safety actions when AQI > 100", () => {
    const adv = buildGlobalAqiAdvisory(180, "limited", "IN");
    assert.equal(adv.level, "warning");
    assert.match(adv.message, /unhealthy/i);
    assert.ok(adv.actions.some((a) => /mask|heavy|water|air/i.test(a)));
  });
});

describe("mergeExposureModes", () => {
  it("picks stricter of weather and AQI", () => {
    assert.equal(mergeExposureModes("normal", "limited"), "limited");
    assert.equal(mergeExposureModes("controlled", "reduced"), "controlled");
  });
});

describe("mergeWeatherAndAqiExposure (environment)", () => {
  it("rain + good AQI still restricts via weather", () => {
    const ctx = buildRoutineContext({
      country: "US",
      weatherOutdoor: "no",
      environment: { AQI: 50 },
    });
    const merged = mergeFromEnv(ctx, "US", "indoor_day");
    assert.equal(merged, "indoor_only");
  });
});

describe("applyExposureModeAdaptations", () => {
  it("converts sports to light walk with structured advisory", () => {
    const policy = deriveAqiOutdoorPolicy(265, "IN");
    const out = applyExposureModeAdaptations(
      [
        {
          time: "18:00",
          activity: "Soccer practice",
          duration: 45,
          category: "exercise",
        },
      ],
      { aqi: 265, country: "IN", policy, schoolEndMins: 15 * 60 },
    );
    const walk = out.find((i) =>
      /\blight outdoor walk\b/i.test(i.activity),
    ) as RoutineScheduleItem | undefined;
    assert.ok(walk?.advisory?.level);
    assert.ok((walk?.advisory?.actions.length ?? 0) > 0);
  });
});

describe("deriveBehavioralState", () => {
  it("India AQI 280 — limited outdoor exposure", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({
        country: "IN",
        weatherOutdoor: "yes",
        environment: { AQI: 280 },
      }),
      { ageGroup: "early_school" },
    );
    assert.equal(state.allowOutdoor, true);
    assert.equal(state.aqiExposureMode, "limited");
    assert.equal(state.outdoorBlockedByAqi, false);
  });

  it("US AQI 250 — indoor only", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({
        country: "US",
        weatherOutdoor: "yes",
        environment: { AQI: 250 },
      }),
      { ageGroup: "early_school" },
    );
    assert.equal(state.allowOutdoor, false);
    assert.equal(state.aqiExposureMode, "indoor_only");
  });
});

describe("validateAqiOutdoorRules", () => {
  it("requires advisory when AQI > 100", () => {
    const item: RoutineScheduleItem = {
      time: "15:00",
      activity: lightOutdoorWalkLabel(),
      duration: 20,
      category: "outdoor",
      advisory: buildGlobalAqiAdvisory(120, "reduced", "AU"),
    };
    assert.equal(validateAqiOutdoorRules([item], 120, "AU").length, 0);
  });

  it("flags outdoor when US exposure is indoor_only", () => {
    const w = validateAqiOutdoorRules(
      [{ time: "16:00", activity: "Park", duration: 30, category: "outdoor" }],
      250,
      "US",
    );
    assert.ok(w.length > 0);
  });
});

describe("generateRoutineFromState India", () => {
  it("includes limited outdoor with advisory", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({
        country: "IN",
        weatherOutdoor: "yes",
        hasSchool: true,
        environment: { AQI: 265 },
      }),
      { ageGroup: "early_school" },
    );
    const { items } = generateRoutineFromState(
      [
        { time: "07:00", activity: "Wake up", duration: 30, category: "morning_routine" },
        { time: "09:00", activity: "At school", duration: 360, category: "school" },
        { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
      ],
      state,
      {
        wakeUpTime: "07:00",
        sleepTime: "21:00",
        ageGroup: "early_school",
        hasSchool: true,
        schoolEndMins: 15 * 60,
      },
    );
    const outdoor = items.filter(
      (i) => isOutdoorActivityItem(i) || /\blight outdoor walk\b/i.test(i.activity),
    );
    assert.ok(outdoor.length > 0);
    assert.ok(outdoor.some((i) => i.advisory?.level && i.advisory.actions.length > 0));
  });
});
