import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTo24h,
  parseTimeToMins,
  computeDayBounds,
  getTimePeriod,
  isCategoryAllowedAt,
  clampDurationForCategory,
  enforceActivityContext,
  diversifyActivityOrder,
  scheduleRoutineItems,
  validateRoutineSchedule,
  hardValidateSchedule,
  resolveRoutineSchedule,
  generateSafeRoutineTemplate,
  itemsToScheduledBlocks,
} from "./routine-scheduler.js";

describe("normalizeTo24h / parseTimeToMins", () => {
  it("converts AM/PM to minutes", () => {
    assert.equal(parseTimeToMins("7:00 AM"), 420);
    assert.equal(parseTimeToMins("10:30 PM"), 1350);
    assert.equal(normalizeTo24h("7:00 AM"), "07:00");
  });

  it("parses 24-hour directly", () => {
    assert.equal(parseTimeToMins("07:30"), 450);
    assert.equal(parseTimeToMins("22:15"), 1335);
  });
});

describe("computeDayBounds cross-midnight", () => {
  it("extends sleep past midnight", () => {
    const b = computeDayBounds("22:00", "06:00");
    assert.equal(b.wakeMins, 22 * 60);
    assert.equal(b.sleepMins, 6 * 60);
    assert.equal(b.endExt, 6 * 60 + 1440);
    assert.equal(b.windowMins, b.endExt - b.wakeMins);
    assert.ok(b.windowMins >= MIN_WINDOW());
  });

  function MIN_WINDOW() {
    return 6 * 60;
  }

  it("same-day window", () => {
    const b = computeDayBounds("07:00", "21:00");
    assert.equal(b.windowMins, 14 * 60);
  });
});

describe("enforceActivityContext", () => {
  it("shifts study away from after 21:00", () => {
    const fixed = enforceActivityContext(21 * 60 + 15, {
      time: "",
      activity: "Homework",
      duration: 45,
      category: "study",
    });
    assert.ok(fixed < 21 * 60);
  });

  it("shifts play away from after 22:00", () => {
    const fixed = enforceActivityContext(22 * 60 + 10, {
      time: "",
      activity: "Outdoor play",
      duration: 45,
      category: "play",
    });
    assert.ok(fixed < 22 * 60);
  });

  it("clamps breakfast into morning window", () => {
    const fixed = enforceActivityContext(11 * 60, {
      time: "",
      activity: "Breakfast",
      duration: 30,
      category: "meal",
    });
    assert.ok(fixed <= 10 * 60);
  });
});

describe("diversifyActivityOrder", () => {
  it("breaks three consecutive study blocks", () => {
    const items = [
      { time: "", activity: "Study 1", duration: 30, category: "study" },
      { time: "", activity: "Study 2", duration: 30, category: "study" },
      { time: "", activity: "Study 3", duration: 30, category: "study" },
      { time: "", activity: "Play", duration: 30, category: "play" },
    ];
    const out = diversifyActivityOrder(items);
    let run = 0;
    let maxRun = 0;
    let last = "";
    for (const it of out) {
      const g = it.category;
      run = g === last ? run + 1 : 1;
      maxRun = Math.max(maxRun, run);
      last = g;
    }
    assert.ok(maxRun <= 2, `max consecutive run ${maxRun}`);
  });
});

