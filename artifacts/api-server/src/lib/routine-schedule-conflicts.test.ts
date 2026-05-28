import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectScheduleConflicts,
  resolveScheduleConflicts,
} from "./routine-schedule-conflicts.js";
import { parseTimeToMins } from "./routine-scheduler.js";
import { assertFinalTimelineIntegrity } from "./routine-final-integrity.js";

const SLEEP = 21 * 60 + 30;
const WAKE = 7 * 60 + 30;

function itemEndMins(item: { time: string; duration?: number }): number {
  return parseTimeToMins(item.time) + (item.duration ?? 30);
}

describe("detectScheduleConflicts", () => {
  it("flags dinner overlap (India-style)", () => {
    const conflicts = detectScheduleConflicts([
      {
        time: "18:45",
        activity: "Quiet indoor play",
        duration: 40,
        category: "play",
        status: "pending",
      },
      { time: "19:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
      { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
    ]);
    assert.ok(conflicts.some((c) => c.kind === "meal_intrusion" || c.kind === "overlap"));
  });

  it("flags stacked evening play blocks", () => {
    const conflicts = detectScheduleConflicts([
      { time: "17:30", activity: "Outdoor play", duration: 30, category: "outdoor", status: "pending" },
      { time: "18:00", activity: "Creative play time", duration: 30, category: "creative", status: "pending" },
      { time: "18:25", activity: "Family board games", duration: 30, category: "family", status: "pending" },
      { time: "19:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
      { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
    ]);
    assert.ok(conflicts.some((c) => c.kind === "evening_stack" || c.kind === "overlap"));
  });
});

describe("resolveScheduleConflicts", () => {
  it("clears quiet play overlapping dinner", () => {
    const { items, resolutions } = resolveScheduleConflicts(
      [
        {
          time: "18:45",
          activity: "Quiet indoor play",
          duration: 40,
          category: "play",
          status: "pending",
        },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: WAKE, sleepMins: SLEEP },
    );
    assert.ok(resolutions.length > 0);
    const dinner = items.find((i) => /\bdinner\b/i.test(i.activity))!;
    const play = items.find((i) => /quiet indoor/i.test(i.activity));
    const dStart = parseTimeToMins(dinner.time);
    const dEnd = itemEndMins(dinner);
    if (play) {
      const pEnd = itemEndMins(play);
      const pStart = parseTimeToMins(play.time);
      assert.ok(
        pEnd <= dStart - 5 || pStart >= dEnd + 10,
        `play ${pStart}-${pEnd} should clear dinner ${dStart}-${dEnd}`,
      );
    }
    const integrity = assertFinalTimelineIntegrity(items, {
      wakeMins: WAKE,
      sleepMins: SLEEP,
    });
    assert.equal(integrity.passed, true, integrity.failures.join("; "));
  });

  it("shifts same-start block after dinner", () => {
    const { items } = resolveScheduleConflicts(
      [
        { time: "20:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        {
          time: "20:00",
          activity: "Outdoor play or walk",
          duration: 10,
          category: "outdoor",
          status: "pending",
        },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: WAKE, sleepMins: SLEEP },
    );
    const dinner = items.find((i) => /dinner/i.test(i.activity))!;
    const outdoor = items.find((i) => /outdoor/i.test(i.activity))!;
    assert.ok(
      parseTimeToMins(outdoor.time) >= itemEndMins(dinner) + 10,
      "outdoor should start after dinner + gap",
    );
  });

  it("reduces three stacked evening activities", () => {
    const { items, resolutions } = resolveScheduleConflicts(
      [
        { time: "17:30", activity: "Outdoor play", duration: 30, category: "outdoor", status: "pending" },
        { time: "18:00", activity: "Creative play time", duration: 30, category: "creative", status: "pending" },
        { time: "18:20", activity: "Family board games", duration: 30, category: "family", status: "pending" },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: WAKE, sleepMins: SLEEP },
    );
    const eveningPlay = items.filter(
      (i) =>
        !/\bdinner\b/i.test(i.activity) &&
        !/lights out/i.test(i.activity) &&
        parseTimeToMins(i.time) >= 17 * 60 &&
        parseTimeToMins(i.time) < 19 * 60,
    );
    assert.ok(eveningPlay.length <= 2, `expected ≤2 evening blocks, got ${eveningPlay.length}`);
    assert.ok(resolutions.some((r) => r.includes("stacked") || r.includes("shifted") || r.includes("shortened")));
  });
});
