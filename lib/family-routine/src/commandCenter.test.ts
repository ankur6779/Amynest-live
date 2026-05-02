import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildTimeline,
  buildSuggestions,
  computeCommandCenter,
  parseClockTimeMins,
} from "./commandCenter";
import type { AdaptiveItem } from "./adaptive";

const item = (
  time: string,
  activity: string,
  duration = 30,
  status: AdaptiveItem["status"] = "pending",
  category = "play",
): AdaptiveItem => ({ time, activity, duration, category, status });

describe("parseClockTimeMins", () => {
  it("parses 12-hour clock times", () => {
    assert.equal(parseClockTimeMins("7:00 AM"), 7 * 60);
    assert.equal(parseClockTimeMins("12:00 PM"), 12 * 60);
    assert.equal(parseClockTimeMins("12:30 AM"), 30);
    assert.equal(parseClockTimeMins("1:15 PM"), 13 * 60 + 15);
  });
  it("parses 24-hour clock times", () => {
    assert.equal(parseClockTimeMins("08:00"), 8 * 60);
    assert.equal(parseClockTimeMins("23:45"), 23 * 60 + 45);
  });
  it("returns -1 on garbage input", () => {
    assert.equal(parseClockTimeMins(""), -1);
    assert.equal(parseClockTimeMins("not a time"), -1);
    assert.equal(parseClockTimeMins("25:00"), -1);
  });
});

describe("buildTimeline", () => {
  const items: AdaptiveItem[] = [
    item("7:00 AM", "Wake"),
    item("9:00 AM", "Play"),
    item("12:00 PM", "Lunch", 30, "pending", "meal"),
    item("1:30 PM", "Nap"),
    item("4:00 PM", "Snack", 15, "pending", "meal"),
  ];

  it("sorts items chronologically and preserves indexes", () => {
    const reversed = [...items].reverse();
    const tl = buildTimeline(reversed, undefined);
    assert.deepEqual(
      tl.map((e) => e.activity),
      ["Wake", "Play", "Lunch", "Nap", "Snack"],
    );
    // Index points back into the *input* array so the UI can mutate the right item.
    assert.equal(tl[0].index, 4);
    assert.equal(tl[4].index, 0);
  });

  it("flags the first pending step as 'current' when nowMins is omitted", () => {
    const tl = buildTimeline(items, undefined);
    assert.equal(tl.filter((e) => e.current).length, 1);
    assert.equal(tl.filter((e) => e.next).length, 1);
    assert.equal(tl.find((e) => e.current)?.activity, "Wake");
    assert.equal(tl.find((e) => e.next)?.activity, "Play");
  });

  it("picks the in-progress step as 'current' and the next pending as 'next'", () => {
    // 9:30 AM — Play (9:00–9:30) is in-progress, Lunch (12:00) is next.
    const tl = buildTimeline(items, 9 * 60 + 15);
    assert.equal(tl.find((e) => e.current)?.activity, "Play");
    assert.equal(tl.find((e) => e.next)?.activity, "Lunch");
  });

  it("uses the next upcoming pending step when nothing is in-progress", () => {
    // 11:00 AM — between Play and Lunch. Lunch should be current.
    const tl = buildTimeline(items, 11 * 60);
    assert.equal(tl.find((e) => e.current)?.activity, "Lunch");
    assert.equal(tl.find((e) => e.next)?.activity, "Nap");
  });

  it("never flags completed/skipped/delayed items as current or next", () => {
    const mixed: AdaptiveItem[] = [
      item("7:00 AM", "Wake", 30, "completed"),
      item("9:00 AM", "Play", 30, "skipped"),
      item("11:00 AM", "Reading"),
      item("12:00 PM", "Lunch", 30, "pending", "meal"),
    ];
    const tl = buildTimeline(mixed, 7 * 60 + 15);
    assert.equal(tl.find((e) => e.current)?.activity, "Reading");
    assert.equal(tl.find((e) => e.next)?.activity, "Lunch");
    assert.equal(tl.filter((e) => e.current || e.next).length, 2);
  });

  it("returns an empty timeline for empty inputs", () => {
    assert.deepEqual(buildTimeline([], undefined), []);
  });

  it("returns no current/next when every item is finished", () => {
    const allDone: AdaptiveItem[] = [
      item("7:00 AM", "Wake", 30, "completed"),
      item("9:00 AM", "Play", 30, "completed"),
    ];
    const tl = buildTimeline(allDone, 10 * 60);
    assert.equal(tl.filter((e) => e.current).length, 0);
    assert.equal(tl.filter((e) => e.next).length, 0);
  });
});

describe("buildSuggestions", () => {
  const base = {
    qualityMinutes: 30,
    sleepQuality: "good" as const,
    mood: "neutral" as const,
    routinePct: 70,
    totalItems: 5,
    delayedCount: 0,
  };

  it("ranks 'simplify today' first when 2+ tasks are delayed", () => {
    const out = buildSuggestions({ ...base, delayedCount: 3 });
    assert.equal(out[0].id, "simplify-today");
    assert.equal(out[0].actionId, "simplify-today");
  });

  it("suggests wind-down when sleep is poor", () => {
    const out = buildSuggestions({ ...base, sleepQuality: "poor" });
    const winddown = out.find((s) => s.id === "wind-down");
    assert.ok(winddown, "should include wind-down chip");
    assert.equal(winddown!.actionId, "improve-sleep");
  });

  it("suggests calming tools when mood is low", () => {
    const out = buildSuggestions({ ...base, mood: "low" });
    const calm = out.find((s) => s.id === "calm-tools");
    assert.ok(calm);
    assert.equal(calm!.actionId, "calm-child");
  });

  it("suggests a 10-min play when quality time is light", () => {
    const out = buildSuggestions({ ...base, qualityMinutes: 0 });
    const play = out.find((s) => s.id === "start-play");
    assert.ok(play, "should include play chip");
  });

  it("returns no chips when everything looks fine", () => {
    const out = buildSuggestions(base);
    assert.deepEqual(out, []);
  });

  it("suggests evening wrap-up when the day is incomplete late in the day", () => {
    const out = buildSuggestions({ ...base, hour: 19, routinePct: 30 });
    assert.ok(out.some((s) => s.id === "simplify-today"));
  });

  it("orders by urgency descending", () => {
    const out = buildSuggestions({
      ...base,
      delayedCount: 3,        // 95
      sleepQuality: "poor",   // 85
      mood: "low",            // 75
      qualityMinutes: 0,      // 60
    });
    // simplify (95) > wind-down (85) > calm-tools (75) > plan-nap (70) > start-play (60)
    assert.deepEqual(out.map((s) => s.id), ["simplify-today", "wind-down", "calm-tools", "plan-nap", "start-play"]);
  });
});

describe("computeCommandCenter", () => {
  it("returns a non-empty timeline + (when triggered) suggestions", () => {
    const result = computeCommandCenter({
      childName: "Test",
      items: [
        item("7:00 AM", "Wake"),
        item("9:00 AM", "Play"),
      ],
      positiveBehaviorsToday: 0,
      negativeBehaviorsToday: 0,
      mood: "low",
      sleepQuality: "poor",
      nowMins: 8 * 60,
    });
    assert.equal(result.timeline.length, 2);
    assert.ok(result.suggestions.length > 0, "expected suggestions to fire for low mood + poor sleep");
    // Backward-compat — original fields stay populated.
    assert.equal(result.actions.length, 5);
    assert.equal(typeof result.overview.routineCompletionPct, "number");
  });
});
