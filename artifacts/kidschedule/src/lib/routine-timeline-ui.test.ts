import { describe, it, expect } from "vitest";
import {
  formatCategoryLabel,
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

describe("formatCategoryLabel", () => {
  it("humanizes snake_case categories", () => {
    expect(formatCategoryLabel("self_care")).toBe("Self care");
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
