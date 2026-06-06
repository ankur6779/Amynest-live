import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateVaccineCandidates,
  INFANT_DAILY_REMINDER_MINUTE,
  INFANT_VACCINE_MORNING_HOUR,
} from "./infantNotificationCandidates.js";

describe("infant notification daily generation guard", () => {
  it("does not regenerate vaccine notifications every cron minute", () => {
    for (let minute = 0; minute < 60; minute++) {
      const vaccines = evaluateVaccineCandidates({
        childId: 1,
        childName: "Child 1",
        ageYears: 0,
        ageMonthsPart: 6,
        logMap: {},
        localDate: "2026-06-06",
        localHour: INFANT_VACCINE_MORNING_HOUR,
        localMinute: minute,
      });
      if (minute === INFANT_DAILY_REMINDER_MINUTE) {
        assert.ok(vaccines.length > 0, "should generate once at 09:00");
      } else {
        assert.equal(vaccines.length, 0, `should not generate at minute ${minute}`);
      }
    }
  });
});
