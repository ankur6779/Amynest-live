import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getCountryRoutineProfile,
  normalizeCountryCode,
  getCountryLabelPack,
} from "./routine-country-profile.js";
import { buildRoutineContext } from "./routine-context-builder.js";
import { deriveBehavioralState } from "./routine-context-engine.js";
import { generateRoutineFromState, validateAgainstCountryProfile } from "./routine-decision-engine.js";
import { parseTimeToMins } from "./routine-scheduler.js";

describe("getCountryRoutineProfile", () => {
  it("maps aliases to launch countries", () => {
    assert.equal(normalizeCountryCode("United States"), "US");
    assert.equal(normalizeCountryCode("UAE"), "AE");
    assert.equal(normalizeCountryCode("New Zealand"), "NZ");
  });

  it("USA has early dinner and high extracurricular culture", () => {
    const p = getCountryRoutineProfile("US");
    assert.equal(p.extracurricularCulture, "high");
    assert.equal(p.independenceLevel, "high");
    assert.ok(p.dinnerWindow[1] <= 19 * 60);
    assert.ok(p.sleepWindow[1] <= 21 * 60 + 30);
  });

  it("India has late dinner and high academic intensity", () => {
    const p = getCountryRoutineProfile("IN");
    assert.equal(p.academicIntensity, "high");
    assert.equal(p.independenceLevel, "low");
    assert.ok(p.dinnerWindow[0] >= 20 * 60);
  });

  it("UAE has late dinner and low outdoor preference", () => {
    const p = getCountryRoutineProfile("AE");
    assert.equal(p.outdoorPreference, "low");
    assert.ok(p.dinnerWindow[0] >= 20 * 60);
  });

  it("Australia has high outdoor preference", () => {
    const p = getCountryRoutineProfile("AU");
    assert.equal(p.outdoorPreference, "high");
  });
});

describe("cultural routine generation", () => {
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
  };

  it("US adds extracurricular before dinner when missing", () => {
    const ctx = buildRoutineContext({ country: "US", hasSchool: true, weatherOutdoor: "yes" });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    const { items } = generateRoutineFromState(baseItems, state, opts);
    assert.ok(
      items.some((i) => /soccer|sports|club/i.test(i.activity)),
      `activities: ${items.map((i) => i.activity).join(", ")}`,
    );
    assert.ok(items.some((i) => i.culturalTag?.includes("extracurricular")));
  });

  it("Australia adds outdoor block when weather allows", () => {
    const ctx = buildRoutineContext({ country: "AU", weatherOutdoor: "yes", hasSchool: true });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    const { items } = generateRoutineFromState(baseItems, state, opts);
    assert.ok(
      items.some((i) => i.culturalTag?.includes("outdoor") || i.category === "outdoor"),
    );
  });

  it("India localizes study label to tuition", () => {
    const items = [
      ...baseItems.slice(0, 3),
      { time: "16:00", activity: "Homework", duration: 45, category: "study" },
      ...baseItems.slice(3),
    ];
    const ctx = buildRoutineContext({ country: "IN", weatherOutdoor: "yes", hasSchool: true });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    const { items: out } = generateRoutineFromState(items, state, opts);
    assert.ok(out.some((i) => /tuition|study time/i.test(i.activity)));
  });

  it("UK rainy day prefers indoor creative label", () => {
    const ctx = buildRoutineContext({ country: "UK", weatherOutdoor: "no" });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    assert.equal(state.preferIndoorCreative, true);
    const labels = getCountryLabelPack("UK");
    const { items } = generateRoutineFromState(
      [{ time: "15:00", activity: "Park play", duration: 45, category: "outdoor" }, ...baseItems],
      state,
      opts,
    );
    assert.ok(
      items.some(
        (i) =>
          i.activity.includes(labels.indoorCreative) ||
          /crafts|puzzles|indoor creative|obstacle|movement/i.test(i.activity),
      ),
    );
  });

  it("uses country dinner window in meal placement", () => {
    const ctx = buildRoutineContext({ country: "US" });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    const dinner = state.countryProfile.dinnerWindow;
    const { items } = generateRoutineFromState(baseItems, state, opts);
    const dinnerItem = items.find((i) => /\bdinner\b/i.test(i.activity));
    assert.ok(dinnerItem);
    const t = parseTimeToMins(dinnerItem!.time);
    assert.ok(t >= dinner[0] && t <= dinner[1] + 30);
  });

  it("validateAgainstCountryProfile passes for US soccer day", () => {
    const ctx = buildRoutineContext({ country: "US", hasSchool: true, weatherOutdoor: "yes" });
    const state = deriveBehavioralState(ctx, { ageGroup: "early_school" });
    const { items } = generateRoutineFromState(baseItems, state, opts);
    const warnings = validateAgainstCountryProfile(items, state);
    assert.ok(!warnings.some((w) => w.includes("missing expected extracurricular")));
  });
});
