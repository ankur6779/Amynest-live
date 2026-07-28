import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig } from "../config/index.js";
import {
  buildDayPlans,
  buildUploadTimestamp,
  getDayOfWeek,
  listDateRange,
  parseIsoDate,
  resolveSlotsForDay,
} from "./calendar-engine.js";
import { DEFAULT_WEEK_CALENDAR } from "./default-week.js";

describe("calendar engine", () => {
  it("maps ISO dates to weekdays in UTC", () => {
    assert.equal(getDayOfWeek(parseIsoDate("2026-07-27")), "monday");
    assert.equal(getDayOfWeek(parseIsoDate("2026-08-01")), "saturday");
  });

  it("lists a contiguous date range", () => {
    assert.deepEqual(listDateRange("2026-07-27", 3), [
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
    ]);
  });

  it("supports multiple slots per day and trims to videosPerDay", () => {
    const three = resolveSlotsForDay(
      DEFAULT_WEEK_CALENDAR,
      "monday",
      3,
      ["Parenting"],
    );
    assert.equal(three.length, 3);
    assert.deepEqual(
      three.map((s) => s.label),
      ["Amy Astro", "Parenting", "App Feature"],
    );

    const one = resolveSlotsForDay(
      DEFAULT_WEEK_CALENDAR,
      "monday",
      1,
      ["Parenting"],
    );
    assert.equal(one.length, 1);
    assert.equal(one[0]?.label, "Amy Astro");
  });

  it("builds day plans for a full week using config videosPerDay", () => {
    const config = loadDefaultConfig();
    const plans = buildDayPlans("2026-07-27", 7, config);
    assert.equal(plans.length, 7);
    assert.equal(plans[0]?.slots.length, 3);
    assert.equal(plans[5]?.dayOfWeek, "saturday");
    assert.equal(plans[5]?.slots.length, 2);
  });

  it("builds Asia/Kolkata upload timestamps with slot offsets", () => {
    const ts = buildUploadTimestamp("2026-07-27", "09:00", "Asia/Kolkata", 180);
    // 09:00 IST + 3h = 12:00 IST = 06:30 UTC
    assert.equal(ts, "2026-07-27T06:30:00.000Z");
  });
});