describe("scheduleRoutineItems", () => {
  const items = [
    { time: "00:00", activity: "Wake", duration: 30, category: "morning_routine" },
    { time: "08:00", activity: "Study", duration: 60, category: "study" },
    { time: "12:00", activity: "Play", duration: 45, category: "play" },
    { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
  ];

  it("starts first activity at wake", () => {
    const out = scheduleRoutineItems(items, {
      wakeUpTime: "07:00",
      sleepTime: "21:00",
      ageGroup: "early_school",
    });
    const first = out.find((i) => i.category !== "sleep")!;
    assert.equal(parseTimeToMins(first.time), 7 * 60);
  });

  it("anchors sleep at sleep time", () => {
    const out = scheduleRoutineItems(items, {
      wakeUpTime: "07:00",
      sleepTime: "21:00",
      ageGroup: "early_school",
    });
    const sleep = out.find((i) => i.category === "sleep")!;
    assert.equal(parseTimeToMins(sleep.time), 21 * 60);
  });

  it("outputs strict HH:MM without AM/PM", () => {
    const out = scheduleRoutineItems(items, {
      wakeUpTime: "07:00",
      sleepTime: "21:00",
      ageGroup: "early_school",
    });
    for (const it of out) {
      assert.match(it.time, /^\d{2}:\d{2}$/);
      assert.doesNotMatch(it.time, /AM|PM/i);
    }
  });
});

describe("hardValidateSchedule", () => {
  it("rejects window shorter than 6 hours", () => {
    const r = hardValidateSchedule(
      [
        { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine" },
        { time: "10:00", activity: "Sleep", duration: 30, category: "sleep" },
      ],
      "07:00",
      "10:00",
    );
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => e.includes("window")));
  });

  it("rejects activity under 10 minutes", () => {
    const r = hardValidateSchedule(
      [
        { time: "07:00", activity: "Wake", duration: 5, category: "morning_routine" },
        { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
      ],
      "07:00",
      "21:00",
    );
    assert.equal(r.valid, false);
  });

  it("accepts valid routine", () => {
    const items = scheduleRoutineItems(
      [
        { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine" },
        { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
        { time: "10:00", activity: "Study", duration: 45, category: "study" },
        { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
      ],
      { wakeUpTime: "07:00", sleepTime: "21:00", ageGroup: "early_school" },
    );
    const r = hardValidateSchedule(items, "07:00", "21:00");
    assert.equal(r.valid, true, r.errors.join("; "));
  });
});

describe("resolveRoutineSchedule recovery", () => {
  it("never returns a broken schedule for invalid input", () => {
    const broken = [
      { time: "07:00", activity: "A", duration: 3, category: "play" },
      { time: "07:01", activity: "B", duration: 3, category: "play" },
      { time: "07:02", activity: "C", duration: 3, category: "play" },
      { time: "07:03", activity: "D", duration: 3, category: "play" },
      { time: "07:04", activity: "E", duration: 3, category: "play" },
    ];
    const r = resolveRoutineSchedule(broken, {
      wakeUpTime: "07:00",
      sleepTime: "21:00",
      ageGroup: "early_school",
    });
    assert.ok(r.items.length >= 5);
    const hard = hardValidateSchedule(r.items, "07:00", "21:00");
    assert.equal(hard.valid, true, hard.errors.join("; "));
    const sleep = r.items.find(
      (i) => i.category === "sleep" || /bedtime|lights out/i.test(i.activity),
    );
    assert.ok(sleep);
    assert.equal(parseTimeToMins(sleep!.time), 21 * 60);
  });
});

describe("generateSafeRoutineTemplate", () => {
  it("produces a full valid day", () => {
    const items = generateSafeRoutineTemplate({
      wakeUpTime: "07:00",
      sleepTime: "21:00",
      ageGroup: "early_school",
    });
    const hard = hardValidateSchedule(items, "07:00", "21:00");
    assert.equal(hard.valid, true, hard.errors.join("; "));
  });
});

describe("validateRoutineSchedule", () => {
  it("fixes wake anchor and sleep start", () => {
    const messy = [
      { time: "08:00", activity: "Wake", duration: 30, category: "morning_routine" },
      { time: "09:00", activity: "Breakfast", duration: 30, category: "meal" },
      { time: "20:00", activity: "Bedtime", duration: 60, category: "sleep" },
    ];
    const { items } = validateRoutineSchedule(messy, "07:00", "21:00");
    const first = items.find((i) => i.category !== "sleep")!;
    assert.equal(parseTimeToMins(first.time), 7 * 60);
    const sleep = items.find((i) => i.category === "sleep")!;
    assert.equal(parseTimeToMins(sleep.time), 21 * 60);
  });
});

describe("itemsToScheduledBlocks", () => {
  it("produces start/end pairs in minutes", () => {
    const blocks = itemsToScheduledBlocks([
      { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine" },
    ]);
    assert.deepEqual(blocks[0], {
      activity: "Wake",
      start: "07:00",
      end: "07:30",
    });
    assert.equal(parseTimeToMins(blocks[0]!.end), 450);
  });
});

describe("day/night rules", () => {
  it("classifies periods", () => {
    assert.equal(getTimePeriod(6 * 60), "morning");
    assert.equal(getTimePeriod(14 * 60), "afternoon");
    assert.equal(getTimePeriod(18 * 60), "evening");
    assert.equal(getTimePeriod(22 * 60), "night");
  });

  it("blocks study at night", () => {
    assert.equal(isCategoryAllowedAt("night", "study"), false);
    assert.equal(isCategoryAllowedAt("morning", "study"), true);
  });
});

describe("clampDurationForCategory", () => {
  it("clamps study to 30–90", () => {
    assert.equal(clampDurationForCategory("study", 5), 30);
    assert.equal(clampDurationForCategory("study", 120), 90);
  });

  it("enforces minimum 10 minutes for generic blocks", () => {
    assert.equal(clampDurationForCategory("family", 3), 10);
    assert.equal(clampDurationForCategory("play", 3), 30);
  });
});
