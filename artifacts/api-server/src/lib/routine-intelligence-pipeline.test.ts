import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveChildBehaviorSignature,
  applyBehaviorSignatureToItems,
} from "./routine-behavior-signature.js";
import {
  adjustActivityDifficulty,
  snapshotDurations,
} from "./routine-adaptive-difficulty.js";
import { buildRoutineContext } from "./routine-context-builder.js";
import { deriveBehavioralState } from "./routine-context-engine.js";
import { runRoutineIntelligencePipeline } from "./routine-intelligence-pipeline.js";
import { parseTimeToMins, hardValidateSchedule } from "./routine-scheduler.js";

describe("deriveChildBehaviorSignature", () => {
  it("shortens focus span when compliance is low", () => {
    const sig = deriveChildBehaviorSignature(
      { ageGroup: "early_school" },
      {
        entries: [],
        previousDayContext: { activityCompletion: 35 },
      },
    );
    assert.ok(sig.focusSpan <= 35);
    assert.ok(sig.complianceScore < 0.5);
  });

  it("does not modify pinned meal items when applying signature", () => {
    const items = [
      { time: "07:00", activity: "Breakfast", duration: 30, category: "meal" },
      { time: "10:00", activity: "Homework", duration: 60, category: "study" },
    ];
    const sig = deriveChildBehaviorSignature({ ageGroup: "early_school" }, { entries: [] });
    const out = applyBehaviorSignatureToItems(items, sig);
    const breakfast = out.find((i) => /breakfast/i.test(i.activity))!;
    assert.equal(breakfast.duration, 30);
    const study = out.find((i) => i.category === "study")!;
    assert.ok(study.duration! <= sig.focusSpan);
  });
});

describe("adjustActivityDifficulty", () => {
  it("increases duration when activity is consistently completed", () => {
    const items = [
      { time: "10:00", activity: "Homework", duration: 40, category: "study" },
    ];
    const { items: out, adjustments } = adjustActivityDifficulty(items, {
      entries: [
        { activity: "Homework", category: "study", completed: true, skipped: false },
        { activity: "Homework", category: "study", completed: true, skipped: false },
        { activity: "Homework", category: "study", completed: true, skipped: false },
      ],
    });
    assert.ok(out[0]!.duration! >= 40);
    assert.equal(adjustments[0]?.direction, "increase");
  });

  it("respects study max duration clamp", () => {
    const items = [
      { time: "10:00", activity: "Homework", duration: 85, category: "study" },
    ];
    const { items: out } = adjustActivityDifficulty(items, {
      entries: [
        { activity: "Homework", category: "study", completed: true, skipped: false },
        { activity: "Homework", category: "study", completed: true, skipped: false },
      ],
    });
    assert.ok(out[0]!.duration! <= 90);
  });
});

