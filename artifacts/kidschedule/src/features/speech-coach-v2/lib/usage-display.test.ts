import { describe, expect, it } from "vitest";
import {
  formatSpeechCoachDailyAllowanceLabel,
  formatSpeechCoachFirstUseAllowanceLabel,
  formatSpeechCoachRemainingLabel,
} from "./usage-display";

describe("usage-display", () => {
  it("formats trial remaining time", () => {
    expect(formatSpeechCoachRemainingLabel(120)).toBe("2 min left today");
    expect(formatSpeechCoachRemainingLabel(74)).toBe("2 min left today");
  });

  it("formats paid remaining time", () => {
    expect(formatSpeechCoachRemainingLabel(600)).toBe("10 min left today");
    expect(formatSpeechCoachRemainingLabel(540)).toBe("9 min left today");
  });

  it("formats hub allowance labels", () => {
    expect(formatSpeechCoachDailyAllowanceLabel(120, true)).toBe("2 min/day during free trial");
    expect(formatSpeechCoachDailyAllowanceLabel(600, false)).toBe("10 min/day included");
  });

  it("formats first-use labels without daily quota language", () => {
    expect(
      formatSpeechCoachFirstUseAllowanceLabel({
        speechSecondsUsed: 0,
        remainingSeconds: 90,
        limitReached: false,
      }),
    ).toBe("Try Amy's speaking practice free.");
    expect(
      formatSpeechCoachFirstUseAllowanceLabel({
        speechSecondsUsed: 30,
        remainingSeconds: 60,
        limitReached: false,
      }),
    ).toBe("You have a one-time free speaking practice.");
    expect(
      formatSpeechCoachFirstUseAllowanceLabel({
        speechSecondsUsed: 90,
        remainingSeconds: 0,
        limitReached: true,
      }),
    ).toBe("You already tried Amy's speaking practice.");
    expect(formatSpeechCoachRemainingLabel(90, true)).toBe("2 min of free practice left");
    expect(formatSpeechCoachRemainingLabel(90, true).toLowerCase()).not.toContain("today");
    expect(formatSpeechCoachRemainingLabel(90, true).toLowerCase()).not.toContain("tomorrow");
  });
});
