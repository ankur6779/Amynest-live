import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_P1,
  DEFAULT_P2,
  buildParentAvailPayload,
  defaultAvailability,
  displayToInput,
  inputToDisplay,
  isEssentialTask,
  isParentAvailComplete,
  minsToDisplay,
  parentStatusLabel,
  parseDisplayTime,
  shiftRoutineItems,
  type ParentAvailData,
  AVAIL_KEY,
  WAKE_KEY,
  REGION_OPTIONS,
} from "./availability";
import {
  buildCombinedTimeline,
  extractTiffinSummary,
  parseTimeToMinutes,
  type FRTimelineFamilyResult,
} from "./familyTimeline";

describe("AVAIL_KEY / WAKE_KEY", () => {
  it("matches the web key shape so AsyncStorage cross-loads", () => {
    assert.equal(AVAIL_KEY("2026-05-02"), "amynest_parent_avail_2026-05-02");
    assert.equal(WAKE_KEY(7, "2026-05-02"), "amynest_wake_7_2026-05-02");
  });
});

describe("parseDisplayTime / minsToDisplay", () => {
  it("round-trips standard times", () => {
    assert.equal(parseDisplayTime("7:00 AM"), 7 * 60);
    assert.equal(parseDisplayTime("12:00 PM"), 12 * 60);
    assert.equal(parseDisplayTime("12:30 AM"), 30);
    assert.equal(minsToDisplay(7 * 60), "7:00 AM");
    assert.equal(minsToDisplay(12 * 60), "12:00 PM");
    assert.equal(minsToDisplay(0), "12:00 AM");
  });
  it("parses 24-hour times", () => {
    assert.equal(parseDisplayTime("07:00"), 7 * 60);
    assert.equal(parseDisplayTime("21:30"), 21 * 60 + 30);
  });
  it("returns -1 for garbage", () => {
    assert.equal(parseDisplayTime(""), -1);
    assert.equal(parseDisplayTime("foo"), -1);
  });
});

describe("displayToInput / inputToDisplay", () => {
  it("converts both ways", () => {
    assert.equal(displayToInput("7:00 AM"), "07:00");
    assert.equal(displayToInput("12:00 PM"), "12:00");
    assert.equal(displayToInput("12:30 AM"), "00:30");
    assert.equal(inputToDisplay("07:00"), "7:00 AM");
    assert.equal(inputToDisplay("13:45"), "1:45 PM");
    assert.equal(inputToDisplay("00:15"), "12:15 AM");
  });
});

describe("buildParentAvailPayload", () => {
  it("returns only p1 fields when no second parent", () => {
    const data: ParentAvailData = {
      p1: { role: "Mother", workType: "homemaker", isWorking: null, workHours: "" },
      p2: null,
      hasSecondParent: false,
    };
    const out = buildParentAvailPayload(data);
    assert.equal(out.parent1Role, "Mother");
    assert.equal(out.parent1WorkType, "homemaker");
    assert.equal(out.parent1IsWorking, undefined);
    assert.equal(out.parent1WorkHours, undefined);
    assert.equal(out.parent2Role, undefined);
    assert.equal(out.parent2WorkType, undefined);
  });
  it("includes p2 only when hasSecondParent + working", () => {
    const data: ParentAvailData = {
      p1: { role: "Mother", workType: "work_from_home", isWorking: true, workHours: "9-5" },
      p2: { role: "Father", workType: "work_from_office", isWorking: true, workHours: "10-6" },
      hasSecondParent: true,
    };
    const out = buildParentAvailPayload(data);
    assert.equal(out.parent1IsWorking, true);
    assert.equal(out.parent1WorkHours, "9-5");
    assert.equal(out.parent2Role, "Father");
    assert.equal(out.parent2IsWorking, true);
    assert.equal(out.parent2WorkHours, "10-6");
  });
  it("drops p2 when hasSecondParent is false", () => {
    const data: ParentAvailData = {
      p1: { role: "Mother", workType: "homemaker", isWorking: null, workHours: "" },
      p2: { role: "Father", workType: "work_from_office", isWorking: true, workHours: "9-5" },
      hasSecondParent: false,
    };
    const out = buildParentAvailPayload(data);
    assert.equal(out.parent2Role, undefined);
    assert.equal(out.parent2WorkType, undefined);
    assert.equal(out.parent2IsWorking, undefined);
  });
  it("omits workHours when isWorking=false (holiday)", () => {
    const data: ParentAvailData = {
      p1: { role: "Mother", workType: "work_from_office", isWorking: false, workHours: "9-5" },
      p2: null,
      hasSecondParent: false,
    };
    const out = buildParentAvailPayload(data);
    assert.equal(out.parent1IsWorking, false);
    assert.equal(out.parent1WorkHours, undefined);
  });
});

