import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyEnvironmentalEnrichments, type EnrichableItem } from "../enrichments.js";
import type { EnvironmentalContext } from "../types.js";

function ctx(overrides: Partial<EnvironmentalContext> = {}): EnvironmentalContext {
  return {
    ageGroup: "preschool_3_5",
    location: { latitude: 28.6, longitude: 77.2, label: "Delhi" },
    snapshot: {
      observedAt: "2026-05-11T08:00:00Z",
      source: "test",
      temperatureC: 38,
      apparentC: 40,
      humidityPct: 50,
      uvIndexMax: 9,
      aqiUs: 80,
      pm25: 35,
      precipitationMm: 0,
      windKph: 8,
      cloudCoverPct: 20,
      sunrise: "2026-05-11T05:30:00",
      sunset: "2026-05-11T19:00:00",
      daylightMinutes: 810,
    },
    environmentalRiskScore: 60,
    outdoorSuitability: "limited",
    hydrationNeedLevel: "high",
    cognitiveComfortLevel: "moderate",
    sensoryStressLevel: "moderate",
    environmentalFatigueRisk: "moderate",
    circadianLightProfile: "normal",
    aqiBucket: "moderate",
    uvBucket: "very_high",
    weatherCondition: "heatwave",
    season: "summer",
    explanations: [],
    tags: [],
    degraded: false,
    ...overrides,
  };
}

const sampleItems: EnrichableItem[] = [
  { time: "06:30", activity: "Wake Up", duration: 15, category: "wake" },
  { time: "07:30", activity: "Breakfast", duration: 30, category: "meal" },
  { time: "10:00", activity: "Park & Outdoor Play", duration: 60, category: "outdoor" },
  { time: "13:00", activity: "Lunch", duration: 30, category: "meal" },
  { time: "16:00", activity: "Indoor Free Play", duration: 30, category: "play" },
  { time: "20:30", activity: "Sleep Time", duration: 0, category: "sleep" },
];

