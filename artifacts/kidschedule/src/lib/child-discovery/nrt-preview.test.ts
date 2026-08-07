import { describe, expect, it } from "vitest";
import {
  buildDiscoveryNrtPreview,
  yearsToFirstExperienceAgeBand,
} from "./nrt-preview";

describe("discovery NRT preview", () => {
  it("maps years to FE age bands", () => {
    expect(yearsToFirstExperienceAgeBand(1)).toBe("0-2");
    expect(yearsToFirstExperienceAgeBand(3)).toBe("2-4");
    expect(yearsToFirstExperienceAgeBand(6)).toBe("5-7");
    expect(yearsToFirstExperienceAgeBand(9)).toBe("8-10");
  });

  it("returns null until name and age exist", () => {
    expect(
      buildDiscoveryNrtPreview({
        childName: "",
        ageYears: 6,
        todayContext: "home",
      }),
    ).toBeNull();
    expect(
      buildDiscoveryNrtPreview({
        childName: "Aria",
        ageYears: -1,
        todayContext: "home",
      }),
    ).toBeNull();
  });

  it("adapts title with child name and focus", () => {
    const nrt = buildDiscoveryNrtPreview({
      childName: "Aria",
      ageYears: 6,
      todayContext: "home",
      focusGoal: "improve_focus",
      now: new Date("2026-08-07T10:00:00"),
    });
    expect(nrt).not.toBeNull();
    expect(nrt!.title).toMatch(/Aria/);
    expect(nrt!.basedOn.some((b) => /focus/i.test(b))).toBe(true);
  });
});