describe("isParentAvailComplete / parentStatusLabel / defaults", () => {
  it("homemaker is complete with no extra answers", () => {
    assert.equal(
      isParentAvailComplete({ ...DEFAULT_P1, workType: "homemaker" }),
      true,
    );
    assert.match(
      parentStatusLabel({ ...DEFAULT_P1, workType: "homemaker" }),
      /Free all day/,
    );
  });
  it("workers need isWorking answered", () => {
    assert.equal(isParentAvailComplete({ ...DEFAULT_P1, workType: "work_from_home" }), false);
    assert.equal(
      isParentAvailComplete({
        ...DEFAULT_P1,
        workType: "work_from_home",
        isWorking: true,
        workHours: "9-5",
      }),
      true,
    );
  });
  it("default availability is single-parent unanswered", () => {
    const d = defaultAvailability();
    assert.deepEqual(d.p1, DEFAULT_P1);
    assert.equal(d.p2, null);
    assert.equal(d.hasSecondParent, false);
  });
  it("DEFAULT_P2 is Father", () => {
    assert.equal(DEFAULT_P2.role, "Father");
  });
});

describe("shiftRoutineItems", () => {
  const items = [
    { time: "7:00 AM", activity: "Wake", category: "morning" },
    { time: "8:00 AM", activity: "Breakfast", category: "meal" },
    { time: "9:00 PM", activity: "Bedtime", category: "sleep" },
  ];
  it("shifts non-sleep items by the wake delta", () => {
    const out = shiftRoutineItems(items, "7:00 AM", "8:00 AM");
    assert.equal(out[0].time, "8:00 AM");
    assert.equal(out[1].time, "9:00 AM");
    assert.equal(out[2].time, "9:00 PM"); // sleep stays anchored
  });
  it("returns input untouched when delta is 0", () => {
    const out = shiftRoutineItems(items, "7:00 AM", "7:00 AM");
    assert.equal(out, items);
  });
});

describe("isEssentialTask", () => {
  it("flags brushing, meals, hygiene", () => {
    assert.equal(isEssentialTask("Brush teeth", "hygiene"), true);
    assert.equal(isEssentialTask("Breakfast", "meal"), true);
    assert.equal(isEssentialTask("Pack tiffin", "tiffin"), true);
  });
  it("does not flag play/screen", () => {
    assert.equal(isEssentialTask("Lego play", "play"), false);
  });
});

describe("REGION_OPTIONS", () => {
  it("contains the regions the AI prompt knows about", () => {
    const values = REGION_OPTIONS.map((r) => r.value);
    assert.ok(values.includes("north_indian"));
    assert.ok(values.includes("south_indian"));
    assert.ok(values.includes("pan_indian"));
    assert.ok(values.includes("global"));
  });
});

// ─── Family timeline helpers ─────────────────────────────────────────────
const fam: FRTimelineFamilyResult[] = [
  {
    child: { id: 1, name: "Aisha", foodType: "veg" },
    routine: {
      title: "Aisha's day",
      items: [
        { time: "7:00 AM", activity: "Wake", duration: 15, category: "morning" },
        { time: "7:30 AM", activity: "Tiffin pack", duration: 10, category: "tiffin", notes: "Options: Idli | Upma | Paratha" },
        { time: "9:00 AM", activity: "School", duration: 360, category: "school" },
      ],
    },
  },
  {
    child: { id: 2, name: "Rohan", foodType: "non_veg" },
    routine: {
      title: "Rohan's day",
      items: [
        { time: "8:00 AM", activity: "Wake", duration: 15, category: "morning" },
        { time: "10:00 AM", activity: "Tiffin pack", duration: 10, category: "tiffin", notes: "Options: Sandwich | Roll" },
      ],
    },
  },
];

