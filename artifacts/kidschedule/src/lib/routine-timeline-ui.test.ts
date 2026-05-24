import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatCategoryLabel,
  parseRoutineTimeToMinutes,
  resolveTimelinePhase,
} from "./routine-timeline-ui.ts";

describe("parseRoutineTimeToMinutes", () => {
  it("parses 24h times", () => {
    assert.equal(parseRoutineTimeToMinutes("19:50"), 19 * 60 + 50);
    assert.equal(parseRoutineTimeToMinutes("21:00"), 21 * 60);
  });

  it("parses 12h times", () => {
    assert.equal(parseRoutineTimeToMinutes("7:30 PM"), 19 * 60 + 30);
  });
});

describe("formatCategoryLabel", () => {
  it("humanizes snake_case categories", () => {
    assert.equal(formatCategoryLabel("self_care"), "Self care");
  });
});

describe("resolveTimelinePhase", () => {
  it("marks upcoming tasks after now", () => {
    assert.equal(
      resolveTimelinePhase({
        dateMode: "today",
        status: "pending",
        taskStart: 20 * 60,
        taskEnd: 20 * 60 + 30,
        nowMins: 19 * 60 + 30,
        isCurrentIndex: false,
      }),
      "upcoming",
    );
  });
});
