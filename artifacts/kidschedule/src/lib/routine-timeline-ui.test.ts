import { describe, it, expect } from "vitest";
import {
  cleanRoutineNotes,
  formatCategoryLabel,
  formatRoutineDurationLong,
  formatRoutineDurationShort,
  formatRoutineTime,
  parseRoutineTimeToMinutes,
  resolveTimelinePhase,
} from "./routine-timeline-ui.ts";

describe("parseRoutineTimeToMinutes", () => {
  it("parses 24h times", () => {
    expect(parseRoutineTimeToMinutes("19:50")).toBe(19 * 60 + 50);
    expect(parseRoutineTimeToMinutes("21:00")).toBe(21 * 60);
  });

  it("parses 12h times", () => {
    expect(parseRoutineTimeToMinutes("7:30 PM")).toBe(19 * 60 + 30);
  });
});

describe("formatRoutineTime — single canonical display format", () => {
  it("converts 24h times to 12h AM/PM", () => {
    expect(formatRoutineTime("16:25")).toBe("4:25 PM");
    expect(formatRoutineTime("09:00")).toBe("9:00 AM");
    expect(formatRoutineTime("21:30")).toBe("9:30 PM");
  });

  it("normalizes midnight and noon correctly", () => {
    expect(formatRoutineTime("00:00")).toBe("12:00 AM");
    expect(formatRoutineTime("12:00")).toBe("12:00 PM");
  });

  it("passes 12h times through in the canonical shape", () => {
    expect(formatRoutineTime("4:25 PM")).toBe("4:25 PM");
    expect(formatRoutineTime("7:05 am")).toBe("7:05 AM");
  });

  it("never mixes formats: 24h and 12h inputs produce identical output", () => {
    expect(formatRoutineTime("16:25")).toBe(formatRoutineTime("4:25 PM"));
  });

  it("returns trimmed input unchanged when unparseable, and '' for empty", () => {
    expect(formatRoutineTime("naptime")).toBe("naptime");
    expect(formatRoutineTime("")).toBe("");
    expect(formatRoutineTime(null)).toBe("");
    expect(formatRoutineTime(undefined)).toBe("");
  });
});

describe("formatRoutineDuration — never shows 0 min", () => {
  it("hides zero/negative/missing durations (e.g. sleep anchors)", () => {
    expect(formatRoutineDurationShort({ duration: 0 })).toBe("");
    expect(formatRoutineDurationLong({ duration: 0 })).toBe("");
    expect(formatRoutineDurationShort({})).toBe("");
    expect(formatRoutineDurationLong({ duration: null })).toBe("");
    expect(formatRoutineDurationShort({ duration: -5 })).toBe("");
  });

  it("formats real durations", () => {
    expect(formatRoutineDurationShort({ duration: 30 })).toBe("30m");
    expect(formatRoutineDurationLong({ duration: 30 })).toBe("30 min");
  });
});

describe("cleanRoutineNotes — share/export hygiene", () => {
  it("strips internal engineering prefixes", () => {
    expect(cleanRoutineNotes("hydration: drink water")).toBe("drink water");
    expect(cleanRoutineNotes("trust-feeding: needs a feed")).toBe("needs a feed");
    expect(cleanRoutineNotes("aqi: stay indoors")).toBe("stay indoors");
    expect(cleanRoutineNotes("display: rename")).toBe("rename");
  });

  it("renders meal Options pipe-lists as a readable comma list", () => {
    expect(cleanRoutineNotes("Options: rice | dal | curd")).toBe(
      "Options: rice, dal, curd",
    );
  });

  it("keeps normal parent-facing notes intact", () => {
    expect(cleanRoutineNotes("Read a bedtime story together")).toBe(
      "Read a bedtime story together",
    );
  });

  it("returns '' for empty/whitespace notes", () => {
    expect(cleanRoutineNotes("")).toBe("");
    expect(cleanRoutineNotes("   ")).toBe("");
    expect(cleanRoutineNotes(null)).toBe("");
    expect(cleanRoutineNotes(undefined)).toBe("");
  });
});

describe("formatCategoryLabel — no raw slugs", () => {
  it("humanizes snake_case categories", () => {
    expect(formatCategoryLabel("self_care")).toBe("Self care");
    expect(formatCategoryLabel("outdoor_play")).toBe("Outdoor play");
    expect(formatCategoryLabel("wind_down")).toBe("Wind-down");
  });

  it("maps known categories to friendly labels", () => {
    expect(formatCategoryLabel("meal")).toBe("Meal");
    expect(formatCategoryLabel("sleep")).toBe("Sleep");
  });

  it("never returns a string with an underscore", () => {
    for (const slug of ["self_care", "outdoor_play", "wind_down", "free_play", "quiet_time"]) {
      expect(formatCategoryLabel(slug)).not.toMatch(/_/);
    }
  });
});

describe("resolveTimelinePhase", () => {
  it("marks upcoming tasks after now", () => {
    expect(
      resolveTimelinePhase({
        dateMode: "today",
        status: "pending",
        taskStart: 20 * 60,
        taskEnd: 20 * 60 + 30,
        nowMins: 19 * 60 + 30,
        isCurrentIndex: false,
      }),
    ).toBe("upcoming");
  });
});
