import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  enforceOutdoorDurationLimits,
  maxOutdoorMinutesFromAqi,
  resolveOutdoorDurationCap,
} from "./routine-aqi.js";
import { parseTimeToMins } from "./routine-scheduler.js";

describe("maxOutdoorMinutesFromAqi", () => {
  it("caps at 30 minutes when AQI >= 150", () => {
    assert.equal(maxOutdoorMinutesFromAqi(150), 30);
    assert.equal(maxOutdoorMinutesFromAqi(180), 30);
  });
});

describe("enforceOutdoorDurationLimits", () => {
  it("splits long outdoor block when over AQI cap", () => {
    const { items, adjustments } = enforceOutdoorDurationLimits(
      [
        {
          time: "09:00",
          activity: "Outdoor games together",
          duration: 58,
          category: "outdoor",
          status: "pending",
        },
      ],
      { aqi: 90, country: "UK" },
    );
    const outdoor = items.find((i) => /outdoor games/i.test(i.activity))!;
    assert.ok((outdoor.duration ?? 0) <= 30);
    assert.ok(items.some((i) => /family time together/i.test(i.activity)));
    assert.ok(adjustments.length > 0);
  });

  it("limits rainy day outdoor to 10 minutes", () => {
    const { items } = enforceOutdoorDurationLimits(
      [
        {
          time: "10:00",
          activity: "Outdoor play or walk",
          duration: 25,
          category: "outdoor",
          status: "pending",
        },
      ],
      { aqi: 60, country: "US", condition: "rain" },
    );
    const outdoor = items.find((i) => /outdoor|brief outdoor/i.test(i.activity))!;
    assert.ok((outdoor.duration ?? 0) <= 10);
  });
});

describe("resolveOutdoorDurationCap", () => {
  it("returns policy cap for moderate AQI in strict country", () => {
    const cap = resolveOutdoorDurationCap(90, "US");
    assert.ok(cap != null && cap <= 45);
  });
});
