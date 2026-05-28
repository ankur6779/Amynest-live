import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyDailyLoadBalancing,
  calculateDailyLoadProfile,
  deriveDailyLoadLimits,
} from "./routine-daily-load.js";
import { parseTimeToMins } from "./routine-scheduler.js";
import { inferBlockEnergyLevel } from "./routine-category-taxonomy.js";

const WAKE = 7 * 60 + 30;
const SLEEP = 21 * 60 + 30;

describe("deriveDailyLoadLimits", () => {
  it("tightens budgets on poor sleep", () => {
    const normal = deriveDailyLoadLimits({
      wakeMins: WAKE,
      sleepMins: SLEEP,
      energyLevel: "normal",
      ageGroup: "early_school",
    });
    const poor = deriveDailyLoadLimits({
      wakeMins: WAKE,
      sleepMins: SLEEP,
      sleepQuality: "poor",
      ageGroup: "early_school",
    });
    assert.ok(poor.maxHighEnergyBlocks <= normal.maxHighEnergyBlocks);
    assert.ok(poor.maxCognitiveLoadScore < normal.maxCognitiveLoadScore);
    assert.equal(poor.pacingMode, "gentle");
  });

  it("uses recovery pacing for sick-day signals", () => {
    const limits = deriveDailyLoadLimits({
      wakeMins: WAKE,
      sleepMins: SLEEP,
      mood: "child is sick today",
      dayType: "low-energy",
    });
    assert.equal(limits.pacingMode, "recovery");
    assert.equal(limits.maxHighEnergyBlocks, 1);
  });
});

describe("calculateDailyLoadProfile", () => {
  it("detects high-energy excess and evening overstimulation", () => {
    const profile = calculateDailyLoadProfile(
      [
        { time: "08:00", activity: "Outdoor play", duration: 45, category: "outdoor", status: "pending" },
        { time: "10:00", activity: "Soccer practice", duration: 40, category: "exercise", status: "pending" },
        { time: "15:00", activity: "Dance party & movement", duration: 35, category: "play", status: "pending" },
        { time: "18:00", activity: "Indoor obstacle course", duration: 35, category: "play", status: "pending" },
        { time: "18:40", activity: "Dance party & movement", duration: 30, category: "play", status: "pending" },
        { time: "19:30", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: WAKE, sleepMins: SLEEP, ageGroup: "early_school" },
    );
    assert.ok(profile.highEnergyCount >= 3);
    assert.ok(profile.issues.some((i) => i.code === "high_energy_excess"));
    assert.ok(profile.issues.some((i) => i.code === "evening_overstimulation"));
  });

  it("flags study clustering", () => {
    const profile = calculateDailyLoadProfile(
      [
        { time: "15:00", activity: "Homework", duration: 40, category: "study", status: "pending" },
        { time: "15:35", activity: "Extra study", duration: 35, category: "study", status: "pending" },
        { time: "16:05", activity: "Learning block", duration: 30, category: "study", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: WAKE, sleepMins: SLEEP, ageGroup: "early_school", sleepQuality: "poor" },
    );
    assert.ok(profile.studyClusterMax >= 3);
    assert.ok(profile.issues.some((i) => i.code === "study_cluster"));
  });
});

describe("applyDailyLoadBalancing", () => {
  it("downgrades excess high-energy blocks after poor sleep", () => {
    const { items, adjustments, profileAfter } = applyDailyLoadBalancing(
      [
        { time: "08:00", activity: "Outdoor play", duration: 45, category: "outdoor", status: "pending" },
        { time: "10:30", activity: "Soccer practice", duration: 40, category: "exercise", status: "pending" },
        { time: "16:00", activity: "Dance party & movement", duration: 35, category: "play", status: "pending" },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      {
        wakeMins: WAKE,
        sleepMins: SLEEP,
        sleepQuality: "poor",
        ageGroup: "early_school",
      },
    );
    assert.ok(adjustments.length > 0);
    const highCount = items.filter(
      (it) => inferBlockEnergyLevel(it) === "high",
    ).length;
    assert.ok(highCount <= profileAfter.limits.maxHighEnergyBlocks);
    assert.ok(profileAfter.balanceScore >= 70);
  });

  it("calms overstimulating evening blocks", () => {
    const { items, adjustments } = applyDailyLoadBalancing(
      [
        { time: "18:40", activity: "Indoor obstacle course", duration: 35, category: "play", status: "pending" },
        { time: "19:15", activity: "Creative play time", duration: 30, category: "creative", status: "pending" },
        { time: "19:50", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      {
        wakeMins: WAKE,
        sleepMins: SLEEP,
        dayType: "low-energy",
        mood: "tired",
        ageGroup: "preschool",
      },
    );
    assert.ok(adjustments.some((a) => a.includes("evening") || a.includes("downgraded") || a.includes("calmed")));
    const eveningHigh = items.filter(
      (it) =>
        parseTimeToMins(it.time) >= 17 * 60 + 30 &&
        inferBlockEnergyLevel(it) === "high",
    );
    assert.equal(eveningHigh.length, 0);
  });
});
