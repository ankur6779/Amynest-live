import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSpecialEventScheduleItem,
  injectSpecialEventBlock,
  parseSpecialPlans,
  stripHandlerSegments,
  validateSpecialEventPlacement,
} from "./routine-special-event.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import { parseTimeToMins } from "./routine-scheduler.js";

describe("parseSpecialPlans", () => {
  it("returns skipped debug when empty", () => {
    const { event, debug } = parseSpecialPlans("");
    assert.equal(event, null);
    assert.equal(debug.eventDetected, false);
    assert.equal(debug.eventPlacementStatus, "skipped");
  });

  it("parses doctor appointment at explicit time", () => {
    const { event, debug } = parseSpecialPlans("Doctor at 10:30am", {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
    });
    assert.ok(event);
    assert.equal(event.type, "doctor");
    assert.equal(event.startMins, 10 * 60 + 30);
    assert.equal(debug.eventDetected, true);
    assert.equal(debug.eventTime, "10:30");
    assert.equal(debug.eventPlacementStatus, "success");
  });

  it("infers evening time for birthday without clock", () => {
    const { event } = parseSpecialPlans("Emma's birthday party", {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
    });
    assert.ok(event);
    assert.equal(event.type, "birthday");
    assert.equal(event.timeSource, "inferred");
    assert.ok(event.startMins >= 17 * 60);
  });

  it("infers morning-ish time for doctor without clock", () => {
    const { event } = parseSpecialPlans("Pediatric check-up", {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
    });
    assert.ok(event);
    assert.equal(event.type, "doctor");
    assert.equal(event.timeSource, "inferred");
    assert.ok(event.startMins < 12 * 60);
  });

  it("strips caregiver handler segments from pipe-delimited plans", () => {
    const cleaned = stripHandlerSegments(
      "Soccer class at 4pm | Today is being handled by grandparent",
    );
    assert.equal(cleaned, "Soccer class at 4pm");
    const { event } = parseSpecialPlans(cleaned, { wakeMins: 7 * 60, sleepMins: 21 * 60 });
    assert.ok(event);
    assert.equal(event.type, "class");
    assert.equal(event.startMins, 16 * 60);
  });
});

describe("injectSpecialEventBlock", () => {
  it("adds locked block and removes naive duplicate", () => {
    const { event } = parseSpecialPlans("Doctor at 2pm", {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
    });
    assert.ok(event);
    const base: RoutineScheduleItem[] = [
      {
        time: "14:00",
        activity: "Doctor at 2pm",
        duration: 30,
        category: "play",
        status: "pending",
      },
    ];
    const out = injectSpecialEventBlock(base, event);
    const locked = out.filter((i) => i.locked);
    assert.equal(locked.length, 1);
    assert.equal(locked[0]!.culturalTag, "special_event");
    assert.match(locked[0]!.activity, /doctor/i);
  });

  it("buildSpecialEventScheduleItem sets locked flag", () => {
    const { event } = parseSpecialPlans("Zoo outing at 5pm", {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
    });
    assert.ok(event);
    const item = buildSpecialEventScheduleItem(event);
    assert.equal(item.locked, true);
    assert.equal(item.time, "17:00");
  });
});

describe("validateSpecialEventPlacement", () => {
  it("flags school overlap as fallback", () => {
    const { event } = parseSpecialPlans("Doctor at 10am", {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
    });
    assert.ok(event);
    const items: RoutineScheduleItem[] = [
      buildSpecialEventScheduleItem(event),
      {
        time: "09:00",
        activity: "School Time",
        duration: 360,
        category: "school",
        status: "pending",
      },
    ];
    const debug = validateSpecialEventPlacement(items, event, {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
      schoolStartMins: 9 * 60,
      schoolEndMins: 15 * 60,
      hasSchool: true,
    });
    assert.equal(debug.eventDetected, true);
    assert.equal(debug.eventPlacementStatus, "fallback");
    assert.ok(debug.validationWarnings.some((w) => w.includes("school")));
  });

  it("reports success when event is present and clear", () => {
    const { event } = parseSpecialPlans("Birthday party at 6pm", {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
    });
    assert.ok(event);
    const items = [buildSpecialEventScheduleItem(event)];
    const debug = validateSpecialEventPlacement(items, event, {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
      hasSchool: false,
    });
    assert.equal(debug.eventPlacementStatus, "success");
    assert.equal(parseTimeToMins(debug.eventTime!), event.startMins);
  });
});