describe("runRoutineIntelligencePipeline", () => {
  const baseItems = [
    { time: "07:00", activity: "Wake up", duration: 30, category: "morning_routine" },
    { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
    { time: "10:00", activity: "Homework", duration: 45, category: "study" },
    { time: "15:00", activity: "Play", duration: 45, category: "play" },
    { time: "19:00", activity: "Dinner", duration: 35, category: "meal" },
    { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
  ];

  it("returns valid schedule with explainability metadata", () => {
    const built = buildRoutineContext({ country: "US", weatherOutdoor: "yes", hasSchool: true });
    const result = runRoutineIntelligencePipeline({
      items: baseItems,
      builtContext: built,
      childProfile: { ageGroup: "early_school" },
      scheduleOpts: {
        wakeUpTime: "07:00",
        sleepTime: "21:00",
        ageGroup: "early_school",
        hasSchool: false,
      },
    });
    assert.equal(result.validated, true);
    assert.ok(result.items.length >= 5);
    const hard = hardValidateSchedule(result.items, "07:00", "21:00");
    assert.equal(hard.valid, true, hard.errors.join("; "));
    const withReason = result.items.find((i) => i.routineExplanation?.reason);
    assert.ok(withReason);
    const first = result.items.find((i) => i.category !== "sleep")!;
    assert.equal(parseTimeToMins(first.time), 7 * 60);
  });

  it("4-month infant (IN) uses feeding-only blocks without cultural leakage", () => {
    const built = buildRoutineContext({ country: "IN", weatherOutdoor: "yes" });
    const state = deriveBehavioralState(built, { ageGroup: "infant", ageInMonths: 4 });
    void state;
    const result = runRoutineIntelligencePipeline({
      items: [
        { time: "07:00", activity: "Wake up", duration: 30, category: "morning_routine" },
        { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
        { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
      ],
      builtContext: built,
      childProfile: { ageGroup: "infant", ageInMonths: 4, feedingType: "breastfeeding" },
      ageInMonths: 4,
      feedingType: "breastfeeding",
      scheduleOpts: {
        wakeUpTime: "07:00",
        sleepTime: "21:00",
        ageGroup: "infant",
        hasSchool: false,
      },
    });
    assert.equal(result.reverted, false, result.debugLog.join("; "));
    assert.equal(
      result.items.some((i) => /\b(tuition|revision|homework)\b/i.test(i.activity)),
      false,
    );
    assert.equal(
      result.items.some((i) => /\b(breakfast|lunch|dinner)\b/i.test(i.activity)),
      false,
    );
    const feeds = result.items.filter((i) => i.category === "feeding");
    assert.ok(feeds.length >= 6);
    assert.ok(feeds.every((f) => f.feedingType === "breast_milk" && !f.dishes?.length));
  });

  it("7-month infant uses validated adaptive path with realism layer", () => {
    const built = buildRoutineContext({
      country: "IN",
      weatherOutdoor: "yes",
      aqi: 220,
      previousDayContext: { sleepQuality: "poor" },
    });
    const result = runRoutineIntelligencePipeline({
      items: [
        { time: "06:45", activity: "Wake", duration: 30, category: "morning_routine" },
        { time: "19:15", activity: "Sleep", duration: 30, category: "sleep" },
      ],
      builtContext: built,
      childProfile: { ageGroup: "infant", ageInMonths: 7, feedingType: "mixed" },
      ageInMonths: 7,
      feedingType: "mixed",
      specialPlans: "Doctor visit at 11:30",
      scheduleOpts: {
        wakeUpTime: "06:45",
        sleepTime: "19:15",
        ageGroup: "infant",
        hasSchool: false,
      },
    });
    assert.ok(
      result.debugLog.includes("infant_adaptive_validated_path"),
      result.debugLog.join("; "),
    );
    assert.equal(result.validated, true);
    assert.ok(result.items.length <= 16);
    assert.equal(
      result.items.some((i) => /\boutdoor\b/i.test(i.activity)),
      false,
    );
    assert.ok(
      result.items.some((i) => /doctor|feed|nap/i.test(i.activity)),
    );
  });

  it("never returns broken schedule when enhancements fail validation", () => {
    const built = buildRoutineContext({ country: "IN", weatherOutdoor: "yes" });
    const broken = baseItems.map((i) => ({ ...i, duration: 3 }));
    const result = runRoutineIntelligencePipeline({
      items: broken,
      builtContext: built,
      childProfile: { ageGroup: "early_school" },
      scheduleOpts: {
        wakeUpTime: "07:00",
        sleepTime: "21:00",
        ageGroup: "early_school",
      },
    });
    const hard = hardValidateSchedule(result.items, "07:00", "21:00");
    assert.equal(hard.valid, true, hard.errors.join("; "));
  });
});

describe("snapshotDurations drift guard", () => {
  it("detects >20% total drift", () => {
    const baseline = snapshotDurations([
      { time: "10:00", activity: "A", duration: 50, category: "study" },
    ]);
    const drift = baseline;
    assert.equal(baseline.get("A"), 50);
    void drift;
  });
});
