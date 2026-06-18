import { describe, expect, it } from "vitest";
import {
  formatSpeechCoachDailyAllowanceLabel,
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
});
