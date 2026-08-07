import { describe, expect, it } from "vitest";
import {
  inferChildProfile,
  inferEducationStage,
  shouldAskInfantCare,
  shouldAskTodayWorld,
} from "./infer";

describe("discovery inference", () => {
  it("never asks today-world when school/home known", () => {
    expect(shouldAskTodayWorld("school")).toBe(false);
    expect(shouldAskTodayWorld("home")).toBe(false);
    expect(shouldAskTodayWorld("unsure")).toBe(true);
    expect(shouldAskTodayWorld(null)).toBe(true);
  });

  it("asks infant care only under 24 months", () => {
    expect(shouldAskInfantCare(0, 8)).toBe(true);
    expect(shouldAskInfantCare(3, 0)).toBe(false);
  });

  it("infers school stage for school days", () => {
    expect(inferEducationStage(7, 0, "school")).toBe("school");
    expect(inferEducationStage(1, 0, "home")).toMatch(/at_home|daycare/);
  });

  it("builds save-ready profile with rhythm defaults", () => {
    const child = inferChildProfile({
      name: "Aria",
      years: 6,
      todayContext: "home",
      countryCode: "US",
    });
    expect(child.name).toBe("Aria");
    expect(child.wakeUpTime).toMatch(/^\d{2}:\d{2}$/);
    expect(child.sleepTime).toMatch(/^\d{2}:\d{2}$/);
    expect(child.dobIsEstimated).toBe(true);
    expect(child.scheduleKnown).toBe(false);
  });
});
