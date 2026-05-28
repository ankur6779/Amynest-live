import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  adaptRoutineForEmotion,
  deriveEmotionalPacingProfile,
  inferEmotionalState,
} from "./routine-emotional-pacing.js";
import { inferBlockEnergyLevel } from "./routine-category-taxonomy.js";
import { parseTimeToMins } from "./routine-scheduler.js";

const WAKE = 7 * 60 + 30;
const SLEEP = 21 * 60 + 30;

const baseDay = [
  { time: "08:00", activity: "Outdoor play", duration: 45, category: "outdoor", status: "pending" },
  { time: "10:00", activity: "Homework", duration: 40, category: "study", status: "pending" },
  { time: "15:00", activity: "Soccer practice", duration: 40, category: "exercise", status: "pending" },
  { time: "18:30", activity: "Creative play time", duration: 30, category: "creative", status: "pending" },
  { time: "19:30", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
  { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
] as const;

describe("inferEmotionalState", () => {
  it("maps hyperactive mood", () => {
    assert.equal(
      inferEmotionalState({ wakeMins: WAKE, sleepMins: SLEEP, mood: "hyperactive and bouncy" }),
      "hyperactive",
    );
  });

  it("maps upset and sick moods", () => {
    assert.equal(
      inferEmotionalState({ wakeMins: WAKE, sleepMins: SLEEP, mood: "very upset after school" }),
      "upset",
    );
    assert.equal(
      inferEmotionalState({ wakeMins: WAKE, sleepMins: SLEEP, mood: "sick with fever" }),
      "sick",
    );
  });

  it("maps tired from poor sleep", () => {
    assert.equal(
      inferEmotionalState({
        wakeMins: WAKE,
        sleepMins: SLEEP,
        sleepQuality: "poor",
      }),
      "tired",
    );
  });
});

describe("adaptRoutineForEmotion", () => {
  it("returns unchanged for neutral mood", () => {
    const { items, adjustments, profile } = adaptRoutineForEmotion([...baseDay], {
      wakeMins: WAKE,
      sleepMins: SLEEP,
      mood: "normal",
    });
    assert.equal(profile.state, "neutral");
    assert.equal(adjustments.length, 0);
    assert.equal(items.length, baseDay.length);
  });

  it("softens upset day — fewer high-energy blocks and shorter study", () => {
    const { items, adjustments, profile } = adaptRoutineForEmotion([...baseDay], {
      wakeMins: WAKE,
      sleepMins: SLEEP,
      mood: "upset and frustrated",
      seed: 42,
    });
    assert.equal(profile.state, "upset");
    assert.equal(profile.flowPattern, "co_regulate");
    assert.ok(adjustments.length > 0);
    const highCount = items.filter(
      (it) => inferBlockEnergyLevel(it) === "high",
    ).length;
    assert.ok(highCount <= profile.maxHighEnergyBlocks);
    const homework = items.find((i) => /homework/i.test(i.activity));
    assert.ok(
      !homework || (homework.duration ?? 40) <= 35,
      "study should be shortened or softened",
    );
  });

  it("channels hyperactive mood with morning-oriented adjustment", () => {
    const { adjustments, profile } = adaptRoutineForEmotion(
      [
        { time: "08:30", activity: "Quiet puzzles", duration: 30, category: "creative", status: "pending" },
        { time: "10:00", activity: "Homework", duration: 35, category: "study", status: "pending" },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: WAKE, sleepMins: SLEEP, mood: "hyperactive", seed: 7 },
    );
    assert.equal(profile.state, "hyperactive");
    assert.equal(profile.flowPattern, "energize_early");
    assert.ok(
      adjustments.some((a) => /morning|movement|channel/i.test(a.change)),
    );
  });

  it("inserts connection window for emotional mood when gap allows", () => {
    const { items, profile } = adaptRoutineForEmotion(
      [
        { time: "08:00", activity: "Breakfast", duration: 30, category: "meal", status: "pending" },
        { time: "09:00", activity: "At school", duration: 360, category: "school", status: "pending" },
        { time: "16:00", activity: "Homework", duration: 30, category: "study", status: "pending" },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      {
        wakeMins: WAKE,
        sleepMins: SLEEP,
        mood: "emotional and sensitive",
        seed: 11,
      },
    );
    assert.equal(profile.state, "emotional");
    assert.ok(
      items.some((i) =>
        /\b(family time|connection|check-in)\b/i.test(i.activity),
      ),
    );
  });

  it("applies gentle recovery pacing for sick mood", () => {
    const profile = deriveEmotionalPacingProfile({
      wakeMins: WAKE,
      sleepMins: SLEEP,
      mood: "sick today",
    });
    assert.equal(profile.state, "sick");
    assert.equal(profile.flowPattern, "gentle_recovery");
    assert.ok(profile.durationFactor < 0.8);
    assert.equal(profile.maxHighEnergyBlocks, 1);
  });

  it("tags schedule decisions for explainability", () => {
    const { items } = adaptRoutineForEmotion([...baseDay], {
      wakeMins: WAKE,
      sleepMins: SLEEP,
      mood: "tired",
      seed: 3,
    });
    assert.ok(
      items.some((i) =>
        i.scheduleDecision?.reason?.toLowerCase().includes("emotion"),
      ),
    );
  });
});
