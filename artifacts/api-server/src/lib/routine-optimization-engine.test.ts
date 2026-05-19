import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyDecisionEnforcedFinalPass,
  applyIndependence,
  applyRoutineOptimizationEngine,
  applySchoolMealMode,
  enforceDiet,
  enforceDinner,
  enforceOutdoor,
  enforceStudyBlock,
  fixAfterSchoolEnergy,
  fixMorningFlow,
  fixUKDinner,
  limitChores,
  optimizeStudyBlocks,
  removeFridgeArtifacts,
  validateMealLabels,
  validateRoutineStrict,
} from "./routine-optimization-engine.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import { parseTimeToMins } from "./routine-scheduler.js";

// ─── Shared test fixtures ─────────────────────────────────────────────────
function mkItem(
  overrides: Partial<RoutineScheduleItem> & {
    time: string;
    activity: string;
    duration: number;
    category: string;
  },
): RoutineScheduleItem {
  return { status: "pending", ...overrides };
}

describe("fixMorningFlow", () => {
  it("lightens wake-up nutrition when heavy food appears in notes", () => {
    const { items, adaptations } = fixMorningFlow([
      {
        time: "07:00",
        activity: "Wake-up Nutrition",
        duration: 15,
        category: "meal",
        status: "pending",
        notes: "Options: Stuffed paratha with curd | Upma",
      },
      {
        time: "08:00",
        activity: "Breakfast",
        duration: 25,
        category: "meal",
        status: "pending",
      },
    ]);
    assert.ok(adaptations.length > 0);
    assert.match(items[0]!.notes ?? "", /light only/i);
    assert.match(items[1]!.notes ?? "", /proper morning meal/i);
  });
});

describe("fixAfterSchoolEnergy", () => {
  it("converts heavy after-school meal to light refuel", () => {
    const { items, adaptations } = fixAfterSchoolEnergy(
      [
        {
          time: "14:00",
          activity: "School Time",
          duration: 360,
          category: "school",
          status: "pending",
        },
        {
          time: "15:30",
          activity: "After-School Snack",
          duration: 20,
          category: "meal",
          status: "pending",
          notes: "Rajma chawal with salad",
        },
        {
          time: "19:30",
          activity: "Dinner",
          duration: 35,
          category: "meal",
          status: "pending",
        },
      ],
      { isSchoolDay: true, wakeMins: 7 * 60, sleepMins: 21 * 60, schoolEndMins: 14 * 60 },
    );
    assert.ok(adaptations.length > 0);
    const refuel = items.find((i) => /refuel/i.test(i.activity));
    assert.ok(refuel);
    assert.match(refuel!.notes ?? "", /light refuel/i);
    const dinner = items.find((i) => /dinner/i.test(i.activity));
    assert.match(dinner!.notes ?? "", /rajma|evening main/i);
  });
});

describe("optimizeStudyBlocks", () => {
  it("caps homework on school days to 25 minutes", () => {
    const { items } = optimizeStudyBlocks(
      [
        {
          time: "16:00",
          activity: "Homework & Study",
          duration: 60,
          category: "homework",
          status: "pending",
        },
      ],
      { isSchoolDay: true, isWeekendDay: false, wakeMins: 7 * 60, sleepMins: 21 * 60 },
    );
    assert.ok((items[0]!.duration ?? 0) <= 25);
    assert.match(items[0]!.notes ?? "", /20 min/i);
  });
});

