import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyWeatherAdjustment,
  type WeatherAdjustableItem,
} from "./weather.js";

const items: WeatherAdjustableItem[] = [
  { time: "7:00 AM", activity: "Wake & Brush", duration: 15, category: "morning" },
  { time: "8:00 AM", activity: "Outdoor Play at Park", duration: 60, category: "play" },
  { time: "9:30 AM", activity: "Morning Walk", duration: 30, category: "play" },
  { time: "10:30 AM", activity: "Indoor Reading", duration: 30, category: "study" },
  { time: "11:00 AM", activity: "Cycling around block", duration: 40, category: "outdoor" },
  { time: "12:00 PM", activity: "Lunch", duration: 30, category: "meal" },
];

describe("applyWeatherAdjustment", () => {
  it("returns input unchanged when weather is friendly", () => {
    const out = applyWeatherAdjustment(items, "yes");
    assert.equal(out, items);
  });

  it("swaps outdoor activities for indoor when weather is bad", () => {
    const out = applyWeatherAdjustment(items, "no");
    // Park play swapped
    assert.notEqual(out[1].activity, items[1].activity);
    assert.match(out[1].activity, /indoor/i);
    assert.equal(out[1].category, "play");
    assert.match(out[1]!.notes ?? "", /indoor/i);
    // Walk swapped
    assert.match(out[2].activity, /indoor/i);
    // Cycling swapped (outdoor category)
    assert.match(out[4].activity, /indoor/i);
    // Untouched items pass through by reference
    assert.equal(out[0], items[0]);
    assert.equal(out[3], items[3]);
    assert.equal(out[5], items[5]);
    // Duration preserved on swap
    assert.equal(out[1].duration, items[1].duration);
  });

  it("halves duration and appends backup note when weather is limited", () => {
    const out = applyWeatherAdjustment(items, "limited");
    // Park play halved (60 → 30)
    assert.equal(out[1].duration, 30);
    assert.match(out[1]!.notes ?? "", /indoor backup/i);
    // Activity name preserved
    assert.equal(out[1].activity, items[1].activity);
    // Cycling halved (40 → 20)
    assert.equal(out[4].duration, 20);
    // Non-outdoor items pass through
    assert.equal(out[0], items[0]);
    assert.equal(out[3], items[3]);
  });

  it("respects 10-minute floor on limited weather", () => {
    const tiny: WeatherAdjustableItem[] = [
      { time: "8:00 AM", activity: "Quick park run", duration: 12, category: "play" },
    ];
    const out = applyWeatherAdjustment(tiny, "limited");
    assert.equal(out[0].duration, 10);
  });

  it("does not mutate the input array", () => {
    const before = JSON.stringify(items);
    applyWeatherAdjustment(items, "no");
    applyWeatherAdjustment(items, "limited");
    assert.equal(JSON.stringify(items), before);
  });
});