describe("extractTiffinSummary", () => {
  it("parses pipe-separated options", () => {
    const t = extractTiffinSummary(fam);
    assert.equal(t.length, 2);
    assert.equal(t[0].child.name, "Aisha");
    assert.deepEqual(t[0].options, ["Idli", "Upma", "Paratha"]);
    assert.equal(t[1].time, "10:00 AM");
  });
  it("skips children without a tiffin row", () => {
    const noTiffin: FRTimelineFamilyResult[] = [
      {
        child: { id: 3, name: "Mira" },
        routine: { title: "Mira", items: [{ time: "7:00 AM", activity: "Wake", duration: 15, category: "morning" }] },
      },
    ];
    assert.equal(extractTiffinSummary(noTiffin).length, 0);
  });
});

describe("buildCombinedTimeline", () => {
  it("merges and sorts by time, carrying child name + colorIdx", () => {
    const rows = buildCombinedTimeline(fam);
    assert.equal(rows[0].time, "7:00 AM");
    assert.equal(rows[0].childName, "Aisha");
    assert.equal(rows[0].colorIdx, 0);
    const last = rows[rows.length - 1];
    // Latest item should be Aisha's school start (9 AM) — Rohan's tiffin is 10 AM.
    assert.equal(last.time, "10:00 AM");
    assert.equal(last.childName, "Rohan");
    assert.equal(last.colorIdx, 1);
  });
});

describe("editable preview helpers", () => {
  const items = [
    { time: "7:00 AM", activity: "Wake", duration: 15, category: "morning" },
    { time: "7:30 AM", activity: "Tiffin pack", duration: 10, category: "tiffin", notes: "Options: Idli | Upma" },
    { time: "9:00 AM", activity: "School", duration: 360, category: "school" },
  ];

  it("applyTiffinSelection swaps tiffin row activity and leaves others", async () => {
    const { applyTiffinSelection } = await import("./familyTimeline.js");
    const out = applyTiffinSelection(items, "Upma");
    assert.equal(out[1].activity, "Upma");
    assert.equal(out[1].notes, "Options: Idli | Upma");
    assert.equal(out[0].activity, "Wake");
  });

  it("shiftItemTime moves a row by delta minutes", async () => {
    const { shiftItemTime } = await import("./familyTimeline.js");
    const later = shiftItemTime(items, 0, 15);
    assert.equal(later[0].time, "7:15 AM");
    const earlier = shiftItemTime(items, 2, -30);
    assert.equal(earlier[2].time, "8:30 AM");
  });

  it("shiftItemTime returns input unchanged for bad index", async () => {
    const { shiftItemTime } = await import("./familyTimeline.js");
    assert.strictEqual(shiftItemTime(items, 99, 15), items);
  });

  it("removeItemAt drops the row at the given index", async () => {
    const { removeItemAt } = await import("./familyTimeline.js");
    const out = removeItemAt(items, 1);
    assert.equal(out.length, 2);
    assert.equal(out[1].activity, "School");
  });

  it("buildCombinedTimeline now exposes itemIdx for editable previews", async () => {
    const { buildCombinedTimeline } = await import("./familyTimeline.js");
    const rows = buildCombinedTimeline(fam);
    // Aisha has 3 items; the school row is index 2 in her items array.
    const school = rows.find((r) => r.activity === "School");
    assert.ok(school);
    assert.equal(school!.itemIdx, 2);
  });
});

describe("parseTimeToMinutes", () => {
  it("matches parseDisplayTime semantics", () => {
    assert.equal(parseTimeToMinutes("7:00 AM"), 7 * 60);
    assert.equal(parseTimeToMinutes(""), -1);
  });
});