describe("limitChores", () => {
  it("keeps only one chore block", () => {
    const { items } = limitChores([
      {
        time: "17:00",
        activity: "Home Responsibility Task",
        duration: 25,
        category: "play",
        status: "pending",
      },
      {
        time: "17:30",
        activity: "Home Responsibility Task",
        duration: 20,
        category: "play",
        status: "pending",
      },
    ]);
    assert.equal(items.filter((i) => /responsibility/i.test(i.activity)).length, 1);
    assert.ok((items[0]!.duration ?? 0) <= 20);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Decision-enforced layer (10 hard rules)
// ════════════════════════════════════════════════════════════════════════════

describe("enforceStudyBlock", () => {
  it("inserts a 30-min study block for age 6 with high academic intensity", () => {
    const { items, adaptations } = enforceStudyBlock(
      [
        mkItem({ time: "08:00", activity: "School", duration: 360, category: "school" }),
        mkItem({ time: "14:30", activity: "Snack", duration: 15, category: "meal" }),
        mkItem({ time: "19:30", activity: "Dinner", duration: 30, category: "meal" }),
        mkItem({ time: "21:00", activity: "Lights out", duration: 30, category: "sleep" }),
      ],
      6,
      "high",
      true,
      { schoolEndMins: 14 * 60, sleepMins: 21 * 60 },
    );
    const study = items.find((i) => i.category === "study");
    assert.ok(study, "study block was not inserted");
    assert.equal(study!.duration, 30);
    assert.ok(adaptations.some((a) => /30-min study block/.test(a)));
  });

  it("expands existing study block to 90 min for age 14 high intensity", () => {
    const { items } = enforceStudyBlock(
      [
        mkItem({
          time: "16:00",
          activity: "Homework",
          duration: 15,
          category: "study",
        }),
      ],
      14,
      "high",
      true,
      { schoolEndMins: 15 * 60, sleepMins: 22 * 60 },
    );
    const study = items.find((i) => i.category === "study")!;
    assert.equal(study.duration, 90);
    assert.match(study.notes ?? "", /Focus 20 min/);
  });

  it("no-ops on non-school day", () => {
    const before = [mkItem({ time: "10:00", activity: "Free play", duration: 30, category: "play" })];
    const { items, adaptations } = enforceStudyBlock(before, 10, "medium", false);
    assert.deepEqual(items, before);
    assert.equal(adaptations.length, 0);
  });

  it("is idempotent (running twice produces identical result)", () => {
    const seed = [
      mkItem({ time: "16:00", activity: "Homework", duration: 60, category: "study" }),
    ];
    const a = enforceStudyBlock(seed, 10, "high", true, {});
    const b = enforceStudyBlock(a.items, 10, "high", true, {});
    assert.deepEqual(b.items, a.items);
  });
});

describe("enforceDinner", () => {
  it("inserts a dinner if missing", () => {
    const { items, adaptations } = enforceDinner(
      [mkItem({ time: "21:00", activity: "Lights out", duration: 30, category: "sleep" })],
      [19 * 60, 21 * 60],
      21 * 60,
    );
    assert.equal(items.filter((i) => /dinner/i.test(i.activity)).length, 1);
    assert.ok(adaptations.some((a) => /dinner missing/.test(a)));
  });

  it("clamps dinner into window", () => {
    const { items } = enforceDinner(
      [
        mkItem({ time: "16:30", activity: "Dinner", duration: 30, category: "meal" }),
        mkItem({ time: "21:00", activity: "Lights out", duration: 30, category: "sleep" }),
      ],
      [18 * 60, 20 * 60],
      21 * 60,
    );
    const d = items.find((i) => /dinner/i.test(i.activity))!;
    assert.equal(parseTimeToMins(d.time), 18 * 60);
  });

  it("removes duplicate dinner blocks (keeps the one with dishes)", () => {
    const { items, adaptations } = enforceDinner(
      [
        mkItem({ time: "18:30", activity: "Dinner", duration: 30, category: "meal" }),
        {
          ...mkItem({ time: "19:30", activity: "Dinner", duration: 30, category: "meal" }),
          dishes: ["Khichdi"],
        } as RoutineScheduleItem,
      ],
      [18 * 60, 20 * 60],
      21 * 60,
    );
    const dinners = items.filter((i) => /dinner/i.test(i.activity));
    assert.equal(dinners.length, 1);
    assert.deepEqual((dinners[0] as { dishes?: string[] }).dishes, ["Khichdi"]);
    assert.ok(adaptations.some((a) => /duplicate dinner/.test(a)));
  });

  it("removes snack scheduled after dinner", () => {
    const { items } = enforceDinner(
      [
        mkItem({ time: "19:30", activity: "Dinner", duration: 30, category: "meal" }),
        mkItem({ time: "22:00", activity: "Snack", duration: 15, category: "meal" }),
        mkItem({ time: "22:30", activity: "Lights out", duration: 30, category: "sleep" }),
      ],
      [19 * 60, 21 * 60],
      22 * 60 + 30,
    );
    assert.ok(!items.some((i) => /snack/i.test(i.activity)));
  });

  it("recovers dinner dishes attached to a social block (AU bug)", () => {
    const { items, adaptations } = enforceDinner(
      [
        {
          ...mkItem({
            time: "19:05",
            activity: "Calm play together",
            duration: 30,
            category: "social",
          }),
          dishes: ["Sausages & salad (BBQ style)"],
        } as RoutineScheduleItem,
        mkItem({ time: "21:00", activity: "Lights out", duration: 30, category: "sleep" }),
      ],
      [18 * 60, 20 * 60],
      21 * 60,
    );
    const dinner = items.find((i) => /dinner/i.test(i.activity));
    assert.ok(dinner);
    assert.equal(dinner!.category, "meal");
    assert.ok(adaptations.some((a) => /dinner recovered/i.test(a)));
  });
});

describe("enforceOutdoor", () => {
  it("inserts a 30-min outdoor block when weather=yes and temp<32", () => {
    const { items, adaptations } = enforceOutdoor(
      [mkItem({ time: "08:00", activity: "School", duration: 360, category: "school" })],
      "yes",
      24,
      { schoolEndMins: 14 * 60, sleepMins: 21 * 60 },
    );
    const out = items.find((i) => /outdoor/i.test(i.activity));
    assert.ok(out, "outdoor block missing");
    assert.equal(out!.duration, 30);
    assert.ok(adaptations.some((a) => /outdoor block/.test(a)));
  });

  it("converts outdoor → indoor when temp >= 32", () => {
    const { items, adaptations } = enforceOutdoor(
      [
        mkItem({
          time: "17:00",
          activity: "Backyard cricket",
          duration: 60,
          category: "outdoor",
        }),
      ],
      "yes",
      38,
      { sleepMins: 21 * 60 },
    );
    const item = items[0]!;
    assert.match(item.activity, /indoor/i);
    assert.ok((item.duration ?? 0) <= 30);
    assert.ok(adaptations.some((a) => /outdoor → indoor/.test(a)));
  });

  it("converts outdoor → indoor when weatherOutdoor='limited'", () => {
    const { items } = enforceOutdoor(
      [
        mkItem({
          time: "17:00",
          activity: "Park playdate",
          duration: 60,
          category: "outdoor",
        }),
      ],
      "limited",
      28,
      {},
    );
    assert.match(items[0]!.activity, /indoor/i);
  });

  it("is deterministic (same input → same output)", () => {
    const seed = [
      mkItem({ time: "08:00", activity: "School", duration: 360, category: "school" }),
    ];
    const a = enforceOutdoor(seed, "yes", 22, { schoolEndMins: 14 * 60, sleepMins: 21 * 60 });
    const b = enforceOutdoor(seed, "yes", 22, { schoolEndMins: 14 * 60, sleepMins: 21 * 60 });
    assert.deepEqual(a.items, b.items);
  });
});

describe("validateMealLabels", () => {
  it("removes Drunch placeholders", () => {
    const { items, adaptations } = validateMealLabels(
      [
        mkItem({ time: "17:50", activity: "Drunch", duration: 20, category: "meal" }),
        mkItem({ time: "20:00", activity: "Dinner", duration: 30, category: "meal" }),
      ],
      undefined,
      undefined,
    );
    assert.ok(!items.some((i) => /drunch/i.test(i.activity)));
    assert.ok(adaptations.some((a) => /Drunch/.test(a)));
  });

  it("relabels Quick Meal Before School appearing after school start", () => {
    const { items, adaptations } = validateMealLabels(
      [
        mkItem({
          time: "15:25",
          activity: "Quick Meal Before School",
          duration: 15,
          category: "meal",
        }),
      ],
      9 * 60,
      15 * 60 + 15,
    );
    assert.ok(!items.some((i) => /quick meal before school/i.test(i.activity)));
    assert.ok(items.some((i) => /refuel/i.test(i.activity)));
    assert.ok(adaptations.length > 0);
  });

  it("demotes early dinner to lunch", () => {
    const { items } = validateMealLabels(
      [mkItem({ time: "12:30", activity: "Dinner", duration: 30, category: "meal" })],
      undefined,
      undefined,
    );
    assert.ok(items.some((i) => /lunch/i.test(i.activity)));
  });
});

describe("applySchoolMealMode", () => {
  it("school_lunch: adds note to school block and removes lunch", () => {
    const { items, adaptations } = applySchoolMealMode(
      [
        mkItem({ time: "08:30", activity: "School", duration: 390, category: "school" }),
        mkItem({ time: "12:00", activity: "Lunch", duration: 30, category: "meal" }),
      ],
      "school_lunch",
      {},
    );
    const school = items.find((i) => i.category === "school")!;
    assert.match(school.notes ?? "", /Lunch at school/);
    assert.ok(!items.some((i) => /^lunch$/i.test(i.activity)));
    assert.ok(adaptations.some((a) => /lunch at school/.test(a)));
  });

  it("packed_lunch: adds tiffin note to school block", () => {
    const { items, adaptations } = applySchoolMealMode(
      [mkItem({ time: "09:00", activity: "School", duration: 360, category: "school" })],
      "packed_lunch",
      { fridgeItems: "roti, dal, fruits" },
    );
    const school = items.find((i) => i.category === "school")!;
    assert.match(school.notes ?? "", /tiffin/i);
    assert.match(school.notes ?? "", /roti/);
    assert.ok(adaptations.some((a) => /packed lunch/i.test(a)));
  });

  it("home_lunch: inserts a lunch block after school ends", () => {
    const { items, adaptations } = applySchoolMealMode(
      [mkItem({ time: "08:00", activity: "School", duration: 360, category: "school" })],
      "home_lunch",
      { schoolEndMins: 14 * 60 },
    );
    const lunch = items.find((i) => /lunch at home/i.test(i.activity));
    assert.ok(lunch);
    assert.ok(parseTimeToMins(lunch!.time) >= 14 * 60);
    assert.ok(adaptations.some((a) => /home lunch/i.test(a)));
  });

  it("unknown mode is a no-op", () => {
    const before = [mkItem({ time: "08:00", activity: "School", duration: 360, category: "school" })];
    const { items, adaptations } = applySchoolMealMode(before, "bogus", {});
    assert.deepEqual(items, before);
    assert.equal(adaptations.length, 0);
  });
});

describe("enforceDiet", () => {
  it("does NOT force veg for Indian region + diet=mixed", () => {
    const { items, adaptations } = enforceDiet(
      [
        {
          ...mkItem({ time: "20:00", activity: "Dinner", duration: 30, category: "meal" }),
          dishes: ["Khichdi", "Paratha with curd"],
        } as RoutineScheduleItem,
      ],
      "mixed",
      "indian",
      "IN",
    );
    const dinner = items[0] as RoutineScheduleItem & { dishes?: string[] };
    assert.ok(
      (dinner.dishes ?? []).some((d) => /chicken|egg|fish/i.test(d)),
      "no non-veg option added for mixed-diet Indian dinner",
    );
    assert.ok(adaptations.some((a) => /mixed-diet/.test(a)));
  });

  it("leaves vegetarian routines untouched", () => {
    const before = [
      {
        ...mkItem({ time: "20:00", activity: "Dinner", duration: 30, category: "meal" }),
        dishes: ["Khichdi"],
      } as RoutineScheduleItem,
    ];
    const { items, adaptations } = enforceDiet(before, "vegetarian", "indian", "IN");
    assert.deepEqual(items, before);
    assert.equal(adaptations.length, 0);
  });

  it("does not double-add when dinner already has non-veg option", () => {
    const before = [
      {
        ...mkItem({ time: "20:00", activity: "Dinner", duration: 30, category: "meal" }),
        dishes: ["Chicken curry"],
      } as RoutineScheduleItem,
    ];
    const { items, adaptations } = enforceDiet(before, "mixed", "indian", "IN");
    assert.deepEqual(items, before);
    assert.equal(adaptations.length, 0);
  });
});

describe("applyIndependence", () => {
  it("inserts Pack school bag + Prepare clothes for caregiver=self", () => {
    const { items, adaptations } = applyIndependence(
      [
        mkItem({ time: "19:30", activity: "Dinner", duration: 30, category: "meal" }),
        mkItem({ time: "21:00", activity: "Lights out", duration: 30, category: "sleep" }),
      ],
      "self",
      undefined,
      21 * 60,
    );
    assert.ok(items.some((i) => /pack school bag/i.test(i.activity)));
    assert.ok(items.some((i) => /prepare clothes/i.test(i.activity)));
    assert.equal(adaptations.length, 2);
  });

  it("inserts both when independenceLevel=high", () => {
    const { items } = applyIndependence(
      [mkItem({ time: "21:00", activity: "Lights out", duration: 30, category: "sleep" })],
      "mom",
      "high",
      21 * 60,
    );
    assert.ok(items.some((i) => /pack school bag/i.test(i.activity)));
    assert.ok(items.some((i) => /prepare clothes/i.test(i.activity)));
  });

  it("no-ops for mom + medium independence", () => {
    const before = [
      mkItem({ time: "21:00", activity: "Lights out", duration: 30, category: "sleep" }),
    ];
    const { items, adaptations } = applyIndependence(before, "mom", "medium", 21 * 60);
    assert.deepEqual(items, before);
    assert.equal(adaptations.length, 0);
  });
});

describe("fixUKDinner", () => {
  it("merges Tea time + Dinner into one block for UK age 6", () => {
    const { items, adaptations } = fixUKDinner(
      [
        mkItem({ time: "18:15", activity: "Tea time together", duration: 30, category: "social" }),
        {
          ...mkItem({ time: "19:30", activity: "Dinner", duration: 30, category: "meal" }),
          dishes: ["Sausage & mash"],
        } as RoutineScheduleItem,
      ],
      "british",
      "UK",
      6,
    );
    const meals = items.filter((i) => /tea|dinner/i.test(i.activity));
    assert.equal(meals.length, 1);
    assert.match(meals[0]!.activity, /Tea \/ Dinner/);
    assert.equal(meals[0]!.category, "meal");
    assert.ok(adaptations.length > 0);
  });

  it("does not merge for UK age 12 (only ≤10)", () => {
    const before = [
      mkItem({ time: "18:15", activity: "Tea time together", duration: 30, category: "social" }),
      mkItem({ time: "19:30", activity: "Dinner", duration: 30, category: "meal" }),
    ];
    const { items, adaptations } = fixUKDinner(before, "british", "UK", 12);
    assert.deepEqual(items, before);
    assert.equal(adaptations.length, 0);
  });

  it("does not merge outside UK context", () => {
    const before = [
      mkItem({ time: "18:15", activity: "Tea time together", duration: 30, category: "social" }),
      mkItem({ time: "19:30", activity: "Dinner", duration: 30, category: "meal" }),
    ];
    const { items } = fixUKDinner(before, "indian", "IN", 8);
    assert.deepEqual(items, before);
  });
});

describe("removeFridgeArtifacts", () => {
  it("removes lowercase-leading ' & '-joined wrap names", () => {
    const { items, adaptations } = removeFridgeArtifacts([
      {
        ...mkItem({ time: "15:00", activity: "After-school refuel", duration: 20, category: "meal" }),
        dishes: [
          "Dal, roti & sabzi",
          "milk & roti wrap",
          "bread & milk wrap",
          "Chole rice",
          "toast with chicken (quick plate)",
        ],
      } as RoutineScheduleItem,
    ]);
    const dishes = (items[0] as { dishes?: string[] }).dishes!;
    assert.deepEqual(dishes, ["Dal, roti & sabzi", "Chole rice"]);
    assert.ok(adaptations.some((a) => /fridge-artifact/.test(a)));
  });

  it("keeps legitimate dish names with ampersands", () => {
    const before = [
      {
        ...mkItem({ time: "20:00", activity: "Dinner", duration: 30, category: "meal" }),
        dishes: ["Beans & toast", "Fish & chips (light)", "Mac & cheese"],
      } as RoutineScheduleItem,
    ];
    const { items } = removeFridgeArtifacts(before);
    const dishes = (items[0] as { dishes?: string[] }).dishes!;
    assert.equal(dishes.length, 3);
  });
});

describe("validateRoutineStrict", () => {
  it("auto-fixes missing dinner + missing study + post-dinner snack", () => {
    const { items, violations } = validateRoutineStrict(
      [
        mkItem({ time: "08:00", activity: "School", duration: 360, category: "school" }),
        mkItem({ time: "22:00", activity: "Snack break", duration: 15, category: "meal" }),
        mkItem({ time: "22:30", activity: "Lights out", duration: 30, category: "sleep" }),
      ],
      {
        age: 14,
        isSchoolDay: true,
        schoolStartMins: 8 * 60,
        schoolEndMins: 14 * 60,
        sleepMins: 22 * 60 + 30,
        dinnerWindow: [19 * 60, 21 * 60],
        academicIntensity: "medium",
      },
    );
    assert.ok(violations.includes("missing dinner"));
    assert.ok(violations.includes("study block missing"));
    assert.ok(items.find((i) => /dinner/i.test(i.activity)));
    assert.ok(items.find((i) => i.category === "study"));
    // No snack after the now-inserted dinner.
    const dinner = items.find((i) => /dinner/i.test(i.activity))!;
    const dEnd = parseTimeToMins(dinner.time) + (dinner.duration ?? 30);
    assert.ok(!items.some((i) => /snack/i.test(i.activity) && parseTimeToMins(i.time) >= dEnd));
  });

  it("returns no violations on a clean routine", () => {
    const { violations } = validateRoutineStrict(
      [
        mkItem({ time: "07:00", activity: "Wake up", duration: 30, category: "morning_routine" }),
        mkItem({ time: "08:00", activity: "School", duration: 360, category: "school" }),
        mkItem({ time: "16:00", activity: "Homework", duration: 60, category: "study" }),
        mkItem({ time: "19:30", activity: "Dinner", duration: 30, category: "meal" }),
        mkItem({ time: "21:00", activity: "Lights out", duration: 30, category: "sleep" }),
      ],
      {
        age: 10,
        isSchoolDay: true,
        schoolStartMins: 8 * 60,
        schoolEndMins: 14 * 60,
        sleepMins: 21 * 60,
        dinnerWindow: [19 * 60, 21 * 60],
        academicIntensity: "high",
      },
    );
    assert.equal(violations.length, 0);
  });
});

describe("applyRoutineOptimizationEngine — decision-enforced integration", () => {
  it("produces the canonical adaptations footer and enforces dinner/study/outdoor", () => {
    const { items, adaptations } = applyRoutineOptimizationEngine(
      [
        mkItem({ time: "07:00", activity: "Wake up", duration: 30, category: "morning_routine" }),
        mkItem({ time: "08:00", activity: "School", duration: 360, category: "school" }),
        mkItem({ time: "22:00", activity: "Lights out", duration: 30, category: "sleep" }),
      ],
      {
        wakeMins: 7 * 60,
        sleepMins: 22 * 60,
        isSchoolDay: true,
        schoolStartMins: 8 * 60,
        schoolEndMins: 14 * 60,
        weatherOutdoor: "yes",
        temperatureC: 22,
        age: 10,
        academicIntensity: "high",
        independenceLevel: "high",
        dinnerWindow: [19 * 60, 21 * 60],
        schoolMealMode: "packed_lunch",
        diet: "mixed",
        caregiver: "self",
        region: "british",
        country: "UK",
      },
    );
    assert.ok(adaptations.some((a) => /optimized for meal timing/.test(a)));
    assert.ok(items.some((i) => /dinner/i.test(i.activity)));
    assert.ok(items.some((i) => i.category === "study"));
    assert.ok(items.some((i) => /outdoor/i.test(i.activity)));
    assert.ok(items.some((i) => /pack school bag/i.test(i.activity)));
    const school = items.find((i) => i.category === "school")!;
    assert.match(school.notes ?? "", /tiffin/i);
  });

  it("is deterministic for identical inputs", () => {
    const seed = [
      mkItem({ time: "07:00", activity: "Wake up", duration: 30, category: "morning_routine" }),
      mkItem({ time: "08:00", activity: "School", duration: 360, category: "school" }),
      mkItem({ time: "22:00", activity: "Lights out", duration: 30, category: "sleep" }),
    ];
    const opts = {
      wakeMins: 7 * 60,
      sleepMins: 22 * 60,
      isSchoolDay: true,
      schoolStartMins: 8 * 60,
      schoolEndMins: 14 * 60,
      weatherOutdoor: "yes" as const,
      temperatureC: 22,
      age: 10,
      academicIntensity: "medium" as const,
      dinnerWindow: [19 * 60, 21 * 60] as const,
      region: "western",
      country: "US",
    };
    const a = applyRoutineOptimizationEngine(seed, opts);
    const b = applyRoutineOptimizationEngine(seed, opts);
    assert.deepEqual(a.items, b.items);
  });
});

describe("applyDecisionEnforcedFinalPass", () => {
  it("recovers a dinner from a social/play block without moving its time", () => {
    const seed = [
      mkItem({ time: "07:00", activity: "Wake up", duration: 30, category: "morning_routine" }),
      mkItem({ time: "21:00", activity: "Lights out", duration: 30, category: "sleep" }),
      {
        ...mkItem({ time: "19:05", activity: "Calm play together", duration: 30, category: "social" }),
        dishes: ["Sausages & salad", "Grilled chicken", "Fish & chips"],
      } as RoutineScheduleItem,
    ];
    const { items, adaptations } = applyDecisionEnforcedFinalPass(seed, {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
      isSchoolDay: true,
      dinnerWindow: [18 * 60 + 30, 19 * 60 + 30],
    });
    const dinner = items.find((i) => /dinner/i.test(i.activity));
    assert.ok(dinner, "dinner was not recovered");
    assert.equal(dinner!.time, "19:05", "dinner time should be preserved");
    assert.equal(dinner!.category, "meal");
    assert.ok(adaptations.some((a) => /dinner recovered/i.test(a)));
  });

  it("does not move existing dinner time (no overlap creation)", () => {
    const seed = [
      mkItem({ time: "19:15", activity: "Dinner", duration: 30, category: "meal" }),
      mkItem({ time: "21:00", activity: "Lights out", duration: 30, category: "sleep" }),
    ];
    const { items } = applyDecisionEnforcedFinalPass(seed, {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
      isSchoolDay: true,
      dinnerWindow: [18 * 60, 19 * 60],
    });
    const dinner = items.find((i) => /dinner/i.test(i.activity))!;
    assert.equal(dinner.time, "19:15");
  });

  it("strips fridge-artifact dish names and adds mixed-diet option", () => {
    const seed = [
      {
        ...mkItem({ time: "20:00", activity: "Dinner", duration: 30, category: "meal" }),
        dishes: ["Khichdi", "milk & roti wrap", "Curd rice"],
      } as RoutineScheduleItem,
    ];
    const { items } = applyDecisionEnforcedFinalPass(seed, {
      wakeMins: 7 * 60,
      sleepMins: 22 * 60,
      isSchoolDay: false,
      diet: "mixed",
      region: "indian",
      country: "IN",
    });
    const dishes = (items[0] as { dishes?: string[] }).dishes ?? [];
    assert.ok(!dishes.some((d) => /milk & roti/i.test(d)));
    assert.ok(dishes.some((d) => /chicken|egg/i.test(d)));
  });

  it("is idempotent", () => {
    const seed = [
      mkItem({ time: "19:00", activity: "Dinner", duration: 30, category: "meal" }),
      mkItem({ time: "21:00", activity: "Lights out", duration: 30, category: "sleep" }),
    ];
    const opts = {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
      isSchoolDay: true,
      dinnerWindow: [18 * 60 + 30, 19 * 60 + 30] as const,
    };
    const a = applyDecisionEnforcedFinalPass(seed, opts);
    const b = applyDecisionEnforcedFinalPass(a.items, opts);
    assert.deepEqual(b.items, a.items);
  });
});

describe("applyRoutineOptimizationEngine", () => {
  it("runs full pass without dropping essentials", () => {
    const { items, adaptations } = applyRoutineOptimizationEngine(
      [
        { time: "07:00", activity: "Wake up & brush", duration: 20, category: "morning_routine", status: "pending" },
        {
          time: "07:20",
          activity: "Wake-up Nutrition",
          duration: 15,
          category: "meal",
          status: "pending",
          notes: "Paratha with curd",
        },
        { time: "08:15", activity: "Breakfast", duration: 25, category: "meal", status: "pending" },
        { time: "08:45", activity: "School Time", duration: 360, category: "school", status: "pending" },
        {
          time: "15:45",
          activity: "After-School Snack",
          duration: 20,
          category: "meal",
          status: "pending",
          notes: "Chole rice",
        },
        {
          time: "16:15",
          activity: "Homework & Study",
          duration: 55,
          category: "homework",
          status: "pending",
        },
        {
          time: "17:00",
          activity: "Outdoor Sport (cricket)",
          duration: 60,
          category: "outdoor",
          status: "pending",
        },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "20:15", activity: "Wind-down", duration: 20, category: "rest", status: "pending" },
        { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      {
        wakeMins: 7 * 60,
        sleepMins: 21 * 60,
        isSchoolDay: true,
        schoolEndMins: 14 * 60 + 45,
        temperatureC: 36,
        weatherOutdoor: "limited",
      },
    );
    assert.ok(adaptations.length >= 3);
    assert.ok(items.some((i) => i.category === "sleep"));
    const outdoor = items.find((i) => /outdoor sport/i.test(i.activity));
    assert.ok(!outdoor || /indoor/i.test(outdoor.activity));
    const study = items.find((i) => /homework|reading/i.test(i.activity));
    assert.ok(study && (study.duration ?? 0) <= 25);
    const dinner = items.find((i) => /dinner/i.test(i.activity))!;
    assert.ok(parseTimeToMins(dinner.time) >= 19 * 60);
  });
});