describe("applyEnvironmentalEnrichments", () => {
  it("returns items unchanged when ctx is null", () => {
    const r = applyEnvironmentalEnrichments(sampleItems, null);
    assert.deepEqual(r.items, sampleItems);
    assert.deepEqual(r.extraAdaptations, []);
  });

  it("inserts hydration reminders during the active day", () => {
    const r = applyEnvironmentalEnrichments(sampleItems, ctx());
    const reminders = r.items.filter((i) => i.category === "hydration");
    assert.ok(reminders.length > 0, "expected at least one hydration reminder");
    const firstActiveMin = 6 * 60 + 30;
    const lastActiveMin = 16 * 60 + 30;
    for (const rem of reminders) {
      const [h, m] = rem.time.split(":").map(Number);
      const t = h! * 60 + m!;
      assert.ok(t >= firstActiveMin && t <= lastActiveMin, `reminder ${rem.time} outside active window`);
    }
    assert.ok(r.extraAdaptations.some((s) => s.toLowerCase().includes("hydration")));
  });

  it("annotates meal items with seasonal nutrition hints", () => {
    const r = applyEnvironmentalEnrichments(sampleItems, ctx({ season: "summer" }), {
      region: "north_india",
    });
    const breakfast = r.items.find((i) => i.activity === "Breakfast");
    assert.ok(breakfast?.notes, "expected breakfast to have notes");
    assert.match(breakfast!.notes!, /seasonal pick/i);
    assert.ok(r.extraAdaptations.some((s) => s.toLowerCase().includes("season")));
  });

  it("adds UV safety notes and caps duration on outdoor blocks", () => {
    const r = applyEnvironmentalEnrichments(sampleItems, ctx({ uvBucket: "very_high" }));
    const outdoor = r.items.find((i) => i.activity === "Park & Outdoor Play");
    assert.ok(outdoor);
    assert.ok(outdoor!.duration < 60, "expected outdoor duration capped");
    assert.match(outdoor!.notes ?? "", /UV/i);
  });

  it("does not annotate UV when uvBucket is low", () => {
    const r = applyEnvironmentalEnrichments(sampleItems, ctx({ uvBucket: "low" }));
    const outdoor = r.items.find((i) => i.activity === "Park & Outdoor Play");
    assert.equal(outdoor!.duration, 60);
    assert.doesNotMatch(outdoor!.notes ?? "", /UV/i);
  });

  it("appends activity library suggestion to indoor swap items when AQI is unhealthy", () => {
    const r = applyEnvironmentalEnrichments(sampleItems, ctx({ aqiBucket: "unhealthy" }));
    const indoor = r.items.find((i) => i.activity === "Indoor Free Play");
    assert.match(indoor?.notes ?? "", /try:/i);
    assert.ok(r.extraAdaptations.some((s) => s.toLowerCase().includes("indoor swap")));
  });

  it("does not insert hydration reminders when only sleep items exist", () => {
    const sleepOnly: EnrichableItem[] = [
      { time: "20:00", activity: "Sleep", duration: 0, category: "sleep" },
    ];
    const r = applyEnvironmentalEnrichments(sleepOnly, ctx());
    assert.equal(r.items.length, 1);
    assert.equal(r.items[0]!.category, "sleep");
  });

  it("preserves chronological order after merging hydration reminders", () => {
    const r = applyEnvironmentalEnrichments(sampleItems, ctx());
    const mins = r.items.map((i) => {
      const [h, m] = i.time.split(":").map(Number);
      return h! * 60 + m!;
    });
    const sorted = [...mins].sort((a, b) => a - b);
    assert.deepEqual(mins, sorted);
  });

  it("does not mutate the input array", () => {
    const original = JSON.parse(JSON.stringify(sampleItems));
    applyEnvironmentalEnrichments(sampleItems, ctx({ uvBucket: "extreme" }));
    assert.deepEqual(sampleItems, original);
  });

  // ── Phase-2 enrichments (circadian / energy / stress / predictive / mood)

  const studyItems: EnrichableItem[] = [
    { time: "07:00", activity: "Wake Up", duration: 15, category: "wake" },
    { time: "08:30", activity: "Morning Study Block", duration: 45, category: "learning" },
    { time: "12:00", activity: "Lunch", duration: 30, category: "meal" },
    { time: "16:00", activity: "Indoor Free Play", duration: 30, category: "play" },
    { time: "19:30", activity: "Story Time", duration: 15, category: "bonding" },
    { time: "20:00", activity: "Wind-Down & Cuddle", duration: 15, category: "wind-down" },
    { time: "20:30", activity: "Sleep Time", duration: 0, category: "sleep" },
  ];

  it("annotates study blocks that fall inside a circadian focus window", () => {
    const r = applyEnvironmentalEnrichments(studyItems, ctx({ ageGroup: "early_school_5_10" }));
    const study = r.items.find((i) => i.activity === "Morning Study Block");
    assert.match(study?.notes ?? "", /focus window/i);
    assert.ok(r.extraAdaptations.some((s) => s.toLowerCase().includes("circadian")));
  });

  it("annotates wind-down blocks inside the melatonin support window", () => {
    const r = applyEnvironmentalEnrichments(studyItems, ctx({ ageGroup: "early_school_5_10" }));
    const wd = r.items.find((i) => i.activity === "Wind-Down & Cuddle");
    assert.match(wd?.notes ?? "", /melatonin/i);
  });

  it("adds a darker-day note to wind-down when circadian profile is dim", () => {
    const r = applyEnvironmentalEnrichments(studyItems, ctx({
      ageGroup: "early_school_5_10",
      circadianLightProfile: "early_dark",
    }));
    const wd = r.items.find((i) => i.activity === "Wind-Down & Cuddle");
    assert.match(wd?.notes ?? "", /dimmer than usual/i);
  });

  it("adds weather-energy break guidance to study blocks in heatwave", () => {
    const r = applyEnvironmentalEnrichments(studyItems, ctx({
      ageGroup: "early_school_5_10",
      weatherCondition: "heatwave",
    }));
    const study = r.items.find((i) => i.activity === "Morning Study Block");
    assert.match(study?.notes ?? "", /drains focus|break every/i);
    assert.ok(r.extraAdaptations.some((s) => s.toLowerCase().includes("intensity")));
  });

  it("does not add weather-energy guidance when condition is neutral", () => {
    const r = applyEnvironmentalEnrichments(studyItems, ctx({
      ageGroup: "early_school_5_10",
      weatherCondition: "sunny",
      uvBucket: "low",
      aqiBucket: "good",
      sensoryStressLevel: "low",
      hydrationNeedLevel: "low",
      circadianLightProfile: "normal",
    }));
    const study = r.items.find((i) => i.activity === "Morning Study Block");
    assert.doesNotMatch(study?.notes ?? "", /drains focus/i);
  });

  it("adds a stress-factor calming hint on stormy days", () => {
    const r = applyEnvironmentalEnrichments(studyItems, ctx({ weatherCondition: "stormy" }));
    const wdOrStory = r.items.find((i) => i.activity === "Story Time" || i.activity === "Wind-Down & Cuddle");
    assert.match(wdOrStory?.notes ?? "", /storm stress/i);
    assert.ok(r.extraAdaptations.some((s) => s.toLowerCase().includes("calming guidance")));
  });

  it("appends a predictive heads-up adaptation when a shift is incoming", () => {
    const r = applyEnvironmentalEnrichments(
      studyItems,
      ctx({
        predictedWeatherShift: {
          label: "incoming storm in 2h",
          kind: "incoming_storm",
          etaHours: 2,
          confidence: 0.8,
        },
      }),
    );
    assert.ok(r.extraAdaptations.some((s) => s.toLowerCase().startsWith("heads-up")));
  });

  it("does NOT append a predictive heads-up when shift is stable", () => {
    const r = applyEnvironmentalEnrichments(
      studyItems,
      ctx({
        predictedWeatherShift: { label: "stable", kind: "stable", etaHours: 0, confidence: 1 },
      }),
    );
    assert.ok(!r.extraAdaptations.some((s) => s.toLowerCase().startsWith("heads-up")));
  });

  it("adds emotional bonding hint matched to the day's mood", () => {
    const r = applyEnvironmentalEnrichments(studyItems, ctx({ weatherCondition: "rainy" }));
    const story = r.items.find((i) => i.activity === "Story Time");
    assert.match(story?.notes ?? "", /mood today/i);
    assert.ok(r.extraAdaptations.some((s) => s.toLowerCase().includes("bonding")));
  });

  it("emotional pass remains a no-op for weather conditions outside the dataset", () => {
    const r = applyEnvironmentalEnrichments(studyItems, ctx({ weatherCondition: "foggy" }));
    assert.ok(!r.extraAdaptations.some((s) => s.toLowerCase().includes("bonding")));
  });
});
